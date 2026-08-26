import { ApiKeyForm, RevokeKeyButton } from "@/components/actions";
import { PageHeader, Panel } from "@/components/shell";
import { requireSnapshot } from "@/server/runtime";

export const metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  const data = await requireSnapshot();
  const canCreate = data.actor.permissions.includes("api_keys:create");
  const canRevoke = data.actor.permissions.includes("api_keys:revoke");

  return <main className="page">
    <PageHeader eyebrow="Write-only secret reveal" title="API keys" description="Plaintext values are returned once at creation. Only a SHA-256 digest and a short identification prefix remain in durable state." />
    <div className="notice"><strong>Security contract</strong><span>Seeded prefixes are non-secret demo identifiers.</span><span>Never paste a real key here</span></div>
    <Panel title="Organization keys" meta={`${data.apiKeys.filter((item) => !item.revokedAt).length} active`}>
      <div className="table-wrap" role="region" tabIndex={0} aria-label="Organization API keys">
        <table>
          <thead><tr><th>Name</th><th>Prefix</th><th>Created</th><th>Status</th><th /></tr></thead>
          <tbody>{data.apiKeys.map((key) => <tr key={key.id}><td><strong>{key.name}</strong></td><td><code>{key.prefix}…</code></td><td>{key.createdAt.slice(0, 10)}</td><td><span className={`status ${key.revokedAt ? "neutral" : "success"}`}>{key.revokedAt ? "revoked" : "active"}</span></td><td>{canRevoke && <RevokeKeyButton disabled={Boolean(key.revokedAt)} id={key.id} />}</td></tr>)}</tbody>
        </table>
      </div>
    </Panel>
    <Panel title="Issue key" meta={canCreate ? "One-time reveal" : "Permission required"}>
      {canCreate ? <ApiKeyForm /> : <p className="empty">Your role cannot create API keys.</p>}
    </Panel>
  </main>;
}
