"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts";
import { DEPARTMENTS, MONTHS, SESSIONS } from "@/lib/constants";
import { pctColor } from "@/lib/helpers";

type Row = {
  _id: string;
  department: string;
  faculty: string;
  session: string;
  semester: number;
  monthKey: string;
  percentage: number;
};

const CHART_COLORS = ["#6d28d9", "#ec4899", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AnalyticsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");

  const [deptFilter, setDeptFilter] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [sessionFilter, setSessionFilter] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/attendance")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRows(d.rows);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (deptFilter.length && !deptFilter.includes(r.department)) return false;
      if (monthFilter.length && !monthFilter.includes(r.monthKey)) return false;
      if (sessionFilter.length && !sessionFilter.includes(r.session)) return false;
      return true;
    });
  }, [rows, deptFilter, monthFilter, sessionFilter]);

  // Overall monthly trend — average across all filtered rows
  const monthlyTrend = useMemo(() => {
    return MONTHS.filter((m) => !monthFilter.length || monthFilter.includes(m.key)).map((m) => {
      const pts = filtered.filter((r) => r.monthKey === m.key);
      const avg = pts.length ? pts.reduce((s, r) => s + r.percentage, 0) / pts.length : null;
      return {
        month: m.label.split(" ")[0].slice(0, 3) + " " + m.label.split(" ")[1].slice(2),
        avg: avg == null ? null : Number(avg.toFixed(2)),
        count: pts.length,
      };
    });
  }, [filtered, monthFilter]);

  // Department-wise average
  const byDept = useMemo(() => {
    const activeDepts = deptFilter.length ? deptFilter : DEPARTMENTS.map((d) => d.name);
    return activeDepts
      .map((name) => {
        const pts = filtered.filter((r) => r.department === name);
        const avg = pts.length ? pts.reduce((s, r) => s + r.percentage, 0) / pts.length : 0;
        return { department: name, avg: Number(avg.toFixed(2)), count: pts.length };
      })
      .filter((d) => d.count > 0)
      .sort((a, b) => b.avg - a.avg);
  }, [filtered, deptFilter]);

  // Heatmap-ish month × dept data
  const overallAvg = useMemo(() => {
    if (!filtered.length) return 0;
    return filtered.reduce((s, r) => s + r.percentage, 0) / filtered.length;
  }, [filtered]);

  function toggle<T extends string>(arr: T[], v: T, set: (v: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold brand-gradient-text">Analytics</h1>
          <p className="text-foreground/70 text-sm">Visualise attendance trends across months, departments & sessions.</p>
        </div>
        <a
          href="/admin/dashboard"
          className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 text-sm font-semibold"
        >
          ← Back to Dashboard
        </a>
      </div>

      <div className="card rounded-2xl p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <FilterGroup
            label="Months"
            options={MONTHS.map((m) => ({ value: m.key, label: m.label }))}
            selected={monthFilter}
            onToggle={(v) => toggle(monthFilter, v, setMonthFilter)}
            onClear={() => setMonthFilter([])}
          />
          <FilterGroup
            label="Sessions"
            options={SESSIONS.map((s) => ({ value: s, label: s }))}
            selected={sessionFilter}
            onToggle={(v) => toggle(sessionFilter, v, setSessionFilter)}
            onClear={() => setSessionFilter([])}
          />
          <FilterGroup
            label="Departments"
            options={DEPARTMENTS.map((d) => ({ value: d.name, label: d.name }))}
            selected={deptFilter}
            onToggle={(v) => toggle(deptFilter, v, setDeptFilter)}
            onClear={() => setDeptFilter([])}
            scroll
          />
        </div>
      </div>

      {err && <div className="pct-low rounded-lg px-3 py-2 text-sm">{err}</div>}
      {!rows && !err && <div className="text-foreground/60">Loading…</div>}

      {rows && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Overall Avg" value={`${overallAvg.toFixed(1)}%`} sub={`${filtered.length} submissions`} />
            <Stat
              label="Best Dept"
              value={byDept[0] ? `${byDept[0].avg.toFixed(1)}%` : "—"}
              sub={byDept[0]?.department ?? ""}
            />
            <Stat
              label="Needs Attention"
              value={byDept.at(-1) ? `${byDept.at(-1)!.avg.toFixed(1)}%` : "—"}
              sub={byDept.at(-1)?.department ?? ""}
            />
          </div>

          <div className="card rounded-2xl p-4 sm:p-6">
            <h2 className="font-bold mb-3">Monthly Trend (Sep 2025 → Mar 2026)</h2>
            <div className="w-full h-[320px]">
              <ResponsiveContainer>
                <LineChart data={monthlyTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6d28d9" />
                      <stop offset="50%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                  <XAxis dataKey="month" stroke="currentColor" />
                  <YAxis domain={[0, 100]} stroke="currentColor" />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(27,19,64,0.95)",
                      border: "1px solid #6d28d9",
                      borderRadius: 12,
                      color: "white",
                    }}
                    formatter={(v: unknown) => (v == null ? "No data" : `${v}%`)}
                  />
                  <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Target 75%", fill: "#10b981", fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="url(#lineGrad)"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#6d28d9" }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card rounded-2xl p-4 sm:p-6">
            <h2 className="font-bold mb-3">Department Ranking (avg %)</h2>
            <div className="w-full" style={{ height: Math.max(260, byDept.length * 32 + 40) }}>
              <ResponsiveContainer>
                <BarChart data={byDept} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                  <XAxis type="number" domain={[0, 100]} stroke="currentColor" />
                  <YAxis type="category" dataKey="department" width={140} stroke="currentColor" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(27,19,64,0.95)",
                      border: "1px solid #6d28d9",
                      borderRadius: 12,
                      color: "white",
                    }}
                    formatter={(v: unknown) => `${v}%`}
                  />
                  <Bar dataKey="avg" radius={[0, 8, 8, 0]}>
                    {byDept.map((d, i) => (
                      <Cell key={i} fill={pctColor(d.avg)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card rounded-2xl p-4 sm:p-6">
            <h2 className="font-bold mb-3">Monthly Comparison — by Department</h2>
            <p className="text-xs text-foreground/60 mb-3">
              {deptFilter.length === 0
                ? "Select one or more departments above to compare their monthly trend."
                : `Comparing ${deptFilter.length} department(s).`}
            </p>
            {deptFilter.length > 0 && (
              <div className="w-full h-[340px]">
                <ResponsiveContainer>
                  <LineChart
                    data={MONTHS.map((m) => {
                      const row: Record<string, string | number | null> = {
                        month: m.label.split(" ")[0].slice(0, 3) + " " + m.label.split(" ")[1].slice(2),
                      };
                      for (const dept of deptFilter) {
                        const pts = filtered.filter((r) => r.department === dept && r.monthKey === m.key);
                        row[dept] = pts.length ? Number((pts.reduce((s, r) => s + r.percentage, 0) / pts.length).toFixed(2)) : null;
                      }
                      return row;
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                    <XAxis dataKey="month" stroke="currentColor" />
                    <YAxis domain={[0, 100]} stroke="currentColor" />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(27,19,64,0.95)",
                        border: "1px solid #6d28d9",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Legend />
                    {deptFilter.map((d, i) => (
                      <Line
                        key={d}
                        type="monotone"
                        dataKey={d}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wide text-foreground/60">{label}</div>
      <div className="text-2xl sm:text-3xl font-extrabold brand-gradient-text mt-1">{value}</div>
      {sub && <div className="text-xs text-foreground/60 mt-1 truncate">{sub}</div>}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
  onClear,
  scroll,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
  scroll?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{label}</div>
        {selected.length > 0 && (
          <button onClick={onClear} className="text-xs text-indigo-500 hover:underline">
            Clear ({selected.length})
          </button>
        )}
      </div>
      <div className={`mt-2 flex flex-wrap gap-1.5 ${scroll ? "max-h-[140px] overflow-y-auto pr-1" : ""}`}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                on
                  ? "brand-gradient text-white border-transparent"
                  : "border-foreground/15 hover:border-foreground/40"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
