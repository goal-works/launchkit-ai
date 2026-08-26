import { BudgetForm } from "@/components/actions";
import { money, PageHeader, Panel } from "@/components/shell";
import { requireSnapshot } from "@/server/runtime";

export const metadata = { title: "Billing state" };
export default async function BillingPage() {
  const data = await requireSnapshot();
  const canWrite = data.actor.permissions.includes("billing:write");
  return <main className="page"><PageHeader eyebrow="Subscription and quota boundary" title="Billing controls" description="V1 models subscription state and budget policy without claiming a live charge, customer, checkout, or provider invoice." /><div className="billing-hero"><div><p className="eyebrow">Current plan</p><h2>{data.organization.subscription.plan}</h2><span className="status success">{data.organization.subscription.status}</span></div><div><span>Modeled usage</span><strong>{money(data.usageTotals.costCents)}</strong><small>of {money(data.organization.budgetWarningCents)} warning threshold</small></div></div><div className="two-column"><Panel title="Budget policy" meta={canWrite ? "billing:write" : "Read only"}>{canWrite ? <BudgetForm cents={data.organization.budgetWarningCents} /> : <p className="empty">Your role can view billing state but cannot update policy.</p>}</Panel><Panel title="Stripe test-mode boundary" meta="No key configured"><p className="lede-small">The adapter accepts only <code>sk_test_</code> credentials. Demo mode never creates a checkout session or stores payment details.</p><button className="button secondary" disabled type="button">Test checkout unavailable</button></Panel></div></main>;
}
