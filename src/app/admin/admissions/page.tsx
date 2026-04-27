"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ROMAN,
  SESSION_DURATION_SEMS,
  streamsForSession,
  sessionsForStream,
  type Session,
  type Stream,
} from "@/lib/constants";

type Row = {
  _id: string;
  session: string;
  stream: string;
  semester: number;
  count: number;
};

export default function AdmissionsFeedPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");

  const [session, setSession] = useState<Session | "">("");
  const [stream, setStream] = useState<Stream | "">("");
  const [semester, setSemester] = useState<number | "">("");
  const [count, setCount] = useState("");

  const [msg, setMsg] = useState<null | { ok: boolean; text: string }>(null);
  const [saving, setSaving] = useState(false);

  // Cross-rule: 2025-26 is the BLIS-only session, BLIS is the 2025-26-only
  // stream. Filter each dropdown so the user can never construct a bad pair.
  const availableStreams = useMemo(() => streamsForSession(session), [session]);
  const availableSessions = useMemo(() => sessionsForStream(stream), [stream]);
  // Cap the semester dropdown to the chosen session's duration (BLIS = 2).
  const maxSemForSession = session ? SESSION_DURATION_SEMS[session as Session] : 8;

  function onSessionChange(v: Session | "") {
    setSession(v);
    if (v && stream && !streamsForSession(v).includes(stream)) setStream("");
    if (v && semester && Number(semester) > SESSION_DURATION_SEMS[v]) setSemester("");
  }
  function onStreamChange(v: Stream | "") {
    setStream(v);
    if (v && session && !sessionsForStream(v).includes(session)) setSession("");
  }

  async function load() {
    setErr("");
    try {
      const res = await fetch("/api/admission", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRows(data.rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!session || !stream || !semester || !count) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          stream,
          semester: Number(semester),
          count: Number(count),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMsg({ ok: true, text: "✓ Saved (existing row for this session/stream/sem is overwritten)" });
      setCount("");
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Row) {
    if (!confirm(`Delete admission row for ${r.session} · ${r.stream} · Sem ${ROMAN[r.semester - 1] ?? r.semester}?`)) return;
    try {
      const res = await fetch("/api/admission", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: r.session, stream: r.stream, semester: r.semester }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold brand-gradient-text">Admissions — Feed Data</h1>
          <p className="text-foreground/70 text-sm">Add or update admission counts per session, stream and semester.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/dashboard"
            className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 text-sm font-semibold"
          >
            ← Dashboard
          </a>
          <a
            href="/analytics/admissions"
            className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 text-sm font-semibold"
          >
            View Analytics →
          </a>
        </div>
      </div>

      {err && <div className="mt-4 pct-low rounded-lg px-3 py-2 text-sm">{err}</div>}

      <form onSubmit={save} className="mt-6 card rounded-2xl p-5 sm:p-6 grid gap-4 sm:grid-cols-4">
        <div>
          <label className="text-sm font-semibold">Session</label>
          <select
            className="input mt-1"
            required
            value={session}
            onChange={(e) => onSessionChange(e.target.value as Session | "")}
          >
            <option value="">— Select session —</option>
            {availableSessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">Stream</label>
          <select
            className="input mt-1"
            required
            value={stream}
            onChange={(e) => onStreamChange(e.target.value as Stream | "")}
          >
            <option value="">— Select stream —</option>
            {availableStreams.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">Semester</label>
          <select
            className="input mt-1"
            required
            value={semester === "" ? "" : String(semester)}
            onChange={(e) => setSemester(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">— Select semester —</option>
            {ROMAN.slice(0, maxSemForSession).map((r, i) => (
              <option key={r} value={i + 1}>
                Sem {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">Student count</label>
          <input
            className="input mt-1"
            type="number"
            min={0}
            step="1"
            required
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="e.g. 120"
          />
        </div>

        <div className="sm:col-span-4 flex items-center gap-3">
          <button className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {msg && (
            <span className={`text-sm rounded-lg px-3 py-2 ${msg.ok ? "pct-good" : "pct-low"}`}>
              {msg.text}
            </span>
          )}
        </div>
      </form>

      <div className="mt-6 card rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-foreground/10 flex items-center justify-between">
          <h2 className="font-bold">Existing rows ({rows?.length ?? 0})</h2>
          <button onClick={load} className="text-xs text-indigo-500 hover:underline">
            Refresh
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="text-white">
              <tr>
                <th className="text-left px-3 py-3 sticky top-0 brand-gradient">Session</th>
                <th className="text-left px-3 py-3 sticky top-0 brand-gradient">Stream</th>
                <th className="text-left px-3 py-3 sticky top-0 brand-gradient">Semester</th>
                <th className="text-right px-3 py-3 sticky top-0 brand-gradient">Count</th>
                <th className="px-3 py-3 sticky top-0 brand-gradient" />
              </tr>
            </thead>
            <tbody>
              {!rows && <tr><td colSpan={5} className="px-3 py-6 text-center text-foreground/60">Loading…</td></tr>}
              {rows?.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-foreground/60">No rows yet.</td></tr>}
              {rows?.map((r, i) => (
                <tr key={r._id} className={i % 2 ? "bg-foreground/[0.03]" : ""}>
                  <td className="px-3 py-2 font-semibold">{r.session}</td>
                  <td className="px-3 py-2">{r.stream}</td>
                  <td className="px-3 py-2">Sem {ROMAN[r.semester - 1] ?? r.semester}</td>
                  <td className="px-3 py-2 text-right font-bold">{r.count}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => remove(r)}
                      className="text-xs text-red-500 hover:underline"
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
    </div>
  );
}
