"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import ResizableChart, { StackedTick } from "@/app/components/ResizableChart";

type Row = { _id: string; dateKey: string; count: number; note?: string };

function fmt(dk: string) {
  const [y, m, d] = dk.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
function monthLabel(dk: string) {
  const [y, m] = dk.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}

type Range = "all" | "30" | "90" | "month";

export default function GateEntriesAnalytics() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [display, setDisplay] = useState<"chart" | "table">("chart");

  useEffect(() => {
    fetch("/api/gate-entry")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRows(d.rows);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (range === "all") return rows;
    const sorted = [...rows].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    if (!sorted.length) return sorted;
    const lastKey = sorted[sorted.length - 1].dateKey;
    const last = new Date(lastKey + "T00:00:00Z");
    if (range === "month") {
      const y = last.getUTCFullYear();
      const m = last.getUTCMonth();
      return sorted.filter((r) => {
        const d = new Date(r.dateKey + "T00:00:00Z");
        return d.getUTCFullYear() === y && d.getUTCMonth() === m;
      });
    }
    const days = range === "30" ? 30 : 90;
    const cutoff = new Date(last);
    cutoff.setUTCDate(cutoff.getUTCDate() - days + 1);
    return sorted.filter((r) => new Date(r.dateKey + "T00:00:00Z") >= cutoff);
  }, [rows, range]);

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const total = filtered.reduce((s, r) => s + r.count, 0);
    const avg = total / filtered.length;
    const max = filtered.reduce((a, b) => (b.count > a.count ? b : a));
    const min = filtered.reduce((a, b) => (b.count < a.count ? b : a));
    return { total, avg, max, min, days: filtered.length };
  }, [filtered]);

  const weekday = useMemo(() => {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = names.map((n) => ({ day: n, total: 0, days: 0, avg: 0 }));
    for (const r of filtered) {
      const idx = new Date(r.dateKey + "T00:00:00Z").getUTCDay();
      buckets[idx].total += r.count;
      buckets[idx].days += 1;
    }
    for (const b of buckets) b.avg = b.days ? Number((b.total / b.days).toFixed(1)) : 0;
    return [...buckets.slice(1), buckets[0]];
  }, [filtered]);

  const monthly = useMemo(() => {
    const map = new Map<string, { total: number; days: number }>();
    for (const r of filtered) {
      const key = r.dateKey.slice(0, 7);
      const cur = map.get(key) ?? { total: 0, days: 0 };
      cur.total += r.count;
      cur.days += 1;
      map.set(key, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({
        month: monthLabel(k + "-01"),
        total: v.total,
        avg: Number((v.total / v.days).toFixed(1)),
      }));
  }, [filtered]);

  // Insights: pattern-shifting events — outliers vs rolling avg, plus any rows with a note.
  const insights = useMemo(() => {
    if (!stats || !filtered.length) return [];
    const sorted = [...filtered].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const avg = stats.avg;
    const out: { kind: "peak" | "dip" | "note"; dateKey: string; count: number; delta: number; note?: string }[] = [];
    for (const r of sorted) {
      const delta = ((r.count - avg) / avg) * 100;
      if (r.note && r.note.trim()) {
        out.push({ kind: "note", dateKey: r.dateKey, count: r.count, delta, note: r.note });
      } else if (Math.abs(delta) >= 40) {
        out.push({ kind: delta > 0 ? "peak" : "dip", dateKey: r.dateKey, count: r.count, delta });
      }
    }
    return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);
  }, [filtered, stats]);

  return (
    <div className="flex flex-col gap-5">
      {err && <div className="pct-low rounded-lg px-3 py-2 text-sm">{err}</div>}
      {!rows && !err && <div className="text-foreground/60">Loading…</div>}

      {rows && stats && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Days Recorded" value={String(stats.days)} />
            <Stat label="Total Entries" value={stats.total.toLocaleString()} />
            <Stat label="Daily Average" value={stats.avg.toFixed(1)} />
            <Stat label="Peak Day" value={`${stats.max.count}`} sub={fmt(stats.max.dateKey)} />
          </div>

          <div className="card rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold mr-1">Range:</span>
              {([
                { v: "all", l: "All time" },
                { v: "90", l: "Last 90 days" },
                { v: "30", l: "Last 30 days" },
                { v: "month", l: "Latest month" },
              ] as { v: Range; l: string }[]).map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setRange(v)}
                  className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition ${
                    range === v ? "brand-gradient text-white border-transparent" : "border-foreground/15 hover:border-foreground/40"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold mr-1">Display:</span>
              <div className="inline-flex rounded-full border border-foreground/15 p-0.5">
                {(["chart", "table"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDisplay(d)}
                    className={`text-xs sm:text-sm px-3 py-1 rounded-full capitalize transition ${
                      display === d ? "brand-gradient text-white" : "hover:bg-foreground/5"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {display === "chart" && (
            <>
              <ResizableChart title="Daily Gate Entries">
                {() => (
                  <ResponsiveContainer>
                    <AreaChart data={filtered.map((r) => ({ date: fmt(r.dateKey), count: r.count }))}>
                      <defs>
                        <linearGradient id="gateArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6d28d9" stopOpacity={0.8} />
                          <stop offset="50%" stopColor="#ec4899" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#ec4899" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="gateStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6d28d9" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                      <XAxis
                        dataKey="date"
                        stroke="currentColor"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        height={50}
                        interval="preserveStartEnd"
                      />
                      <YAxis stroke="currentColor" tick={{ fontSize: 11 }} width={40} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(27,19,64,0.55)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(109,40,217,0.5)",
                          borderRadius: 12,
                          color: "white",
                        }}
                      />
                      <ReferenceLine
                        y={stats.avg}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        label={{ value: `Avg ${stats.avg.toFixed(0)}`, fill: "#10b981", fontSize: 11 }}
                      />
                      <Area type="monotone" dataKey="count" stroke="url(#gateStroke)" strokeWidth={2.5} fill="url(#gateArea)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ResizableChart>

              {insights.length > 0 && (
                <div className="card rounded-2xl p-4 sm:p-6">
                  <h2 className="font-bold mb-1">Key Pattern Changes</h2>
                  <p className="text-xs text-foreground/60 mb-3">
                    Days with noted events or that deviate ≥40% from the average.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {insights.map((it, i) => {
                      const tone =
                        it.kind === "peak" ? "pct-good" : it.kind === "dip" ? "pct-low" : "pct-great";
                      const badge =
                        it.kind === "peak" ? "Peak" : it.kind === "dip" ? "Dip" : "Event";
                      return (
                        <li key={i} className="flex items-center gap-3 rounded-xl border border-foreground/10 px-3 py-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${tone}`}>{badge}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">
                              {fmt(it.dateKey)} — {it.count} students
                            </div>
                            {it.note && <div className="text-xs text-foreground/70 truncate">{it.note}</div>}
                          </div>
                          <div className={`text-xs font-bold whitespace-nowrap ${it.delta >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {it.delta >= 0 ? "+" : ""}{it.delta.toFixed(0)}% vs avg
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {weekday.some((w) => w.days > 0) && (
                <ResizableChart title="Weekday Pattern">
                  {() => (
                    <ResponsiveContainer>
                      <BarChart data={weekday}>
                        <defs>
                          <linearGradient id="wkBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                        <XAxis dataKey="day" stroke="currentColor" tick={{ fontSize: 11 }} interval={0} />
                        <YAxis stroke="currentColor" tick={{ fontSize: 11 }} width={40} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(27,19,64,0.55)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(109,40,217,0.5)",
                            borderRadius: 12,
                            color: "white",
                          }}
                          formatter={(v: unknown) => [`${v} students`, "Avg"]}
                        />
                        <Bar dataKey="avg" fill="url(#wkBar)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ResizableChart>
              )}

              {monthly.length > 0 && (
                <ResizableChart title="Monthly Totals">
                  {() => (
                    <ResponsiveContainer>
                      <BarChart data={monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                        <XAxis
                          dataKey="month"
                          stroke="currentColor"
                          tick={<StackedTick fontSize={10} />}
                          height={42}
                          interval={0}
                        />
                        <YAxis stroke="currentColor" tick={{ fontSize: 11 }} width={50} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(27,19,64,0.55)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(109,40,217,0.5)",
                            borderRadius: 12,
                            color: "white",
                          }}
                        />
                        <Bar dataKey="total" fill="url(#gateStroke)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ResizableChart>
              )}
            </>
          )}

          <div className="card rounded-2xl overflow-hidden">
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="text-white">
                  <tr>
                    {["Date", "Count", "Note"].map((h) => (
                      <th key={h} className="text-left px-3 py-3 sticky top-0 z-20 brand-gradient">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r._id} className={i % 2 ? "bg-foreground/[0.03]" : ""}>
                      <td className="px-3 py-2 whitespace-nowrap">{fmt(r.dateKey)}</td>
                      <td className="px-3 py-2 font-semibold">{r.count}</td>
                      <td className="px-3 py-2 text-foreground/70">{r.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      <div className="text-2xl font-extrabold brand-gradient-text mt-1">{value}</div>
      {sub && <div className="text-xs text-foreground/60 mt-1 truncate">{sub}</div>}
    </div>
  );
}
