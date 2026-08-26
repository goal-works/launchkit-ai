import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";
import { service } from "@/server/runtime";

export const metadata: Metadata = { title: "Demo sign in" };

export default async function LoginPage() {
  const users = await service.users();
  return <main className="login-page"><section className="login-copy"><p className="eyebrow">Production boundaries / synthetic identities</p><h1>Multi-tenant infrastructure you can inspect.</h1><p>Enter a signed, HTTP-only demo session as one of five seeded roles. No passwords, real accounts, or external identity claims are used.</p><div className="security-note"><strong>Demo authentication</strong><span>The session is tamper-evident, expires after eight hours, and is rejected when organization membership is missing.</span></div></section><section className="login-card"><div><p className="mono">LAUNCHKIT / ACCESS</p><h2>Choose a role</h2><p>Owner has access to two fictional organizations. Other roles demonstrate progressively narrower permissions.</p></div><LoginForm users={users} /><p className="fine-print">Synthetic demo only · no production credentials</p></section></main>;
}
