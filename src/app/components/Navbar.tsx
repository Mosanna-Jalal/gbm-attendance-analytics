"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const ANALYTICS_LINKS = [
  { href: "/analytics/gate-entries", label: "Gate Entries", desc: "Daily student footfall" },
  { href: "/analytics/class-attendance", label: "Class Attendance", desc: "Department-wise trends" },
  { href: "/analytics/admissions", label: "Session Admissions", desc: "Enrolment progression" },
];

export default function Navbar() {
  const [user, setUser] = useState<string | null>(null);
  const [stripOpen, setStripOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setStripOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStripOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-foreground/10">
        <div ref={ref} onMouseEnter={() => setStripOpen(true)} onMouseLeave={() => setStripOpen(false)}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0 group">
              <span className="w-9 h-9 rounded-xl brand-gradient grid place-items-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition">
                GBM
              </span>
              <span className="brand-gradient-text hidden sm:inline tracking-tight">Analytics</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
              <Link
                href="/methodology"
                title="Methodology — how the charts are calculated"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-foreground/15 hover:bg-foreground/5 font-semibold transition"
              >
                <MethodologyIcon />
                <span>Methodology</span>
              </Link>

              <button
                onClick={() => setStripOpen((v) => !v)}
                className={`px-3 py-1.5 rounded-lg hover:bg-foreground/5 inline-flex items-center gap-1 transition ${
                  stripOpen ? "bg-foreground/5" : ""
                }`}
              >
                View Analytics
                <ChevronIcon open={stripOpen} />
              </button>

              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg brand-gradient text-white font-semibold shadow-md shadow-indigo-500/30 hover:brightness-110 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Submit</span>
              </Link>

              {user ? (
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 font-semibold transition"
                >
                  Logout
                </button>
              ) : (
                <Link href="/" className="px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition">
                  Admin
                </Link>
              )}
            </nav>

            {/* Mobile: Submit + hamburger */}
            <div className="md:hidden flex items-center gap-2">
              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg brand-gradient text-white font-semibold text-sm shadow-md shadow-indigo-500/30 active:scale-95 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Submit
              </Link>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Menu"
                aria-expanded={mobileOpen}
                className="w-10 h-10 rounded-xl border border-foreground/15 inline-flex items-center justify-center active:scale-95 transition"
              >
                {mobileOpen ? <CloseIcon /> : <HamburgerIcon />}
              </button>
            </div>
          </div>

          {/* Desktop analytics strip */}
          {stripOpen && (
            <div className="hidden md:block bg-[#1b1340] dark:bg-black text-white border-t border-white/10 shadow-xl animate-strip-slide">
              <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-1 overflow-x-auto">
                {ANALYTICS_LINKS.map((l) => {
                  const active = pathname === l.href;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setStripOpen(false)}
                      className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{l.label}</span>
                      <span className="hidden md:inline text-xs text-white/50 font-normal">— {l.desc}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 animate-fade-in" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-[57px] left-0 right-0 bg-background border-b border-foreground/10 shadow-2xl max-h-[calc(100vh-57px)] overflow-y-auto animate-drawer-slide"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              <MobileGroupLabel>Reference</MobileGroupLabel>
              <MobileLink href="/methodology" onClick={() => setMobileOpen(false)}>
                <MethodologyIcon />
                Methodology
              </MobileLink>

              <MobileGroupLabel className="mt-3">Analytics</MobileGroupLabel>
              {ANALYTICS_LINKS.map((l) => (
                <MobileLink key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>
                  <span className="w-2 h-2 rounded-full brand-gradient" />
                  <div className="flex flex-col">
                    <span>{l.label}</span>
                    <span className="text-xs text-foreground/60 font-normal">{l.desc}</span>
                  </div>
                </MobileLink>
              ))}

              <MobileGroupLabel className="mt-3">Account</MobileGroupLabel>
              {user ? (
                <>
                  <MobileLink href="/admin/dashboard" onClick={() => setMobileOpen(false)}>
                    <DashboardIcon />
                    Dashboard
                  </MobileLink>
                  <MobileLink href="/admin/gate-entry" onClick={() => setMobileOpen(false)}>
                    <GateIcon />
                    Gate Entries (Admin)
                  </MobileLink>
                  <button
                    onClick={logout}
                    className="mt-1 inline-flex items-center gap-3 px-3 py-3 rounded-xl bg-rose-500/10 text-rose-500 font-semibold text-left"
                  >
                    <LogoutIcon />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <MobileLink href="/submit" onClick={() => setMobileOpen(false)}>
                    <EditIcon />
                    Teacher · Submit attendance
                  </MobileLink>
                  <MobileLink href="/" onClick={() => setMobileOpen(false)}>
                    <LockIcon />
                    Admin · Sign in
                  </MobileLink>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-foreground/5 active:bg-foreground/10 font-semibold transition"
    >
      {children}
    </Link>
  );
}

function MobileGroupLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[0.7rem] uppercase tracking-widest text-foreground/50 font-bold px-3 pt-1 pb-0.5 ${className}`}>
      {children}
    </div>
  );
}

function MethodologyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-3 h-3 transition ${open ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}
function GateIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V7l9-4 9 4v14" /><path d="M9 21V11h6v10" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
