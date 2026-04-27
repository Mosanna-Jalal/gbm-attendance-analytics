"use client";

import { useEffect, useMemo, useState } from "react";
import { DEPARTMENTS, MONTHS } from "@/lib/constants";
import { pctClass } from "@/lib/helpers";

type Row = {
  _id: string;
  teacherName: string;
  department: string;
  faculty: string;
  session: string;
  semester: number;
  monthKey: string;
  percentage: number;
  distinctionStudents: string[];
  createdAt: string;
};

export default function DashboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"matrix" | "entries">("matrix");

  useEffect(() => {
    fetch("/api/attendance")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRows(d.rows);
      })
      .catch((e) => setErr(e.message));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  // Average % per (department, month), collapsing multiple teacher submissions.
  const matrix = useMemo(() => {
    if (!rows) return null;
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of rows) {
      const key = `${r.department}__${r.monthKey}`;
      const cur = map.get(key) ?? { sum: 0, count: 0 };
      cur.sum += r.percentage;
      cur.count += 1;
      map.set(key, cur);
    }
    return map;
  }, [rows]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold brand-gradient-text">Admin Dashboard</h1>
          <p className="text-foreground/70 text-sm">Department-wise attendance per month.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/submit"
            className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 text-sm font-semibold"
          >
            Feed Attendance
          </a>
          <a
            href="/admin/gate-entry"
            className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 text-sm font-semibold"
          >
            Feed Gate Entries
          </a>
          <a
            href="/admin/admissions"
            className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 text-sm font-semibold"
          >
            Feed Admissions
          </a>
          <a
            href="/admin/analytics"
            className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 text-sm font-semibold"
          >
            View Analytics →
          </a>
          <button onClick={logout} className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 text-sm">
            Logout
          </button>
        </div>
      </div>

      <div className="mt-5 flex gap-2 border-b border-foreground/10">
        {(["matrix", "entries"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === t ? "border-indigo-500 text-indigo-600" : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            {t === "matrix" ? "Month × Department" : "All Entries"}
          </button>
        ))}
      </div>

      {err && <div className="mt-4 pct-low rounded-lg px-3 py-2 text-sm">{err}</div>}
      {!rows && !err && <div className="mt-6 text-foreground/60">Loading…</div>}

      {rows && tab === "matrix" && matrix && (
        <div className="mt-5 card rounded-2xl overflow-hidden">
          <div className="overflow-auto max-h-[75vh] relative">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="text-white">
                <tr>
                  <th className="text-left px-3 py-3 sticky top-0 left-0 z-30 brand-gradient">Department</th>
                  {MONTHS.map((m) => (
                    <th
                      key={m.key}
                      className="px-3 py-3 font-semibold whitespace-nowrap sticky top-0 z-20 brand-gradient"
                    >
                      {m.label.split(" ")[0].slice(0, 3)} {m.label.split(" ")[1].slice(2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTS.map((d, i) => (
                  <tr key={d.name}>
                    <td
                      className={`px-3 py-2 font-semibold whitespace-nowrap sticky left-0 z-10 ${
                        i % 2 ? "bg-[color:color-mix(in_oklab,var(--background)_92%,#6d28d9_8%)]" : "bg-background"
                      }`}
                    >
                      <div>{d.name}</div>
                      <div className="text-xs text-foreground/60">{d.faculty}</div>
                    </td>
                    {MONTHS.map((m) => {
                      const cell = matrix.get(`${d.name}__${m.key}`);
                      if (!cell)
                        return (
                          <td key={m.key} className="px-2 py-2 text-center text-foreground/30">
                            —
                          </td>
                        );
                      const avg = cell.sum / cell.count;
                      return (
                        <td key={m.key} className="px-2 py-2 text-center">
                          <span className={`inline-block min-w-[56px] px-2 py-1 rounded-lg font-semibold ${pctClass(avg)}`}>
                            {avg.toFixed(1)}%
                          </span>
                          {cell.count > 1 && (
                            <div className="text-[10px] text-foreground/50 mt-0.5">avg of {cell.count}</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows && tab === "entries" && (
        <div className="mt-5 card rounded-2xl overflow-hidden">
          <div className="overflow-auto max-h-[75vh] relative">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="text-white">
                <tr>
                  {["Month", "Department", "Session", "Sem", "Teacher", "%", "Distinction (≥85%)"].map((h) => (
                    <th key={h} className="text-left px-3 py-3 sticky top-0 z-20 brand-gradient whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-foreground/60">
                      No entries yet.
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r._id} className={i % 2 ? "bg-foreground/[0.03]" : ""}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {MONTHS.find((m) => m.key === r.monthKey)?.label ?? r.monthKey}
                    </td>
                    <td className="px-3 py-2">{r.department}</td>
                    <td className="px-3 py-2">{r.session}</td>
                    <td className="px-3 py-2 font-semibold">{r.semester}</td>
                    <td className="px-3 py-2">{r.teacherName}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-semibold ${pctClass(r.percentage)}`}>
                        {r.percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[260px]">
                      {r.distinctionStudents.length === 0 ? (
                        <span className="text-foreground/40">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.distinctionStudents.map((s, j) => (
                            <span key={j} className="pct-great text-[11px] px-2 py-0.5 rounded-full">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
