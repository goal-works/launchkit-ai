import Link from "next/link";

import { LogoutButton, OrganizationSwitcher } from "./actions";

const navigation = [
  ["/dashboard", "Overview"], ["/members", "Members"], ["/workspaces", "Workspaces"],
  ["/api-keys", "API keys"], ["/usage", "Usage"], ["/billing", "Billing"],
  ["/webhooks", "Webhooks"], ["/audit", "Audit log"],
] as const;

export function AppShell({ context, children }: Readonly<{ context: Awaited<ReturnType<typeof import("@/server/runtime").requireSnapshot>>; children: React.ReactNode }>) {
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/dashboard">LaunchKit<span>AI</span></Link>
      <p className="demo-label">Synthetic SaaS workspace</p>
      <OrganizationSwitcher activeId={context.organization.id} organizations={context.organizations} />
      <nav aria-label="Product navigation">{navigation.map(([href, label], index) => <Link href={href} key={href}><span>{String(index + 1).padStart(2, "0")}</span>{label}</Link>)}</nav>
      <div className="account-block"><p>{context.actor.user.name}</p><span>{context.actor.membership.role}</span><LogoutButton /></div>
    </aside>
    <div className="content"><header className="topbar"><p>Tenant: <strong>{context.organization.slug}</strong></p><p>Server-enforced role: <strong>{context.actor.membership.role}</strong></p></header>{children}</div>
  </div>;
}

export function PageHeader({ eyebrow, title, description }: Readonly<{ eyebrow: string; title: string; description: string }>) {
  return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><p>{description}</p></div>;
}

export function Panel({ title, meta, children, className = "" }: Readonly<{ title: string; meta?: string; children: React.ReactNode; className?: string }>) {
  return <section className={`panel ${className}`}><div className="panel-head"><h2>{title}</h2>{meta && <span>{meta}</span>}</div><div className="panel-body">{children}</div></section>;
}

export const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
export const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
