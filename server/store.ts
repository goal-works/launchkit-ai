import { Pool } from "pg";

import { createSeedState } from "./domain/seed";
import type { LaunchKitState } from "./domain/types";

export interface StateStore {
  read(): Promise<LaunchKitState>;
  transact<T>(operation: (state: LaunchKitState) => T | Promise<T>): Promise<T>;
}

export class MemoryStore implements StateStore {
  private state: LaunchKitState;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(initialState: LaunchKitState = createSeedState()) {
    this.state = structuredClone(initialState);
  }

  async read(): Promise<LaunchKitState> {
    await this.queue;
    return structuredClone(this.state);
  }

  transact<T>(operation: (state: LaunchKitState) => T | Promise<T>): Promise<T> {
    const run = async () => {
      const draft = structuredClone(this.state);
      const result = await operation(draft);
      this.state = draft;
      return result;
    };
    const result = this.queue.then(run, run);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}

export class PostgresStore implements StateStore {
  private readonly pool: Pool;
  private ready: Promise<void> | undefined;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  private ensureReady(): Promise<void> {
    this.ready ??= (async () => {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS launchkit_state (
          singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
          document JSONB NOT NULL,
          revision BIGINT NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await this.pool.query(
        `INSERT INTO launchkit_state (singleton, document)
         VALUES (TRUE, $1::jsonb)
         ON CONFLICT (singleton) DO NOTHING`,
        [JSON.stringify(createSeedState())],
      );
    })();
    return this.ready;
  }

  async read(): Promise<LaunchKitState> {
    await this.ensureReady();
    const result = await this.pool.query<{ document: LaunchKitState }>(
      "SELECT document FROM launchkit_state WHERE singleton = TRUE",
    );
    return structuredClone(result.rows[0]!.document);
  }

  async transact<T>(operation: (state: LaunchKitState) => T | Promise<T>): Promise<T> {
    await this.ensureReady();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<{ document: LaunchKitState }>(
        "SELECT document FROM launchkit_state WHERE singleton = TRUE FOR UPDATE",
      );
      const state = structuredClone(selected.rows[0]!.document);
      const result = await operation(state);
      await client.query(
        `UPDATE launchkit_state
         SET document = $1::jsonb, revision = revision + 1, updated_at = NOW()
         WHERE singleton = TRUE`,
        [JSON.stringify(state)],
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

declare global {
  var launchKitStore: StateStore | undefined;
}

export function getStore(): StateStore {
  if (!globalThis.launchKitStore) {
    const mode = process.env.LAUNCHKIT_DATA_MODE ?? "memory";
    const databaseUrl = process.env.DATABASE_URL;
    if (mode === "postgres" && !databaseUrl) {
      throw new Error("DATABASE_URL is required when LAUNCHKIT_DATA_MODE=postgres");
    }
    globalThis.launchKitStore = mode === "postgres" ? new PostgresStore(databaseUrl!) : new MemoryStore();
  }
  return globalThis.launchKitStore;
}
