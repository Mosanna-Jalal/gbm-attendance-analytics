"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  useXAxisScale,
  useYAxisScale,
  useActiveTooltipCoordinate,
} from "recharts";
import { DEPARTMENTS, MONTHS, SESSIONS, ROMAN, STREAMS, type Faculty, type Stream } from "@/lib/constants";

// Each course in the dropdown maps to one Faculty bucket — picking "B.A"
// keeps only ARTS depts, "BLIS" keeps only the BLIS dept, etc.
const COURSE_TO_FACULTY: Record<Stream, Faculty> = {
  "B.A": "ARTS",
  "B.Sc": "SCIENCE",
  "B.Com": "COMMERCE",
  "BLIS": "BLIS",
};
import ResizableChart, { StackedTick } from "@/app/components/ResizableChart";
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
};

// 22 maximally-distinct colors (based on Trubetskoy's palette + curated adds),
// ordered so adjacent indices land on different hue families.
const DEPT_COLORS = [
  "#e6194b", // 1  crimson
  "#3cb44b", // 2  green
  "#4363d8", // 3  blue
  "#f58231", // 4  orange
  "#911eb4", // 5  purple
  "#42d4f4", // 6  cyan
  "#f032e6", // 7  magenta
  "#bfef45", // 8  lime
  "#fabed4", // 9  pink
  "#469990", // 10 teal
  "#9a6324", // 11 brown
  "#800000", // 12 maroon
  "#aaffc3", // 13 mint
  "#808000", // 14 olive
  "#ffd8b1", // 15 apricot
  "#000075", // 16 navy
  "#dcbeff", // 17 lavender
  "#ff69b4", // 18 hot pink
  "#00bfff", // 19 deep sky blue
  "#8b4513", // 20 saddle brown
  "#7f7f7f", // 21 gray
  "#ffe119", // 22 yellow
];

type View = "all" | "overall" | "custom";
type Display = "chart" | "table";

export default function ClassAttendancePage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState<View>("all");
  const [display, setDisplay] = useState<Display>("chart");
  const [selected, setSelected] = useState<string[]>([]);
  const [sessionFilter, setSessionFilter] = useState<string[]>([]);
  const [semesterFilter, setSemesterFilter] = useState<number[]>([]);
  const [courseFilter, setCourseFilter] = useState<Stream[]>([]);

  // Shared hover state used by the tooltip/overlay to figure out which curve
  // the cursor is actually touching. Updated synchronously from LineChart's
  // onMouseMove. `nearestKey` is computed in NearestCurveLabel (which reads
  // axis scales via Recharts 3.x hooks) and read by the tooltip.
  const hoverRef = useRef<{
    x: number | null;
    y: number | null;
    nearestKey: string | null;
  }>({
    x: null,
    y: null,
    nearestKey: null,
  });

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/attendance", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (d.error) throw new Error(d.error);
          setRows(d.rows);
        })
        .catch((e) => !cancelled && setErr(e.message));
    };
    load();
    // Refetch when the tab regains focus so teachers who just submitted in
    // another tab see the updated chart without a hard reload.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const availableSemesters = useMemo(() => {
    const set = new Set<number>();
    for (const r of rows ?? []) if (typeof r.semester === "number") set.add(r.semester);
    return [...set].sort((a, b) => a - b);
  }, [rows]);

  const allowedFaculties = useMemo(
    () => new Set(courseFilter.map((c) => COURSE_TO_FACULTY[c])),
    [courseFilter]
  );

  const filteredRows = useMemo(
    () =>
      (rows ?? []).filter(
        (r) =>
          (!sessionFilter.length || sessionFilter.includes(r.session)) &&
          (!semesterFilter.length || semesterFilter.includes(r.semester)) &&
          (!courseFilter.length || allowedFaculties.has(r.faculty as Faculty))
      ),
    [rows, sessionFilter, semesterFilter, courseFilter, allowedFaculties]
  );

  const monthLabels = MONTHS.map(
    (m) => m.label.split(" ")[0].slice(0, 3) + " " + m.label.split(" ")[1].slice(2)
  );

  // Chart data: per-month, one field per department (avg %).
  const chartData = useMemo(() => {
    return MONTHS.map((m, i) => {
      const row: Record<string, string | number | null> = { month: monthLabels[i] };
      const allMonthPts = filteredRows.filter((r) => r.monthKey === m.key);
      row._overall = allMonthPts.length
        ? Number((allMonthPts.reduce((s, r) => s + r.percentage, 0) / allMonthPts.length).toFixed(2))
        : null;
      for (const d of DEPARTMENTS) {
        const pts = filteredRows.filter((r) => r.department === d.name && r.monthKey === m.key);
        row[d.name] = pts.length
          ? Number((pts.reduce((s, r) => s + r.percentage, 0) / pts.length).toFixed(2))
          : null;
      }
      return row;
    });
  }, [filteredRows, monthLabels]);

  // Dept-level average for bar ranking
  const deptAvg = useMemo(() => {
    return DEPARTMENTS.map((d) => {
      const pts = filteredRows.filter((r) => r.department === d.name);
      const avg = pts.length ? pts.reduce((s, r) => s + r.percentage, 0) / pts.length : 0;
      return { department: d.name, avg: Number(avg.toFixed(2)), count: pts.length };
    })
      .filter((x) => x.count > 0)
      .sort((a, b) => b.avg - a.avg);
  }, [filteredRows]);

  const overallAvg = useMemo(() => {
    if (!filteredRows.length) return 0;
    return filteredRows.reduce((s, r) => s + r.percentage, 0) / filteredRows.length;
  }, [filteredRows]);

  const shownDepts = useMemo(() => {
    if (view === "all") {
      return DEPARTMENTS
        .filter((d) => courseFilter.length === 0 || allowedFaculties.has(d.faculty))
        .map((d) => d.name);
    }
    if (view === "custom") return selected;
    return [];
  }, [view, selected, courseFilter.length, allowedFaculties]);

  const matrix = useMemo(() => {
    if (!filteredRows) return null;
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of filteredRows) {
      const key = `${r.department}__${r.monthKey}`;
      const cur = map.get(key) ?? { sum: 0, count: 0 };
      cur.sum += r.percentage;
      cur.count += 1;
      map.set(key, cur);
    }
    return map;
  }, [filteredRows]);

  function toggle(v: string) {
    setSelected((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  }
  function toggleSession(v: string) {
    setSessionFilter((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  }
  function toggleSemester(v: number) {
    setSemesterFilter((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  }
  function toggleCourse(v: Stream) {
    setCourseFilter((arr) => {
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
      // Drop any custom-picked dept that no longer matches the new course set.
      if (next.length > 0) {
        const allowed = new Set(next.map((c) => COURSE_TO_FACULTY[c]));
        setSelected((picked) =>
          picked.filter((name) => {
            const meta = DEPARTMENTS.find((d) => d.name === name);
            return meta && allowed.has(meta.faculty);
          })
        );
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {err && <div className="pct-low rounded-lg px-3 py-2 text-sm">{err}</div>}
      {!rows && !err && <div className="text-foreground/60">Loading…</div>}

      {rows && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Overall Avg" value={`${overallAvg.toFixed(1)}%`} sub={`${filteredRows.length} submissions`} />
            <Stat label="Best Dept" value={deptAvg[0] ? `${deptAvg[0].avg.toFixed(1)}%` : "—"} sub={deptAvg[0]?.department} />
            <Stat label="Needs Attention" value={deptAvg.at(-1) ? `${deptAvg.at(-1)!.avg.toFixed(1)}%` : "—"} sub={deptAvg.at(-1)?.department} />
          </div>

          {/* View switcher + session filter */}
          <div className="card rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold">Display:</span>
              <div className="inline-flex rounded-xl border border-foreground/15 p-1 bg-foreground/[0.03]">
                {([
                  ["chart", "📊 Chart"],
                  ["table", "🗒 Table"],
                ] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setDisplay(v)}
                    className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition ${
                      display === v
                        ? "brand-gradient text-white shadow-md shadow-indigo-500/30"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold mr-1">View:</span>
              {([
                ["all", `All ${DEPARTMENTS.length} Departments`],
                ["overall", "Overall Average"],
                ["custom", "Custom Selection"],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => {
                    if (v === view) return;
                    setView(v);
                    // Switching views resets every sub-filter so each view
                    // starts from a clean slate — the session/semester picks
                    // from the previous view shouldn't silently apply here.
                    setSelected([]);
                    setSessionFilter([]);
                    setSemesterFilter([]);
                    setCourseFilter([]);
                  }}
                  className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition ${
                    view === v ? "brand-gradient text-white border-transparent" : "border-foreground/15 hover:border-foreground/40"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-sm font-semibold">Sessions:</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SESSIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSession(s)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        sessionFilter.includes(s)
                          ? "brand-gradient text-white border-transparent"
                          : "border-foreground/15 hover:border-foreground/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  {sessionFilter.length > 0 && (
                    <button onClick={() => setSessionFilter([])} className="text-xs text-indigo-500 hover:underline ml-1">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-sm font-semibold">Semesters:</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(availableSemesters.length ? availableSemesters : [1, 2, 3, 4, 5, 6, 7, 8]).map((n) => (
                    <button
                      key={n}
                      onClick={() => toggleSemester(n)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        semesterFilter.includes(n)
                          ? "brand-gradient text-white border-transparent"
                          : "border-foreground/15 hover:border-foreground/40"
                      }`}
                    >
                      Sem {ROMAN[n - 1] ?? n}
                    </button>
                  ))}
                  {semesterFilter.length > 0 && (
                    <button onClick={() => setSemesterFilter([])} className="text-xs text-indigo-500 hover:underline ml-1">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <span className="text-sm font-semibold">Courses:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {STREAMS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCourse(c)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${
                      courseFilter.includes(c)
                        ? "brand-gradient text-white border-transparent"
                        : "border-foreground/15 hover:border-foreground/40"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                {courseFilter.length > 0 && (
                  <button onClick={() => setCourseFilter([])} className="text-xs text-indigo-500 hover:underline ml-1">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {view === "custom" && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Departments ({selected.length}):</span>
                  {selected.length > 0 && (
                    <button onClick={() => setSelected([])} className="text-xs text-indigo-500 hover:underline">
                      Clear
                    </button>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {DEPARTMENTS.filter(
                    (d) => courseFilter.length === 0 || allowedFaculties.has(d.faculty)
                  ).map((d) => (
                    <button
                      key={d.name}
                      onClick={() => toggle(d.name)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        selected.includes(d.name) ? "brand-gradient text-white border-transparent" : "border-foreground/15 hover:border-foreground/40"
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {display === "chart" && (<>
          {/* Main multi-line chart */}
          <ResizableChart
            title={
              view === "all"
                ? "All Departments — Monthly Trend"
                : view === "overall"
                  ? "Overall Average Attendance"
                  : `Selected Departments (${shownDepts.length})`
            }
          >
            {() => (
              <ResponsiveContainer>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  onMouseMove={(state: unknown) => {
                    const s = state as {
                      chartX?: number;
                      chartY?: number;
                      activeCoordinate?: { x?: number; y?: number };
                    } | null;
                    const x = s?.chartX ?? s?.activeCoordinate?.x;
                    const y = s?.chartY ?? s?.activeCoordinate?.y;
                    hoverRef.current.x = typeof x === "number" ? x : null;
                    hoverRef.current.y = typeof y === "number" ? y : null;
                  }}
                  onMouseLeave={() => {
                    hoverRef.current.x = null;
                    hoverRef.current.y = null;
                    hoverRef.current.nearestKey = null;
                  }}
                >
                  <defs>
                    <linearGradient id="overallGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6d28d9" />
                      <stop offset="50%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.2)" />
                  <XAxis dataKey="month" stroke="currentColor" tick={<StackedTick fontSize={10} />} interval={0} height={40} />
                  <YAxis domain={[0, 100]} stroke="currentColor" tick={{ fontSize: 11 }} width={36} />
                  {/* Rendered before Tooltip so the tooltip reads a fresh
                      `nearestKey` in the same render pass. */}
                  <NearestCurveLabel
                    hoverRef={hoverRef}
                    shownDepts={shownDepts}
                    chartData={chartData}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.3)", strokeWidth: 1 }}
                    wrapperStyle={{ outline: "none" }}
                    content={<AttendanceTooltip hoverRef={hoverRef} />}
                  />
                  <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Target 75%", fill: "#10b981", fontSize: 11 }} />

                  {view === "overall" ? (
                    <Line
                      type="monotone"
                      dataKey="_overall"
                      name="Overall Avg"
                      stroke="url(#overallGrad)"
                      strokeWidth={3.5}
                      dot={{ r: 5, fill: "#6d28d9" }}
                      activeDot={{ r: 7 }}
                      connectNulls
                    />
                  ) : (
                    <>
                      {shownDepts.map((dept) => (
                        <Line
                          key={dept}
                          type="monotone"
                          dataKey={dept}
                          stroke={DEPT_COLORS[DEPARTMENTS.findIndex((d) => d.name === dept) % DEPT_COLORS.length]}
                          strokeWidth={view === "all" ? 1.5 : 2.5}
                          dot={view === "all" ? false : { r: 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))}
                      {view === "custom" && selected.length > 0 && (
                        <Line
                          type="monotone"
                          dataKey="_overall"
                          name="Overall Avg"
                          stroke="#6d28d9"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          dot={false}
                          connectNulls
                        />
                      )}
                    </>
                  )}
                  {(view === "custom" && selected.length <= 6) || view === "overall" ? <Legend /> : null}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ResizableChart>

          {view === "all" && (
            <div className="card rounded-2xl p-4 sm:p-5 flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
              {DEPARTMENTS.map((d, i) => {
                if (courseFilter.length > 0 && !allowedFaculties.has(d.faculty)) return null;
                return (
                  <span key={d.name} className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }}
                    />
                    <span className="text-foreground/80">{d.name}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Dept ranking */}
          <div className="card-chart rounded-2xl p-4 sm:p-6">
            <h2 className="font-bold mb-3">Department Ranking</h2>

            {/* Mobile: compact ranked list */}
            <ul className="sm:hidden flex flex-col gap-2">
              {deptAvg.map((d, i) => {
                const idx = DEPARTMENTS.findIndex((x) => x.name === d.department);
                const color = DEPT_COLORS[idx % DEPT_COLORS.length];
                return (
                  <li key={d.department} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground/50 w-6 shrink-0 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold truncate">{d.department}</span>
                        <span className="text-xs font-bold whitespace-nowrap" style={{ color }}>{d.avg}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, d.avg)}%`, background: color }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop / tablet: horizontal bar chart */}
            <div className="hidden sm:block w-full" style={{ height: Math.max(260, deptAvg.length * 32 + 40) }}>
              <ResponsiveContainer>
                <BarChart data={deptAvg} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
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
                    itemStyle={{ color: "#ffffff" }}
                    labelStyle={{ color: "#ffffff" }}
                    formatter={(v: unknown) => `${v}%`}
                  />
                  <Bar dataKey="avg" radius={[0, 8, 8, 0]}>
                    {deptAvg.map((d) => {
                      const idx = DEPARTMENTS.findIndex((x) => x.name === d.department);
                      return <Cell key={d.department} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </>)}

          {display === "table" && (
            <div className="card rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-foreground/10 flex items-center justify-between">
                <h2 className="font-bold">Department Ranking</h2>
                <span className="text-xs text-foreground/60">{deptAvg.length} departments reporting</span>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead className="text-white">
                    <tr>
                      <th className="text-left px-3 py-3 sticky top-0 brand-gradient w-12">#</th>
                      <th className="text-left px-3 py-3 sticky top-0 brand-gradient">Department</th>
                      <th className="text-left px-3 py-3 sticky top-0 brand-gradient">Faculty</th>
                      <th className="text-right px-3 py-3 sticky top-0 brand-gradient">Submissions</th>
                      <th className="text-right px-3 py-3 sticky top-0 brand-gradient">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptAvg.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-foreground/60">
                          No data for the selected filters.
                        </td>
                      </tr>
                    )}
                    {deptAvg.map((d, i) => {
                      const meta = DEPARTMENTS.find((x) => x.name === d.department);
                      return (
                        <tr key={d.department} className={i % 2 ? "bg-foreground/[0.03]" : ""}>
                          <td className="px-3 py-2 text-foreground/60 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-semibold">{d.department}</td>
                          <td className="px-3 py-2 text-foreground/70">{meta?.faculty ?? "—"}</td>
                          <td className="px-3 py-2 text-right">{d.count}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`inline-block min-w-[64px] px-2 py-1 rounded-lg font-bold ${pctClass(d.avg)}`}>
                              {d.avg.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Matrix */}
          {matrix && (
            <div className="card rounded-2xl overflow-hidden">
              <div className="overflow-auto max-h-[70vh] relative">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead className="text-white">
                    <tr>
                      <th className="text-left px-3 py-3 sticky top-0 left-0 z-30 brand-gradient">Department</th>
                      {MONTHS.map((m) => (
                        <th key={m.key} className="px-3 py-3 font-semibold whitespace-nowrap sticky top-0 z-20 brand-gradient">
                          {m.label.split(" ")[0].slice(0, 3)} {m.label.split(" ")[1].slice(2)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEPARTMENTS.filter(
                      (d) => courseFilter.length === 0 || allowedFaculties.has(d.faculty)
                    ).map((d, i) => (
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
                            return <td key={m.key} className="px-2 py-2 text-center text-foreground/30">—</td>;
                          const avg = cell.sum / cell.count;
                          return (
                            <td key={m.key} className="px-2 py-2 text-center">
                              <span className={`inline-block min-w-[56px] px-2 py-1 rounded-lg font-semibold ${pctClass(avg)}`}>
                                {avg.toFixed(1)}%
                              </span>
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
        </>
      )}
    </div>
  );
}

type TooltipItem = { dataKey?: string | number; name?: string; value?: number | string | null; color?: string };

type HoverRef = {
  current: {
    x: number | null;
    y: number | null;
    nearestKey: string | null;
  };
};

// Ref is intentionally read during render: Recharts re-renders the tooltip and
// overlay on every mousemove, so we pick up the latest hover state without
// triggering React re-renders ourselves.
/* eslint-disable react-hooks/refs */
function AttendanceTooltip({
  active,
  payload,
  label,
  hoverRef,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
  hoverRef?: HoverRef;
}) {
  if (!active || !payload?.length) return null;

  const items = payload
    .filter((p) => p.value != null && !String(p.dataKey ?? "").startsWith("_"))
    .map((p) => ({ ...p, value: Number(p.value) }));

  const overall = payload.find((p) => String(p.dataKey) === "_overall" && p.value != null);

  // The Customized overlay does pixel-interpolated nearest detection using the
  // axis scales — trust its answer.
  const nearestKey: string | number | null = hoverRef?.current?.nearestKey ?? null;

  const nearest = nearestKey != null ? items.find((i) => i.dataKey === nearestKey) : null;
  const rest = nearest
    ? items.filter((i) => i.dataKey !== nearestKey).sort((a, b) => (b.value as number) - (a.value as number))
    : items.slice().sort((a, b) => (b.value as number) - (a.value as number));

  const MAX_REST = nearest ? 4 : 8;
  const shown = rest.slice(0, MAX_REST);
  const hidden = rest.length - shown.length;

  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-xl"
      style={{
        background: "rgba(27,19,64,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(167,139,250,0.45)",
        color: "white",
        minWidth: 180,
        maxWidth: 260,
        pointerEvents: "none",
      }}
    >
      <div className="font-semibold mb-1 opacity-90">{label}</div>

      {nearest && (
        <div
          className="flex items-center gap-2 px-2 py-1.5 -mx-1 mb-1 rounded-lg"
          style={{
            background: `color-mix(in oklab, ${nearest.color} 20%, transparent)`,
            border: `1.5px solid ${nearest.color}`,
            boxShadow: `0 0 0 1px ${nearest.color}33`,
          }}
        >
          <span className="font-bold shrink-0" style={{ color: nearest.color }}>▶</span>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: nearest.color }} />
          <span className="font-bold truncate">{nearest.name}</span>
          <span className="ml-auto font-extrabold" style={{ color: "#ffffff" }}>
            {(nearest.value as number).toFixed(1)}%
          </span>
        </div>
      )}

      {overall && (
        <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-white/10">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#ec4899" }} />
          <span className="opacity-80">Overall Avg</span>
          <span className="ml-auto font-bold">{Number(overall.value).toFixed(1)}%</span>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {shown.length === 0 && !overall && !nearest && <div className="opacity-60">No data</div>}
        {shown.map((it) => (
          <div key={String(it.dataKey)} className="flex items-center gap-1.5 whitespace-nowrap opacity-70">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: it.color }} />
            <span className="truncate">{it.name}</span>
            <span className="ml-auto font-semibold">{(it.value as number).toFixed(1)}%</span>
          </div>
        ))}
        {hidden > 0 && <div className="opacity-60 pt-1 text-[0.7rem]">+ {hidden} more department{hidden === 1 ? "" : "s"}</div>}
      </div>
    </div>
  );
}

// Floats a small labeled arrow at the cursor pointing to the curve whose
// interpolated pixel Y at the actual cursor X is nearest. Uses Recharts 3.x
// hooks (useXAxisScale/useYAxisScale/useIsTooltipActive) — the deprecated
// Customized wrapper does not forward xAxisMap/yAxisMap as props.
function NearestCurveLabel({
  hoverRef,
  shownDepts,
  chartData,
}: {
  hoverRef: HoverRef;
  shownDepts: string[];
  chartData: Record<string, string | number | null>[];
}) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  // Subscribing to the tooltip coordinate makes this component re-render on
  // every mousemove (the selector returns a new object per interaction update).
  // `useIsTooltipActive` only flips on enter/leave, so it can't drive live
  // mouse tracking by itself. We read the raw cursor X/Y from hoverRef because
  // the tooltip's own coordinate.x is snapped to the nearest tick in LineChart.
  const active = useActiveTooltipCoordinate();

  const cursorX = hoverRef.current.x;
  const cursorY = hoverRef.current.y;

  if (!active || !xScale || !yScale || cursorX == null || cursorY == null) {
    hoverRef.current.nearestKey = null;
    return null;
  }

  // Each tick's pixel X — used to pick the segment around the cursor.
  const tickPx: number[] = [];
  for (const r of chartData) {
    const px = xScale(r.month as string);
    if (px == null || !Number.isFinite(px)) return null;
    tickPx.push(px);
  }
  if (tickPx.length === 0) return null;
  const firstPx = tickPx[0]!;
  const lastPx = tickPx[tickPx.length - 1]!;

  // Segment [lo, hi] surrounding cursorX.
  let lo = 0;
  let hi = 0;
  if (cursorX < firstPx) {
    lo = 0; hi = 0;
  } else if (cursorX > lastPx) {
    lo = tickPx.length - 1; hi = tickPx.length - 1;
  } else {
    for (let i = 0; i < tickPx.length - 1; i++) {
      if (cursorX >= tickPx[i]! && cursorX <= tickPx[i + 1]!) {
        lo = i; hi = i + 1;
        break;
      }
    }
  }

  const loPx = tickPx[lo]!;
  const hiPx = tickPx[hi]!;
  const segLen = hiPx - loPx;
  const t = segLen > 0 ? (cursorX - loPx) / segLen : 0;

  let nearest: { name: string; value: number; x: number; y: number; color: string } | null = null;
  let best = Infinity;

  for (const dept of shownDepts) {
    const loRaw = chartData[lo]?.[dept];
    const hiRaw = chartData[hi]?.[dept];
    let vAt: number | null = null;
    if (loRaw != null && hiRaw != null) vAt = Number(loRaw) + (Number(hiRaw) - Number(loRaw)) * t;
    else if (loRaw != null) vAt = Number(loRaw);
    else if (hiRaw != null) vAt = Number(hiRaw);
    if (vAt == null) continue;

    const yPxInterp = yScale(vAt);
    if (yPxInterp == null || !Number.isFinite(yPxInterp)) continue;
    const d = Math.abs(yPxInterp - cursorY);
    if (d < best) {
      best = d;
      // Snap the marker to the nearer actual data point on this curve.
      const snapIdx = t < 0.5 ? lo : hi;
      const snapRaw = chartData[snapIdx]?.[dept] ?? chartData[lo]?.[dept] ?? chartData[hi]?.[dept];
      const snapV = snapRaw != null ? Number(snapRaw) : vAt;
      const snapX = tickPx[snapIdx];
      const snapY = yScale(snapV);
      if (snapX == null || snapY == null) continue;
      nearest = {
        name: dept,
        value: snapV,
        x: snapX,
        y: snapY,
        color: DEPT_COLORS[DEPARTMENTS.findIndex((dd) => dd.name === dept) % DEPT_COLORS.length],
      };
    }
  }

  if (!nearest) {
    hoverRef.current.nearestKey = null;
    return null;
  }

  hoverRef.current.nearestKey = nearest.name;

  const text = nearest.name;
  const approxW = Math.min(text.length * 6.8 + 24, 200);
  // Flip the pill left if it would run past the last tick.
  const placeRight = nearest.x + approxW + 14 < lastPx + 20;
  const pillX = placeRight ? nearest.x + 10 : nearest.x - approxW - 10;
  const pillY = nearest.y - 12;
  const arrowFromX = placeRight ? pillX : pillX + approxW;

  return (
    <g pointerEvents="none">
      <line
        x1={nearest.x}
        y1={nearest.y}
        x2={arrowFromX}
        y2={nearest.y}
        stroke={nearest.color}
        strokeWidth={1.25}
      />
      <circle cx={nearest.x} cy={nearest.y} r={4} fill={nearest.color} stroke="white" strokeWidth={1.5} />
      <rect
        x={pillX}
        y={pillY}
        width={approxW}
        height={22}
        rx={11}
        fill="rgba(27,19,64,0.92)"
        stroke={nearest.color}
        strokeWidth={1.25}
      />
      <text
        x={pillX + 10}
        y={pillY + 15}
        fill="white"
        fontSize={11}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
}

/* eslint-enable react-hooks/refs */

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wide text-foreground/60">{label}</div>
      <div className="text-2xl sm:text-3xl font-extrabold brand-gradient-text mt-1">{value}</div>
      {sub && <div className="text-xs text-foreground/60 mt-1 truncate">{sub}</div>}
    </div>
  );
}
