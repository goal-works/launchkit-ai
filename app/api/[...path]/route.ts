import { type NextRequest, NextResponse } from "next/server";

import { DomainError } from "@/server/domain/errors";
import type { Actor, Role } from "@/server/domain/types";
import { decodeSession, encodeSession } from "@/server/security";
import { enqueueWebhookTest } from "@/server/jobs";
import { service, sessionCookieName } from "@/server/runtime";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 };

function segments(request: NextRequest) {
  return request.nextUrl.pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
}

function actor(request: NextRequest): Actor {
  const value = decodeSession(request.cookies.get(sessionCookieName)?.value);
  if (!value) throw new DomainError(401, "Authentication required");
  return value;
}

async function body(request: NextRequest): Promise<Record<string, unknown>> {
  try { return await request.json() as Record<string, unknown>; } catch { throw new DomainError(400, "Valid JSON body required"); }
}

function result(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status });
}

function errorResponse(error: unknown) {
  if (error instanceof DomainError) return result({ error: error.message }, error.status);
  console.error(error);
  return result({ error: "Unexpected server error" }, 500);
}

export async function GET(request: NextRequest) {
  try {
    const path = segments(request);
    if (path[0] === "health") return result({ status: "ok", dataMode: process.env.LAUNCHKIT_DATA_MODE ?? "memory" });
    if (path[0] === "demo-users") return result({ users: await service.users() });
    if (path[0] === "snapshot") return result(await service.snapshot(actor(request)));
    return result({ error: "Not found" }, 404);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const path = segments(request);
    const payload = await body(request);
    if (path[0] === "session") {
      const userId = String(payload.userId ?? "");
      const organizations = await service.organizationsForUser(userId);
      const organizationId = String(payload.organizationId ?? organizations[0]?.id ?? "");
      await service.validateActor({ userId, organizationId });
      const response = result({ authenticated: true, organizationId });
      response.cookies.set(sessionCookieName, encodeSession({ userId, organizationId }), cookieOptions);
      return response;
    }
    const current = actor(request);
    if (path[0] === "organizations") {
      const organization = await service.createOrganization(current.userId, String(payload.name ?? ""));
      const response = result({ organization }, 201);
      response.cookies.set(sessionCookieName, encodeSession({ userId: current.userId, organizationId: organization.id }), cookieOptions);
      return response;
    }
    if (path[0] === "invitations") return result({ invitation: await service.invite(current, String(payload.email ?? ""), String(payload.role ?? "member") as Exclude<Role, "owner">) }, 201);
    if (path[0] === "workspaces") return result({ workspace: await service.createWorkspace(current, String(payload.name ?? ""), payload.environment === "production" ? "production" : "development") }, 201);
    if (path[0] === "api-keys") return result({ key: await service.createApiKey(current, String(payload.name ?? "")) }, 201);
    if (path[0] === "usage") return result({ usage: await service.recordUsage(current, {
      provider: payload.provider === "anthropic" || payload.provider === "local" ? payload.provider : "openai",
      model: String(payload.model ?? ""), inputTokens: Number(payload.inputTokens), outputTokens: Number(payload.outputTokens),
      estimatedCostCents: Number(payload.estimatedCostCents), latencyMs: Number(payload.latencyMs),
    }) }, 201);
    if (path[0] === "webhooks" && path[2] === "test") return result({ delivery: await enqueueWebhookTest({ actor: current, endpointId: path[1] ?? "" }) }, 201);
    if (path[0] === "webhooks") return result({ webhook: await service.createWebhook(current, String(payload.url ?? ""), Array.isArray(payload.events) ? payload.events.map(String) : []) }, 201);
    return result({ error: "Not found" }, 404);
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: NextRequest) {
  try {
    const path = segments(request);
    const payload = await body(request);
    const current = actor(request);
    if (path[0] === "session" && path[1] === "organization") {
      const organizationId = String(payload.organizationId ?? "");
      await service.validateActor({ userId: current.userId, organizationId });
      const response = result({ organizationId });
      response.cookies.set(sessionCookieName, encodeSession({ userId: current.userId, organizationId }), cookieOptions);
      return response;
    }
    if (path[0] === "billing" && path[1] === "budget") return result({ organization: await service.updateBudget(current, Number(payload.budgetWarningCents)) });
    return result({ error: "Not found" }, 404);
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const path = segments(request);
    if (path[0] === "session") {
      const response = result({ authenticated: false });
      response.cookies.delete(sessionCookieName);
      return response;
    }
    const current = actor(request);
    if (path[0] === "workspaces") { await service.deleteWorkspace(current, path[1] ?? ""); return result({ deleted: true }); }
    if (path[0] === "api-keys") { await service.revokeApiKey(current, path[1] ?? ""); return result({ revoked: true }); }
    return result({ error: "Not found" }, 404);
  } catch (error) { return errorResponse(error); }
}
