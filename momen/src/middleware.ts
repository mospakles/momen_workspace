import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // The public portfolio only ever shows photos ticked "Show in portfolio".
  if (pathname.startsWith("/login") || pathname === "/portfolio" || pathname.startsWith("/api/portfolio/")) return NextResponse.next();

  // The daily backup cron has no session; it proves itself with CRON_SECRET instead.
  const cronSecret = process.env.CRON_SECRET;
  if (pathname === "/api/backup" && cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return NextResponse.next();

  const ok = await isValidSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) return new NextResponse("Unauthorized", { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
