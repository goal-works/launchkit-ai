import { CreateOrganizationForm } from "@/components/actions";
import { money, number, PageHeader, Panel } from "@/components/shell";
import { requireSnapshot } from "@/server/runtime";

export const metadata = { title: "Organization overview" };

export default async function DashboardPage() {
  const data = await requireSnapshot();
  const budgetRatio = Math.min(100, Math.round(data.usageTotals.costCents / data.organization.budgetWarningCents * 100));
  return <main className="page"><PageHeader eyebrow="Organization control plane" title="Operational overview" description="Usage, tenant resources, security activity, and delivery health for one explicitly scoped organization." />
    <div className="notice"><strong>Demo workspace</strong><span>All people, organizations, usage, costs, endpoints, and events are synthetic.</span><span>No live billing or AI calls</span></div>
    <section className="metric-grid"><article><span>Members</span><strong>{data.members.length}</strong><small>{data.invitations.filter((item) => item.status === "pending").length} pending invitations</small></article><article><span>Workspaces</span><strong>{data.workspaces.length}</strong><small>tenant-scoped resources</small></article><article><span>Total tokens</span><strong>{number(data.usageTotals.inputTokens + data.usageTotals.outputTokens)}</strong><small>synthetic usage records</small></article><article><span>Estimated cost</span><strong>{money(data.usageTotals.costCents)}</strong><small>{budgetRatio}% of warning threshold</small></article></section>
    <div className="dashboard-grid"><Panel title="Budget warning" meta={`${budgetRatio}% consumed`}><div className="budget-track" role="progressbar" aria-label={`${budgetRatio}% of budget warning consumed`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={budgetRatio}><span style={{ width: `${budgetRatio}%` }} /></div><div className="budget-row"><span>Modeled usage {money(data.usageTotals.costCents)}</span><strong>{money(data.organization.budgetWarningCents)} threshold</strong></div></Panel><Panel title="Subscription state" meta="Stripe-shaped demo boundary"><div className="plan"><p>{data.organization.subscription.plan}</p><span>{data.organization.subscription.status}</span></div><p className="muted">No checkout or charge is created without an explicitly configured Stripe test key.</p></Panel><Panel title="Notifications" meta={`${data.notifications.length} items`} className="wide"><ul className="event-list">{data.notifications.map((item) => <li key={item.id}><span className="event-dot" /><div><strong>{item.title}</strong><p>{item.body}</p></div><time>{item.createdAt.slice(0, 10)}</time></li>)}</ul></Panel><Panel title="Create another tenant" meta="Owner-scoped"><CreateOrganizationForm /></Panel></div>
  </main>;
}
