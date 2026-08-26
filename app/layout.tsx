import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LaunchKit AI", template: "%s | LaunchKit AI" },
  description: "Synthetic multi-tenant SaaS foundation demonstrating server-enforced authorization, metering, keys, webhooks, and auditability.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
