import { AppShell } from "@/components/shell";
import { requireSnapshot } from "@/server/runtime";

export default async function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await requireSnapshot();
  return <AppShell context={context}>{children}</AppShell>;
}
