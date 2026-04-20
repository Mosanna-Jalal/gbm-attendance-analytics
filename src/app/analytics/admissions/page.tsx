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
} from "recharts";
import ResizableChart from "@/app/components/ResizableChart";

type Row = { _id: string; session: string; stream: string; semester: number; count: number };

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// 9 maximally-distinct colors for (session × stream) combos.
const COMBO_PALETTE = [
  "#e6194b", "#3cb44b", "#4363d8",
  "#f58231", "#911eb4", "#42d4f4",
  "#f032e6", "#bfef45", "#ffd8b1",
];

const STREAM_COLORS: Record<string, string> = {
  "B.A": "#e6194b",
  "B.Sc": "#3cb44b",
  "B.Com": "#4363d8",
};

function comboColor(session: string, stream: string, sessions: string[], streams: string[]) {
  const si = sessions.indexOf(session);
  const ti = streams.indexOf(stream);
  const idx = si * streams.length + ti;
  return COMBO_PALETTE[idx % COMBO_PALETTE.length];
}

export default function AdmissionsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [focusSession, setFocusSession] = useState<string | "all">("all");
  const [streamFilter, setStreamFilter] = useState<Set<string>>(new Set());
  const [display, setDisplay] = useState<"chart" | "table">("chart");

  useEffect(() => {
    fetch("/api/admission")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRows(d.rows);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const sessions = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.session))).sort(),
    [rows]
  );
  const streams = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.stream))).sort(),
    [rows]
  );

  const activeStreams = useMemo(
    () => (streamFilter.size === 0 ? streams : streams.filter((s) => streamFilter.has(s))),
    [streams, streamFilter]
  );

  function toggleStream(s: string) {
    setStreamFilter((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });
  }

  const progressionData = useMemo(() => {
    if (!rows) return [];
    const targetSessions = focusSession === "all" ? sessions : [focusSession];
    return Array.from({ length: 8 }, (_, i) => i + 1).map((sem) => {
      const row: Record<string, string | number | null> = { semLabel: ROMAN[sem - 1] };
      for (const s of targetSessions) {
        for (const st of activeStreams) {
          const key = focusSession === "all" ? `${s} · ${st}` : st;
          const hit = rows.find((r) => r.session === s && r.stream === st && r.semester === sem);
          row[key] = hit ? hit.count : null;
        }
      }
      return row;
    });
  }, [rows, focusSession, sessions, activeStreams]);

  const progressionLines = useMemo(() => {
    if (focusSession === "all") {
      return sessions.flatMap((s) =>
        activeStreams.map((st) => ({
          key: `${s} · ${st}`,
          color: comboColor(s, st, sessions, streams),
        }))
      );
    }
    return activeStreams.map((st) => ({ key: st, color: STREAM_COLORS[st] ?? "#6d28d9" }));
  }, [focusSession, sessions, streams, activeStreams]);

  const sessionTotals = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.session, (map.get(r.session) ?? 0) + r.count);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([session, total]) => ({ session, total }));
  }, [rows]);

  const currentOnRoll = useMemo(() => {
    if (!rows) return { total: 0, rows: [] as Row[] };
    const bySessionStream = new Map<string, Row>();
    for (const r of rows) {
      const k = `${r.session}__${r.stream}`;
      const cur = bySessionStream.get(k);
      if (!cur || r.semester > cur.semester) bySessionStream.set(k, r);
    }
    const total = [...bySessionStream.values()].reduce((s, r) => s + r.count, 0);
    return {
      total,
      rows: [...bySessionStream.values()].sort((a, b) => a.session.localeCompare(b.session) || a.stream.localeCompare(b.stream)),
    };
  }, [rows]);

  // Insights: biggest attrition drops between consecutive semesters per (session · stream)
  const insights = useMemo(() => {
    if (!rows) return [];
    const out: { label: string; from: number; to: number; semFrom: string; semTo: string; drop: number; pct: number; color: string }[] = [];
    for (const s of sessions) {
      for (const st of activeStreams) {
        const counts = Array.from({ length: 8 }, (_, i) => {
          const hit = rows.find((r) => r.session === s && r.stream === st && r.semester === i + 1);
          return hit?.count ?? null;
        });
        for (let i = 0; i < 7; i++) {
          const a = counts[i];
          const b = counts[i + 1];
          if (a == null || b == null) continue;
          const drop = a - b;
          if (drop <= 0) continue;
          out.push({
            label: `${s} · ${st}`,
            from: a,
            to: b,
            semFrom: ROMAN[i],
            semTo: ROMAN[i + 1],
            drop,
            pct: a > 0 ? (drop / a) * 100 : 0,
            color: comboColor(s, st, sessions, streams),
          });
        }
      }
    }
    return out.sort((x, y) => y.pct - x.pct).slice(0, 5);
  }, [rows, sessions, streams, activeStreams]);

  return (
    <div className="flex flex-col gap-5">
      {err && <div className="pct-low rounded-lg px-3 py-2 text-sm">{err}</div>}
      {!rows && !err && <div className="text-foreground/60">Loading…</div>}

      {rows && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Total Enrolled (latest sem)" value={currentOnRoll.total.toLocaleString()} />
            {sessionTotals.map((s) => (
              <Stat key={s.session} label={`Session ${s.session}`} value={s.total.toLocaleString()} sub="all sems combined" />
            ))}
          </div>

          <div className="card rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold mr-1">Session:</span>
              {[
                { v: "all" as const, l: "All sessions" },
                ...sessions.map((s) => ({ v: s, l: s })),
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setFocusSession(v)}
                  className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition ${
                    focusSession === v ? "brand-gradient text-white border-transparent" : "border-foreground/15 hover:border-foreground/40"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold mr-1">Stream:</span>
              <button
                onClick={() => setStreamFilter(new Set())}
                className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition ${
                  streamFilter.size === 0 ? "brand-gradient text-white border-transparent" : "border-foreground/15 hover:border-foreground/40"
                }`}
              >
                All streams
              </button>
              {streams.map((st) => {
                const on = streamFilter.has(st);
                return (
                  <button
                    key={st}
                    onClick={() => toggleStream(st)}
                    className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition inline-flex items-center gap-1.5 ${
                      on ? "text-white border-transparent" : "border-foreground/15 hover:border-foreground/40"
                    }`}
                    style={on ? { background: STREAM_COLORS[st] ?? "#6d28d9" } : undefined}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: STREAM_COLORS[st] ?? "#6d28d9" }} />
                    {st}
                  </button>
                );
              })}
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
              <ResizableChart title="Student Progression — Enrolment across Semesters">
                {() => (
                  <ResponsiveContainer>
                    <LineChart data={progressionData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                      <XAxis dataKey="semLabel" stroke="currentColor" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis stroke="currentColor" tick={{ fontSize: 11 }} width={40} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(27,19,64,0.55)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(109,40,217,0.5)",
                          borderRadius: 12,
                          color: "white",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {progressionLines.map((l) => (
                        <Line
                          key={l.key}
                          type="monotone"
                          dataKey={l.key}
                          stroke={l.color}
                          strokeWidth={2.2}
                          dot={{ r: 3, fill: l.color }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ResizableChart>

              {insights.length > 0 && (
                <div className="card rounded-2xl p-4 sm:p-6">
                  <h2 className="font-bold mb-1">Key Pattern Changes</h2>
                  <p className="text-xs text-foreground/60 mb-3">
                    Largest semester-to-semester attrition — where the line drops hardest.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {insights.map((it, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 rounded-xl border border-foreground/10 px-3 py-2"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: it.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{it.label}</div>
                          <div className="text-xs text-foreground/60">
                            Sem {it.semFrom} → {it.semTo}: {it.from} → {it.to}
                          </div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg ${it.pct >= 30 ? "pct-low" : it.pct >= 15 ? "pct-mid" : "pct-good"}`}>
                          −{it.drop} ({it.pct.toFixed(1)}%)
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ResizableChart title="Session Totals" defaultSize="md">
                {() => (
                  <ResponsiveContainer>
                    <BarChart data={sessionTotals}>
                      <defs>
                        <linearGradient id="sessBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6d28d9" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                      <XAxis dataKey="session" stroke="currentColor" tick={{ fontSize: 11 }} interval={0} />
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
                      <Bar dataKey="total" fill="url(#sessBar)" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ResizableChart>
            </>
          )}

          <div className="card rounded-2xl overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="text-white">
                  <tr>
                    <th className="text-left px-3 py-3 sticky top-0 brand-gradient">Session</th>
                    <th className="text-left px-3 py-3 sticky top-0 brand-gradient">Stream</th>
                    {ROMAN.map((r) => (
                      <th key={r} className="px-3 py-3 sticky top-0 brand-gradient">
                        Sem {r}
                      </th>
                    ))}
                    <th className="px-3 py-3 sticky top-0 brand-gradient">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.flatMap((s, i) =>
                    activeStreams.map((st, j) => {
                      const cells = Array.from({ length: 8 }, (_, k) =>
                        rows.find((r) => r.session === s && r.stream === st && r.semester === k + 1)
                      );
                      const total = cells.reduce((a, c) => a + (c?.count ?? 0), 0);
                      if (total === 0) return null;
                      return (
                        <tr key={`${s}-${st}`} className={(i + j) % 2 ? "bg-foreground/[0.03]" : ""}>
                          <td className="px-3 py-2 font-semibold">{s}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: comboColor(s, st, sessions, streams) }} />
                              {st}
                            </span>
                          </td>
                          {cells.map((c, idx) => (
                            <td key={idx} className="px-3 py-2 text-center">
                              {c ? c.count : <span className="text-foreground/30">—</span>}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-bold brand-gradient-text">{total}</td>
                        </tr>
                      );
                    })
                  )}
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
