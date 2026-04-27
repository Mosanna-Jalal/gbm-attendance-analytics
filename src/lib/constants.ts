export type Faculty = "ARTS" | "SCIENCE" | "COMMERCE" | "BLIS";

export const DEPARTMENTS: { name: string; faculty: Faculty }[] = [
  { name: "ACCOUNTS", faculty: "COMMERCE" },
  { name: "BOTANY", faculty: "SCIENCE" },
  { name: "CHEMISTRY", faculty: "SCIENCE" },
  { name: "ECONOMICS", faculty: "ARTS" },
  { name: "ENGLISH", faculty: "ARTS" },
  { name: "HINDI", faculty: "ARTS" },
  { name: "HISTORY", faculty: "ARTS" },
  { name: "HOME SCIENCE", faculty: "ARTS" },
  { name: "LIBRARY SCIENCE", faculty: "BLIS" },
  { name: "MATHEMATICS", faculty: "SCIENCE" },
  { name: "PHILOSOPHY", faculty: "ARTS" },
  { name: "PHYSICS", faculty: "SCIENCE" },
  { name: "POLITICAL SCIENCE", faculty: "ARTS" },
  { name: "PSYCHOLOGY", faculty: "ARTS" },
  { name: "SANSKRIT", faculty: "ARTS" },
  { name: "URDU", faculty: "ARTS" },
  { name: "ZOOLOGY", faculty: "SCIENCE" },
];

export const SESSIONS = ["2023-27", "2024-28", "2025-29", "2025-26"] as const;
export type Session = (typeof SESSIONS)[number];

// Total semesters per session. Most sessions are 4-year/8-sem degree courses;
// 2025-26 is the 1-year/2-sem BLIS (Bachelor of Library & Info. Science).
export const SESSION_DURATION_SEMS: Record<Session, number> = {
  "2023-27": 8,
  "2024-28": 8,
  "2025-29": 8,
  "2025-26": 2,
};

// Faculty-specific sessions. BLIS depts only have BLIS sessions; everyone else
// uses the 4-year sessions. Used by the submit form to filter the dropdown.
export function sessionsForFaculty(faculty: Faculty): readonly Session[] {
  if (faculty === "BLIS") return ["2025-26"];
  return SESSIONS.filter((s) => SESSION_DURATION_SEMS[s] !== 2);
}

// Cross-rule used by the admissions feed form + API: the 2025-26 session is
// reserved for the BLIS stream, and BLIS only ever pairs with 2025-26.
export function streamsForSession(session: Session | ""): readonly Stream[] {
  if (!session) return STREAMS;
  if (session === "2025-26") return ["BLIS"];
  return STREAMS.filter((s) => s !== "BLIS");
}

export function sessionsForStream(stream: Stream | ""): readonly Session[] {
  if (!stream) return SESSIONS;
  if (stream === "BLIS") return ["2025-26"];
  return SESSIONS.filter((s) => s !== "2025-26");
}

export function isValidSessionStreamPair(session: Session, stream: Stream): boolean {
  return (session === "2025-26") === (stream === "BLIS");
}

// Anchor for the academic timeline. We list every month from this date through
// the current calendar month so the dropdown auto-extends as time passes.
const MONTHS_ANCHOR = { year: 2025, month: 9 } as const;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export type MonthRow = { key: string; label: string };

/**
 * Returns the list of selectable months in chronological order, starting at
 * the academic anchor (Sep 2025) and ending at the *current* calendar month.
 * Recomputed on every call so a server restart / fresh client mount picks up
 * the new month automatically — no redeploy needed when April → May rolls.
 */
export function getMonths(now: Date = new Date()): MonthRow[] {
  const out: MonthRow[] = [];
  let y: number = MONTHS_ANCHOR.year;
  let m: number = MONTHS_ANCHOR.month;
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;
  // Cap to anchor in case clock is somehow before the anchor.
  if (endY < y || (endY === y && endM < m)) {
    out.push({ key: ymKey(y, m), label: `${MONTH_NAMES[m - 1]} ${y}` });
    return out;
  }
  while (y < endY || (y === endY && m <= endM)) {
    out.push({ key: ymKey(y, m), label: `${MONTH_NAMES[m - 1]} ${y}` });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function ymKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** True if `key` is a YYYY-MM month at or after the anchor and at or before the current month. */
export function isValidMonthKey(key: string, now: Date = new Date()): boolean {
  return getMonths(now).some((m) => m.key === key);
}

// Month keys are dynamic — typed as string instead of a closed union so adding
// next month doesn't require a type change.
export type MonthKey = string;

// Backward-compat const: every existing consumer that does
// `import { MONTHS } from "@/lib/constants"` still works. Evaluated once at
// module load — re-runs on every server cold-start and every client bundle
// load, so a fresh visit picks up the new month automatically. Pages that
// want sub-second freshness should call `getMonths()` directly inside a
// `useMemo`/effect on mount.
export const MONTHS: readonly MonthRow[] = getMonths();

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

// Admission streams. Lives here (not in /models/Admission) so client pages
// can import without dragging mongoose into the browser bundle.
export const STREAMS = ["B.A", "B.Sc", "B.Com", "BLIS"] as const;
export type Stream = (typeof STREAMS)[number];

/**
 * Auto-compute the current semester a batch is in, given session + month.
 * Academic year starts in June (new sessions begin June/July).
 * Odd sems = Jun–Dec, Even sems = Jan–May.
 * This removes teacher confusion caused by the Jan-2026 semester rollover.
 */
export function computeSemester(session: Session, monthKey: MonthKey): number {
  const startYear = Number(session.split("-")[0]);
  const [yStr, mStr] = monthKey.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const academicYear = month >= 6 ? year : year - 1;
  const yearIndex = academicYear - startYear;
  return 2 * yearIndex + (month >= 6 ? 1 : 2);
}

export function semesterRoman(session: Session, monthKey: MonthKey): string {
  const sem = computeSemester(session, monthKey);
  return ROMAN[sem - 1] ?? String(sem);
}

/** Reverse lookup: given a month and a semester number, find the matching session. */
export function sessionFromSemesterMonth(sem: number, monthKey: MonthKey): Session | null {
  for (const s of SESSIONS) {
    if (computeSemester(s, monthKey) === sem && sem <= SESSION_DURATION_SEMS[s]) return s;
  }
  return null;
}

/** True iff the (session, monthKey) pair falls within the course's duration. */
export function isSemesterValidForSession(session: Session, monthKey: MonthKey): boolean {
  const sem = computeSemester(session, monthKey);
  return sem >= 1 && sem <= SESSION_DURATION_SEMS[session];
}
