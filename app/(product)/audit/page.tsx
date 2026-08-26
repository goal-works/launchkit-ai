import { PageHeader, Panel } from "@/components/shell";
import { requireSnapshot } from "@/server/runtime";

export const metadata = { title: "Audit log" };
export default async function AuditPage() {
  const data = await requireSnapshot();
  const names = new Map(data.members.map((member) => [member.userId, member.user.name]));
  const canRead = data.actor.permissions.includes("audit:read");
  return <main className="page"><PageHeader eyebrow="Administrative evidence" title="Audit log" description="Security-sensitive mutations produce organization-scoped evidence with actor, action, target, metadata, and timestamp." />{canRead ? <Panel title="Organization events" meta={`${data.auditEvents.length} durable records`}><ul className="audit-list">{data.auditEvents.map((event) => <li key={event.id}><time>{event.createdAt.slice(0, 16).replace("T", " ")}</time><div><strong>{event.action}</strong><p>{names.get(event.actorUserId) ?? "System actor"} · {event.targetType} · <code>{event.targetId.slice(0, 16)}</code></p></div><pre>{JSON.stringify(event.metadata)}</pre></li>)}</ul></Panel> : <div className="permission-denied"><p className="eyebrow">Permission denied</p><h2>Audit evidence is restricted.</h2><p>Your role does not have <code>audit:read</code>. The server returned only the permission-aware page shell.</p></div>}</main>;
}
