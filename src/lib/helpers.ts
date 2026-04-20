export function pctClass(pct: number): string {
  if (pct < 50) return "pct-low";
  if (pct < 75) return "pct-mid";
  if (pct < 85) return "pct-good";
  return "pct-great";
}

export function pctColor(pct: number): string {
  // Continuous gradient: red → amber → green → indigo
  if (pct < 50) return "#ef4444";
  if (pct < 75) return "#f59e0b";
  if (pct < 85) return "#10b981";
  return "#6366f1";
}
