import Link from "next/link";

const TABS = [
  { href: "/analytics/class-attendance", label: "Class Attendance" },
  { href: "/analytics/gate-entries", label: "Gate Entries" },
  { href: "/analytics/admissions", label: "Session Admissions" },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold brand-gradient-text">Analytics</h1>
        <p className="text-foreground/70 text-sm">Public view — no login needed.</p>
      </div>
      <nav className="flex gap-2 flex-wrap border-b border-foreground/10 pb-1">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-4 py-2 text-sm font-semibold rounded-t-lg hover:bg-foreground/5 border-b-2 border-transparent data-[active=true]:border-indigo-500 data-[active=true]:text-indigo-600"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
