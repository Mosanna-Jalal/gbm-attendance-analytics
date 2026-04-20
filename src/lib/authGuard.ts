import { cookies } from "next/headers";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function requireAuth(): Promise<
  { ok: true; user: string } | { ok: false; response: Response }
> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const payload = await verifyAdminToken(token);
  if (!payload) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { ok: true, user: String(payload.user) };
}
