import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const protectedRoutes = ["/dashboard"];
const adminRoutes = ["/dashboard/admin"];
const authRoutes = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAdminRoute = adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthRoute = authRoutes.includes(pathname);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect authenticated users away from auth pages
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login
  if (!session && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect non-admin users away from admin routes
  if (isAdminRoute && session?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
