"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/admin/dashboard";

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Login failed");
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card rounded-2xl p-6 sm:p-7 flex flex-col gap-4">
      <div>
        <label className="text-sm font-semibold">User ID</label>
        <input className="input mt-1" value={user} onChange={(e) => setUser(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="text-sm font-semibold">Password</label>
        <input
          className="input mt-1"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
        />
      </div>
      {err && <div className="text-sm pct-low rounded-lg px-3 py-2">{err}</div>}
      <button className="btn-primary" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-2 lg:items-center">
      <section>
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
          <span className="brand-gradient-text">GBM College Gaya</span>
          <br />
          <span>Attendance Portal</span>
        </h1>
        <p className="mt-4 text-foreground/80">
          Monthly attendance tracking for September 2025 – March 2026. Administrators sign in to view department-wise
          data and analytics.
        </p>
        <div className="mt-6">
          <Link href="/submit" className="inline-flex items-center gap-1.5 text-sm font-semibold brand-gradient-text hover:underline">
            Teacher? Submit attendance →
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3 brand-gradient-text">Admin Sign in</h2>
        <Suspense fallback={<div className="card rounded-2xl p-6">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </section>
    </div>
  );
}
