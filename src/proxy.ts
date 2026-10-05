import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  // Protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // If already authenticated and visiting sign-in or sign-up, redirect to dashboard
  if ((pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export default middleware;

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};
