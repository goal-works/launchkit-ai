import { DeleteWorkspaceButton, WorkspaceForm } from "@/components/actions";
import { PageHeader, Panel } from "@/components/shell";
import { requireSnapshot } from "@/server/runtime";

export const metadata = { title: "Workspaces" };
export default async function WorkspacesPage() {
  const data = await requireSnapshot();
  const canCreate = data.actor.permissions.includes("workspace:create");
  const canDelete = data.actor.permissions.includes("workspace:delete");
  return <main className="page"><PageHeader eyebrow="Tenant-owned resources" title="Workspaces" description="Workspace queries and mutations are constrained to the active organization before a resource is returned or changed." /><div className="workspace-grid">{data.workspaces.map((workspace) => <article className="workspace-card" key={workspace.id}><div><span className={`environment ${workspace.environment}`}>{workspace.environment}</span><h2>{workspace.name}</h2><p>{workspace.id.slice(0, 18)}</p></div><div><time>Created {workspace.createdAt.slice(0, 10)}</time>{canDelete && <DeleteWorkspaceButton id={workspace.id} />}</div></article>)}</div><Panel title="Create workspace" meta={canCreate ? "Authorized" : "Permission required"}>{canCreate ? <WorkspaceForm /> : <p className="empty">Your role cannot create workspaces.</p>}</Panel></main>;
}
