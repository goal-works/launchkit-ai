"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function LoginForm({ users }: Readonly<{ users: { id: string; name: string; email: string }[] }>) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: new FormData(event.currentTarget).get("userId") }) });
    if (!response.ok) { setError("Unable to start the synthetic demo session."); return; }
    router.push("/dashboard");
    router.refresh();
  }
  return <form className="login-form" onSubmit={submit}><label><span>Demo identity</span><select defaultValue="user-owner" name="userId">{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label><button className="button" type="submit">Enter demo workspace</button>{error && <p role="alert">{error}</p>}</form>;
}
