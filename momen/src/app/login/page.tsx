import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!process.env.APP_PASSWORD || password !== process.env.APP_PASSWORD) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  (await cookies()).set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect(next.startsWith("/") ? next : "/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form action={login} className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="font-display text-3xl text-ink">Momen</h1>
          <p className="text-sm text-muted">Shop manager</p>
        </div>
        <input type="hidden" name="next" value={next ?? "/"} />
        <label className="block">
          <span className="label">Password</span>
          <input name="password" type="password" className="input" autoFocus required />
        </label>
        {error && <p className="text-sm text-red-600">Wrong password. Try again.</p>}
        <button className="btn-primary w-full">Log in</button>
      </form>
    </main>
  );
}
