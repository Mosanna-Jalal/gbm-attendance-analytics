"use client";

import { Suspense, useEffect, useState } from "react";
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

const ANALYTICS_LINKS = [
  {
    href: "/analytics/gate-entries",
    title: "Gate Entries",
    desc: "Daily student footfall from the gate register.",
    tone: "from-emerald-400/20 to-teal-500/20",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21V7l9-4 9 4v14" /><path d="M9 21V11h6v10" />
      </svg>
    ),
  },
  {
    href: "/analytics/class-attendance",
    title: "Class Attendance",
    desc: "Department-wise monthly attendance trends.",
    tone: "from-indigo-400/20 to-violet-500/20",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" />
      </svg>
    ),
  },
  {
    href: "/analytics/admissions",
    title: "Session Admissions",
    desc: "Enrolment progression by session & stream.",
    tone: "from-pink-400/20 to-rose-500/20",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setLoggedIn(Boolean(d.user)))
      .catch(() => setLoggedIn(false));
  }, []);

  function onSubmitClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (loggedIn) return; // logged-in users go straight to /submit
    e.preventDefault();
    const target = document.getElementById("admin-signin");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const input = target.querySelector<HTMLInputElement>("input");
        input?.focus();
      }, 400);
    }
  }

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      <div className="max-w-5xl mx-auto grid gap-8 lg:gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center w-full">
        <section className="animate-float-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-xs font-semibold tracking-wide text-indigo-600 dark:text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · Sep 2025 – Mar 2026
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight mt-4">
            <span className="brand-gradient-text">GBM College Gaya</span>
            <br />
            <span>Analytics</span>
          </h1>
          <p className="mt-5 text-foreground/75 text-base sm:text-lg max-w-xl leading-relaxed">
            A unified dashboard for monthly attendance, gate footfall, and session enrolments. Analytics are public —
            admins sign in to manage data.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row flex-wrap gap-3">
            <Link href="/submit" onClick={onSubmitClick} className="btn-primary inline-flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Teacher — Submit attendance
            </Link>
            <Link
              href="/analytics/class-attendance"
              className="px-5 py-2.5 rounded-xl border border-foreground/20 hover:border-indigo-500/50 hover:bg-foreground/5 font-semibold text-center transition"
            >
              View analytics →
            </Link>
          </div>
        </section>

        <section id="admin-signin" className="animate-float-up scroll-mt-24" style={{ animationDelay: "80ms" }}>
          <h2 className="text-sm font-bold mb-3 text-foreground/60 uppercase tracking-widest">Admin Sign in</h2>
          <Suspense fallback={<div className="card rounded-2xl p-6">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </section>
      </div>

      <section className="animate-float-up" style={{ animationDelay: "160ms" }}>
        <div className="flex items-end justify-between gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-extrabold">Explore Analytics</h2>
          <Link href="/methodology" className="text-xs sm:text-sm text-indigo-500 hover:underline font-semibold whitespace-nowrap">
            Methodology →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {ANALYTICS_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="card rounded-2xl p-5 hover:-translate-y-1 transition border border-transparent hover:border-indigo-500/40 relative overflow-hidden group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${l.tone} opacity-0 group-hover:opacity-100 transition`} />
              <div className="relative flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl brand-gradient text-white grid place-items-center shadow-md shadow-indigo-500/30">
                  {l.icon}
                </div>
                <div className="font-bold text-lg brand-gradient-text">{l.title}</div>
                <div className="text-sm text-foreground/70">{l.desc}</div>
                <div className="mt-1 text-xs font-semibold text-indigo-500 inline-flex items-center gap-1">
                  Open
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition" viewBox="0 0 12 12" fill="none">
                    <path d="M3 6h6M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
