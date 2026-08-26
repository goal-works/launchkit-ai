import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { decodeSession } from "./security";
import { service } from "./container";

export { service };
export const sessionCookieName = "launchkit_session";

export async function requireSnapshot() {
  const cookieStore = await cookies();
  const actor = decodeSession(cookieStore.get(sessionCookieName)?.value);
  if (!actor) redirect("/login");
  try {
    return await service.snapshot(actor);
  } catch {
    redirect("/login");
  }
}
