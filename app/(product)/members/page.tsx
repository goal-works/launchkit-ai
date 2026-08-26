import { InviteForm } from "@/components/actions";
import { PageHeader, Panel } from "@/components/shell";
import { requireSnapshot } from "@/server/runtime";

export const metadata = { title: "Members and roles" };

export default async function MembersPage() {
  const data = await requireSnapshot();
  const canInvite = data.actor.permissions.includes("members:invite");

  return <main className="page">
    <PageHeader eyebrow="Membership boundary" title="People and permissions" description="Every action resolves membership, role, permission, organization, and resource ownership on the server." />
    <div className="two-column">
      <Panel title="Active members" meta={`${data.members.length} synthetic identities`}>
        <div className="table-wrap" role="region" tabIndex={0} aria-label="Active organization members">
          <table>
            <thead><tr><th>Member</th><th>Role</th><th>Permission profile</th></tr></thead>
            <tbody>{data.members.map((member) => <tr key={member.id}><td><strong>{member.user.name}</strong><span>{member.user.email}</span></td><td><span className="role">{member.role}</span></td><td>{member.role === "owner" || member.role === "admin" ? "Administrative" : member.role === "developer" ? "Build and usage" : "Read-oriented"}</td></tr>)}</tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Invite member" meta={canInvite ? "Server authorized" : "Permission required"}>
        {canInvite ? <InviteForm /> : <p className="empty">Your role does not have <code>members:invite</code>.</p>}
      </Panel>
    </div>
    <Panel title="Pending invitations" meta="Demo delivery">
      <ul className="rows">{data.invitations.map((item) => <li key={item.id}><div><strong>{item.email}</strong><span>{item.role}</span></div><span className="status warning">{item.status}</span><time>{item.createdAt.slice(0, 10)}</time></li>)}</ul>
    </Panel>
  </main>;
}
