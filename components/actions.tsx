"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function mutate(path: string, method: string, payload?: Record<string, unknown>) {
  const response = await fetch(path, payload
    ? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    : { method });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(data.error ?? `Request failed (${response.status})`));
  return data;
}

export function OrganizationSwitcher({ organizations, activeId }: Readonly<{ organizations: { id: string; name: string }[]; activeId: string }>) {
  const router = useRouter();
  return <label className="org-switch"><span>Organization</span><select aria-label="Active organization" defaultValue={activeId} onChange={async (event) => { await mutate("/api/session/organization", "PUT", { organizationId: event.target.value }); router.push("/dashboard"); router.refresh(); }}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>;
}

export function LogoutButton() {
  const router = useRouter();
  return <button className="text-button" onClick={async () => { await mutate("/api/session", "DELETE"); router.push("/login"); router.refresh(); }} type="button">Sign out</button>;
}

function useMutation() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const run = async (operation: () => Promise<void>) => {
    setMessage("");
    try { await operation(); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Request failed"); }
  };
  return { message, run, setMessage };
}

export function CreateOrganizationForm() {
  const { message, run } = useMutation();
  return <form className="inline-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; void run(async () => { await mutate("/api/organizations", "POST", { name: new FormData(form).get("name") }); form.reset(); }); }}><label><span>New organization</span><input name="name" placeholder="Synthetic organization" required /></label><button className="button" type="submit">Create organization</button>{message && <p role="status">{message}</p>}</form>;
}

export function InviteForm() {
  const { message, run, setMessage } = useMutation();
  return <form className="form-grid" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await mutate("/api/invitations", "POST", { email: data.get("email"), role: data.get("role") }); form.reset(); setMessage("Invitation recorded in demo mode."); }); }}><label><span>Email</span><input name="email" type="email" placeholder="new.member@launchkit.demo" required /></label><label><span>Role</span><select name="role" defaultValue="member"><option value="admin">Admin</option><option value="developer">Developer</option><option value="member">Member</option><option value="viewer">Viewer</option></select></label><button className="button" type="submit">Invite member</button>{message && <p role="status">{message}</p>}</form>;
}

export function WorkspaceForm() {
  const { message, run, setMessage } = useMutation();
  return <form className="form-grid" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await mutate("/api/workspaces", "POST", { name: data.get("name"), environment: data.get("environment") }); form.reset(); setMessage("Workspace created."); }); }}><label><span>Name</span><input name="name" placeholder="Research workspace" required /></label><label><span>Environment</span><select name="environment"><option value="development">Development</option><option value="production">Production</option></select></label><button className="button" type="submit">Create workspace</button>{message && <p role="status">{message}</p>}</form>;
}

export function DeleteWorkspaceButton({ id }: Readonly<{ id: string }>) {
  const { message, run } = useMutation();
  return <><button className="text-button danger" onClick={() => void run(async () => { await mutate(`/api/workspaces/${id}`, "DELETE"); })} type="button">Delete</button>{message && <span role="status">{message}</span>}</>;
}

export function ApiKeyForm() {
  const { message, run, setMessage } = useMutation();
  const [secret, setSecret] = useState("");
  return <form className="inline-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; void run(async () => { const response = await mutate("/api/api-keys", "POST", { name: new FormData(form).get("name") }); const key = response.key as { secret: string }; setSecret(key.secret); setMessage("Copy this key now. It will not be shown again."); form.reset(); }); }}><label><span>Key name</span><input name="name" placeholder="Staging inference" required /></label><button className="button" type="submit">Create API key</button>{message && <div className="secret-reveal" role="status"><p>{message}</p>{secret && <code>{secret}</code>}</div>}</form>;
}

export function RevokeKeyButton({ id, disabled }: Readonly<{ id: string; disabled: boolean }>) {
  const { run } = useMutation();
  return <button className="text-button danger" disabled={disabled} onClick={() => void run(async () => { await mutate(`/api/api-keys/${id}`, "DELETE"); })} type="button">{disabled ? "Revoked" : "Revoke"}</button>;
}

export function BudgetForm({ cents }: Readonly<{ cents: number }>) {
  const { message, run, setMessage } = useMutation();
  return <form className="inline-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const dollars = Number(new FormData(form).get("budget")); void run(async () => { await mutate("/api/billing/budget", "PUT", { budgetWarningCents: Math.round(dollars * 100) }); setMessage("Budget warning updated."); }); }}><label><span>Monthly warning threshold</span><input defaultValue={(cents / 100).toFixed(0)} min="10" name="budget" type="number" /></label><button className="button" type="submit">Update threshold</button>{message && <p role="status">{message}</p>}</form>;
}

export function WebhookForm() {
  const { message, run, setMessage } = useMutation();
  const [secret, setSecret] = useState("");
  return <form className="form-grid" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; void run(async () => { const response = await mutate("/api/webhooks", "POST", { url: new FormData(form).get("url"), events: ["usage.threshold", "api_key.revoked"] }); const webhook = response.webhook as { signingSecret: string }; setSecret(webhook.signingSecret); setMessage("Endpoint registered. Copy the signing secret now."); form.reset(); }); }}><label><span>HTTPS endpoint</span><input name="url" placeholder="https://example.invalid/hooks" type="url" required /></label><button className="button" type="submit">Register endpoint</button>{message && <div className="secret-reveal" role="status"><p>{message}</p>{secret && <code>{secret}</code>}</div>}</form>;
}

export function TestWebhookButton({ id }: Readonly<{ id: string }>) {
  const { message, run, setMessage } = useMutation();
  return <><button className="text-button" onClick={() => void run(async () => { await mutate(`/api/webhooks/${id}/test`, "POST", {}); setMessage("Synthetic signed delivery completed."); })} type="button">Send test</button>{message && <span className="action-message" role="status">{message}</span>}</>;
}
