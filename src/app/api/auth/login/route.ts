import { NextResponse } from "next/server";
import { signAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, pass } = await req.json();
  if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASS) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = await signAdminToken(user);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
