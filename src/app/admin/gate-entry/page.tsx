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
import { parseGateBulk, type ParsedRow } from "@/lib/parseGateBulk";

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

export default function GateEntryPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"single" | "bulk">("single");

  const [date, setDate] = useState("");
  const [count, setCount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<null | { ok: boolean; text: string }>(null);
  const [saving, setSaving] = useState(false);

  const [bulkRaw, setBulkRaw] = useState("");
  const [parsed, setParsed] = useState<{ entries: ParsedRow[]; errors: { raw: string; reason: string }[] }>({
    entries: [],
    errors: [],
  });

  async function load() {
    setErr("");
    try {
      const res = await fetch("/api/gate-entry");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRows(data.rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSingle(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/gate-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: date, count: Number(count), note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMsg({ ok: true, text: "✓ Saved" });
      setCount("");
      setNote("");
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  function onBulkChange(v: string) {
    setBulkRaw(v);
    setParsed(parseGateBulk(v));
  }

  async function saveBulk() {
    setMsg(null);
    if (!parsed.entries.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gate-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: parsed.entries.map((r) => ({ dateKey: r.dateKey, count: r.count })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMsg({
        ok: true,
        text: `✓ Saved ${data.total} rows (new: ${data.inserted}, updated: ${data.updated})`,
      });
      setBulkRaw("");
      setParsed({ entries: [], errors: [] });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(dateKey: string) {
    if (!confirm(`Delete entry for ${fmt(dateKey)}?`)) return;
    const res = await fetch("/api/gate-entry", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey }),
    });
    if (res.ok) load();
  }

  const stats = useMemo(() => {
    if (!rows?.length) return null;
    const total = rows.reduce((s, r) => s + r.count, 0);
    const avg = total / rows.length;
    const max = rows.reduce((a, b) => (b.count > a.count ? b : a));
    const min = rows.reduce((a, b) => (b.count < a.count ? b : a));
    return { total, avg, max, min, days: rows.length };
  }, [rows]);

  const weekday = useMemo(() => {
    if (!rows) return [];
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = names.map((n) => ({ day: n, total: 0, days: 0, avg: 0 }));
    for (const r of rows) {
      const idx = new Date(r.dateKey + "T00:00:00Z").getUTCDay();
      buckets[idx].total += r.count;
      buckets[idx].days += 1;
    }
    for (const b of buckets) b.avg = b.days ? Number((b.total / b.days).toFixed(1)) : 0;
    // Put Monday first for an academic-week feel.
    return [...buckets.slice(1), buckets[0]];
  }, [rows]);

  const monthly = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, { total: number; days: number }>();
    for (const r of rows) {
      const key = r.dateKey.slice(0, 7); // YYYY-MM
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
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold brand-gradient-text">Gate Entry Register</h1>
          <p className="text-foreground/70 text-sm">Daily count of students entering the college.</p>
        </div>
        <a
          href="/admin/dashboard"
          className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 text-sm font-semibold"
        >
          ← Dashboard
        </a>
      </div>

      {/* entry form */}
      <div className="card rounded-2xl p-5">
        <div className="flex gap-2 border-b border-foreground/10 mb-4">
          {(["single", "bulk"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                tab === t
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              {t === "single" ? "Single entry" : "Bulk paste"}
            </button>
          ))}
        </div>

        {tab === "single" ? (
          <form onSubmit={saveSingle} className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] items-end">
            <div>
              <label className="text-sm font-semibold">Date</label>
              <input
                className="input mt-1"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Count</label>
              <input
                className="input mt-1"
                type="number"
                min={0}
                required
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="e.g. 314"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Note (optional)</label>
              <input
                className="input mt-1"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. online class, exam day"
              />
            </div>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-foreground/60">
              Paste lines in any of these formats (one per line): <code>17/02/26 - 17</code> ·{" "}
              <code>2026-02-17: 17</code> · <code>17-02-2026 17</code>. Existing dates will be overwritten.
            </p>
            <textarea
              className="input min-h-[180px] font-mono text-sm"
              value={bulkRaw}
              onChange={(e) => onBulkChange(e.target.value)}
              placeholder={`17/02/26 - 17\n18/02/26 - 56\n19/02/26 - 58`}
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="pct-great px-2.5 py-1 rounded-full text-xs">
                {parsed.entries.length} valid row{parsed.entries.length === 1 ? "" : "s"}
              </span>
              {parsed.errors.length > 0 && (
                <span className="pct-low px-2.5 py-1 rounded-full text-xs">
                  {parsed.errors.length} line{parsed.errors.length === 1 ? "" : "s"} could not be parsed
                </span>
              )}
            </div>
            {parsed.errors.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-foreground/70">Show problematic lines</summary>
                <ul className="mt-2 list-disc pl-5 text-foreground/70">
                  {parsed.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>
                      <code>{e.raw}</code> — {e.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <button
              onClick={saveBulk}
              disabled={!parsed.entries.length || saving}
              className="btn-primary self-start"
            >
              {saving ? "Saving…" : `Save ${parsed.entries.length} row(s)`}
            </button>
          </div>
        )}

        {msg && (
          <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${msg.ok ? "pct-good" : "pct-low"}`}>{msg.text}</div>
        )}
      </div>

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

          {/* Daily chart */}
          <div className="card rounded-2xl p-4 sm:p-6">
            <h2 className="font-bold mb-3">Daily Gate Entries</h2>
            <div className="w-full h-[320px]">
              <ResponsiveContainer>
                <AreaChart data={rows.map((r) => ({ date: fmt(r.dateKey), count: r.count }))}>
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
                  <XAxis dataKey="date" stroke="currentColor" tick={{ fontSize: 11 }} />
                  <YAxis stroke="currentColor" />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(27,19,64,0.95)",
                      border: "1px solid #6d28d9",
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
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="url(#gateStroke)"
                    strokeWidth={2.5}
                    fill="url(#gateArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekday pattern */}
          {weekday.some((w) => w.days > 0) && (
            <div className="card rounded-2xl p-4 sm:p-6">
              <h2 className="font-bold mb-3">Weekday Pattern (avg entries per day of week)</h2>
              <div className="w-full h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={weekday}>
                    <defs>
                      <linearGradient id="wkBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                    <XAxis dataKey="day" stroke="currentColor" />
                    <YAxis stroke="currentColor" />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(27,19,64,0.95)",
                        border: "1px solid #6d28d9",
                        borderRadius: 12,
                        color: "white",
                      }}
                      formatter={(v: unknown) => [`${v} students`, "Avg"]}
                    />
                    <Bar dataKey="avg" fill="url(#wkBar)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Monthly chart */}
          {monthly.length > 0 && (
            <div className="card rounded-2xl p-4 sm:p-6">
              <h2 className="font-bold mb-3">Monthly Totals</h2>
              <div className="w-full h-[280px]">
                <ResponsiveContainer>
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                    <XAxis dataKey="month" stroke="currentColor" />
                    <YAxis stroke="currentColor" />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(27,19,64,0.95)",
                        border: "1px solid #6d28d9",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Bar dataKey="total" fill="url(#gateStroke)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* table */}
          <div className="card rounded-2xl overflow-hidden">
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="text-white">
                  <tr>
                    {["Date", "Count", "Note", ""].map((h) => (
                      <th key={h} className="text-left px-3 py-3 sticky top-0 z-20 brand-gradient">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-foreground/60">
                        No entries yet.
                      </td>
                    </tr>
                  )}
                  {rows.map((r, i) => (
                    <tr key={r._id} className={i % 2 ? "bg-foreground/[0.03]" : ""}>
                      <td className="px-3 py-2 whitespace-nowrap">{fmt(r.dateKey)}</td>
                      <td className="px-3 py-2 font-semibold">{r.count}</td>
                      <td className="px-3 py-2 text-foreground/70">{r.note || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => removeRow(r.dateKey)}
                          className="text-xs text-rose-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
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
