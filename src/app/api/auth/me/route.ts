import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const payload = await verifyAdminToken(token);
  return NextResponse.json({ user: payload?.user ?? null });
}
