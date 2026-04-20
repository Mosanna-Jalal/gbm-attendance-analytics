import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";

// Paths that require login. Everything else is public (including all /analytics/* views).
const GATED_PREFIXES = ["/submit", "/admin"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const gated = GATED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!gated) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = await verifyAdminToken(token);
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt)$).*)"],
};
