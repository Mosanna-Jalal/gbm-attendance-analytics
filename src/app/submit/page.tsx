"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEPARTMENTS,
  SESSIONS,
  MONTHS,
  ROMAN,
  computeSemester,
  sessionFromSemesterMonth,
  type Session,
  type MonthKey,
} from "@/lib/constants";

const IDENTITY_KEY = "gbm-attendance:identity";

type Identity = { teacherName: string; department: string };

type LastSubmitted = {
  teacherName: string;
  department: string;
  faculty: string;
  session: string;
  semester: string;
  monthLabel: string;
  percentage: number;
  distinctionStudents: string[];
  at: string;
};

export default function SubmitPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [identityReady, setIdentityReady] = useState(false);

  // Step-1 local inputs
  const [nameInput, setNameInput] = useState("");
  const [deptInput, setDeptInput] = useState("");

  // Step-2 inputs
  const [session, setSession] = useState<Session | "">("");
  const [monthKey, setMonthKey] = useState<MonthKey | "">("");
  const [semester, setSemester] = useState<number | "">("");
  const [percentage, setPercentage] = useState("");
  const [distinctionRaw, setDistinctionRaw] = useState("");

  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [loading, setLoading] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<LastSubmitted | null>(null);

  // Load identity from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(IDENTITY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Identity;
        if (parsed?.teacherName && parsed?.department) setIdentity(parsed);
      }
    } catch {}
    setIdentityReady(true);
  }, []);

  function onSessionChange(v: Session | "") {
    setSession(v);
    if (v && monthKey) setSemester(computeSemester(v as Session, monthKey as MonthKey));
  }
  function onMonthChange(v: MonthKey | "") {
    setMonthKey(v);
    if (!v) return;
    if (session) {
      setSemester(computeSemester(session as Session, v as MonthKey));
    } else if (semester) {
      const s = sessionFromSemesterMonth(semester as number, v as MonthKey);
      if (s) setSession(s);
    }
  }
  function onSemesterChange(raw: string) {
    const n = raw ? Number(raw) : "";
    setSemester(n);
    if (n && monthKey) {
      const s = sessionFromSemesterMonth(n, monthKey as MonthKey);
      setSession(s ?? "");
    }
  }

  const distinctionStudents = useMemo(
    () =>
      distinctionRaw
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [distinctionRaw]
  );

  function saveIdentity(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name || !deptInput) return;
    const next = { teacherName: name, department: deptInput };
    setIdentity(next);
    try {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
    } catch {}
  }

  function clearIdentity() {
    if (!confirm("Switch teacher? The current identity will be cleared so the next entry is saved under a new name & department.")) return;
    setIdentity(null);
    setNameInput("");
    setDeptInput("");
    setLastSubmitted(null);
    setStatus(null);
    try {
      localStorage.removeItem(IDENTITY_KEY);
    } catch {}
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identity) return;
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherName: identity.teacherName,
          department: identity.department,
          session,
          monthKey,
          percentage: Number(percentage),
          distinctionStudents,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");

      const dept = DEPARTMENTS.find((d) => d.name === identity.department);
      const monthLabel = MONTHS.find((m) => m.key === monthKey)?.label ?? String(monthKey);
      setLastSubmitted({
        teacherName: identity.teacherName,
        department: identity.department,
        faculty: dept?.faculty ?? "",
        session: String(session),
        semester: semester ? (ROMAN[(semester as number) - 1] ?? String(semester)) : "",
        monthLabel,
        percentage: Number(percentage),
        distinctionStudents: [...distinctionStudents],
        at: new Date().toLocaleString(),
      });
      setStatus({ ok: true, msg: "✓ Attendance submitted. Thank you!" });

      // Only clear the per-submission fields. Keep identity so teacher can submit more.
      setSession("");
      setMonthKey("");
      setSemester("");
      setPercentage("");
      setDistinctionRaw("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setStatus({ ok: false, msg });
    } finally {
      setLoading(false);
    }
  }

  if (!identityReady) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card rounded-2xl p-6">Loading…</div>
      </div>
    );
  }

  // STEP 1 — identity capture
  if (!identity) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold">
          <span className="brand-gradient-text">Welcome</span>
        </h1>
        <p className="text-foreground/70 text-sm mt-1">
          Enter your name and department once. After this you&apos;ll just fill in the monthly figures.
        </p>

        <form onSubmit={saveIdentity} className="card rounded-2xl p-5 sm:p-7 mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold">Teacher name</label>
            <input
              className="input mt-1"
              required
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Dr. Full Name"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Department</label>
            <select
              className="input mt-1"
              required
              value={deptInput}
              onChange={(e) => setDeptInput(e.target.value)}
            >
              <option value="">— Select department —</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.faculty})
                </option>
              ))}
            </select>
          </div>

          <button className="btn-primary self-start" disabled={!nameInput.trim() || !deptInput}>
            Continue →
          </button>
        </form>
      </div>
    );
  }

  // STEP 2 — per-month submission
  const dept = DEPARTMENTS.find((d) => d.name === identity.department);

  return (
    <div className={lastSubmitted ? "max-w-6xl mx-auto" : "max-w-2xl mx-auto"}>
      <div className="card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-2 border-amber-400/60 bg-amber-400/5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 items-center justify-center text-lg font-bold shrink-0">!</span>
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-500 font-bold">Signed in as — verify before submitting</div>
            <div className="font-bold text-base">{identity.teacherName}</div>
            <div className="text-sm text-foreground/70">
              {identity.department} {dept?.faculty ? `· ${dept.faculty}` : ""}
            </div>
            <div className="text-xs text-amber-500/90 mt-1">
              Not you? Click <strong>Change teacher</strong> — otherwise this entry will be saved under the name above.
            </div>
          </div>
        </div>
        <button
          onClick={clearIdentity}
          className="relative px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold shadow-lg hover:bg-amber-600 active:scale-95 transition animate-pulse-glow inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 11-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Change teacher
        </button>
      </div>

      <div className={`mt-6 grid gap-6 ${lastSubmitted ? "lg:grid-cols-[minmax(0,1fr)_380px] items-start" : ""}`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">
            <span className="brand-gradient-text">Submit Attendance</span>
          </h1>
          <p className="text-foreground/70 text-sm mt-1">
            Semester is auto-computed from session and month — no need to remember the Jan-2026 rollover.
          </p>

          <form onSubmit={onSubmit} className="card rounded-2xl p-5 sm:p-7 mt-6 flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Month</label>
            <select
              className="input mt-1"
              required
              value={monthKey}
              onChange={(e) => onMonthChange(e.target.value as MonthKey | "")}
            >
              <option value="">— Select month —</option>
              {MONTHS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Session (admission batch)</label>
            <select
              className="input mt-1"
              required
              value={session}
              onChange={(e) => onSessionChange(e.target.value as Session | "")}
            >
              <option value="">— Select session —</option>
              {SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Semester</label>
            <select
              className="input mt-1"
              required
              value={semester === "" ? "" : String(semester)}
              onChange={(e) => onSemesterChange(e.target.value)}
            >
              <option value="">— Select semester —</option>
              {ROMAN.map((r, i) => (
                <option key={r} value={i + 1}>
                  Sem {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">
              Attendance % <span className="font-normal text-foreground/60">(0 – 100)</span>
            </label>
            <input
              className="input mt-1"
              type="number"
              min={0}
              max={100}
              step="0.01"
              required
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder="e.g. 78.5"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-foreground/60">
          Pick any two of Month / Session / Semester — the third fills in automatically. If your department has
          multiple teachers, enter the <strong>combined</strong> percentage.
        </p>

        <div>
          <label className="text-sm font-semibold">
            Distinction students <span className="font-normal text-foreground/60">(attendance ≥ 85%, optional)</span>
          </label>
          <textarea
            className="input mt-1 min-h-[90px]"
            value={distinctionRaw}
            onChange={(e) => setDistinctionRaw(e.target.value)}
            placeholder="Enter student names — one per line, or separated by commas"
          />
          {distinctionStudents.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {distinctionStudents.map((s, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs rounded-full pct-great border border-indigo-300/40"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <button className="btn-primary self-start" disabled={loading}>
          {loading ? "Submitting…" : "Submit Attendance"}
        </button>

        {status && (
          <div className={`text-sm rounded-lg px-3 py-2 ${status.ok ? "pct-good" : "pct-low"}`}>
            {status.msg}
          </div>
        )}
        </form>
        </div>

        {lastSubmitted && (
          <aside className="rounded-2xl p-5 sm:p-6 lg:sticky lg:top-24 border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 shadow-lg shadow-emerald-500/10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold inline-flex items-center gap-2">
                <span className="inline-flex w-6 h-6 rounded-full bg-emerald-500 text-white items-center justify-center text-xs">✓</span>
                <span className="text-emerald-600 dark:text-emerald-400">Last submitted</span>
              </h2>
              <span className="text-xs text-foreground/60">{lastSubmitted.at}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row label="Teacher" value={lastSubmitted.teacherName} />
              <Row label="Department" value={`${lastSubmitted.department} (${lastSubmitted.faculty})`} />
              <Row label="Session" value={lastSubmitted.session} />
              <Row label="Month" value={lastSubmitted.monthLabel} />
              <Row label="Semester" value={lastSubmitted.semester} />
              <div>
                <div className="text-foreground/60 text-xs">Attendance</div>
                <div className="mt-0.5">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md font-bold ${
                      lastSubmitted.percentage < 50
                        ? "pct-low"
                        : lastSubmitted.percentage < 75
                          ? "pct-mid"
                          : lastSubmitted.percentage < 85
                            ? "pct-good"
                            : "pct-great"
                    }`}
                  >
                    {lastSubmitted.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {lastSubmitted.distinctionStudents.length > 0 && (
              <div className="mt-4">
                <div className="text-foreground/60 text-xs mb-1.5">
                  Distinction students ({lastSubmitted.distinctionStudents.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lastSubmitted.distinctionStudents.map((s, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs rounded-full pct-great border border-indigo-300/40"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-foreground/60 text-xs">{label}</div>
      <div className="font-semibold mt-0.5">{value || "—"}</div>
    </div>
  );
}
