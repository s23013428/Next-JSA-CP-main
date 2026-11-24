import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE } from "@/app/lib/auth-constants";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/account")) {
    const isAuthPage = request.nextUrl.pathname === "/account/login" || request.nextUrl.pathname === "/account/register";
    const hasUserSession = Boolean(request.cookies.get(USER_SESSION_COOKIE)?.value);
    if (!hasUserSession && !isAuthPage) return NextResponse.redirect(new URL(`/account/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));
    return NextResponse.next();
  }
  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  const hasSessionCookie = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!hasSessionCookie && !isLoginPage) return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/account/:path*"] };
