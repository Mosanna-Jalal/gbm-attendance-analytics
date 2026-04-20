export type Faculty = "ARTS" | "SCIENCE" | "COMMERCE" | "GENERAL";

export const DEPARTMENTS: { name: string; faculty: Faculty }[] = [
  { name: "ACCOUNTS", faculty: "COMMERCE" },
  { name: "BOTANY", faculty: "SCIENCE" },
  { name: "BUSINESS ECONOMICS AND ENVIRONMENT", faculty: "COMMERCE" },
  { name: "BUSINESS MANAGEMENT AND COMMUNICATION", faculty: "COMMERCE" },
  { name: "BUSINESS ORGANISATION", faculty: "COMMERCE" },
  { name: "CHEMISTRY", faculty: "SCIENCE" },
  { name: "ECONOMICS", faculty: "ARTS" },
  { name: "ENGLISH", faculty: "ARTS" },
  { name: "GENERAL", faculty: "GENERAL" },
  { name: "HINDI", faculty: "ARTS" },
  { name: "HISTORY", faculty: "ARTS" },
  { name: "HOME SCIENCE", faculty: "ARTS" },
  { name: "LIBRARY", faculty: "GENERAL" },
  { name: "OFFICE", faculty: "GENERAL" },
  { name: "PHILOSOPHY", faculty: "ARTS" },
  { name: "PHYSICS", faculty: "SCIENCE" },
  { name: "POLITICAL SCIENCE", faculty: "ARTS" },
  { name: "PRINCIPLE OF ECONOMICS", faculty: "COMMERCE" },
  { name: "PSYCHOLOGY", faculty: "ARTS" },
  { name: "SANSKRIT", faculty: "ARTS" },
  { name: "URDU", faculty: "ARTS" },
  { name: "ZOOLOGY", faculty: "SCIENCE" },
];

export const SESSIONS = ["2023-27", "2024-28", "2025-29"] as const;
export type Session = (typeof SESSIONS)[number];

// Months in chronological order for this academic cycle
export const MONTHS = [
  { key: "2025-09", label: "September 2025" },
  { key: "2025-10", label: "October 2025" },
  { key: "2025-11", label: "November 2025" },
  { key: "2025-12", label: "December 2025" },
  { key: "2026-01", label: "January 2026" },
  { key: "2026-02", label: "February 2026" },
  { key: "2026-03", label: "March 2026" },
] as const;
export type MonthKey = (typeof MONTHS)[number]["key"];

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

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
