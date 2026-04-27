import Link from "next/link";

export const metadata = {
  title: "Methodology — GBM Analytics",
  description: "How every chart in GBM Analytics is calculated from the raw data.",
};

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-foreground/60 font-semibold">Reference</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">
          <span className="brand-gradient-text">Methodology</span>
        </h1>
        <p className="text-foreground/70 mt-2">
          A plain-language guide to how raw entries become the numbers and charts shown across GBM Analytics. Read this
          once and every graph will be easy to interpret.
        </p>
      </div>

      <Section title="1. Semester auto-computation">
        <p>
          The academic year is anchored to <strong>June</strong> — when new sessions begin. From a{" "}
          <em>session</em> (e.g. 2023-27) and a <em>month</em>, the system derives the current semester so teachers
          never have to remember the January rollover.
        </p>
        <Formula>
          <div>academic_year = month ≥ 6 ? calendar_year : calendar_year − 1</div>
          <div>year_index = academic_year − session_start_year</div>
          <div>semester = 2 × year_index + (month ≥ 6 ? 1 : 2)</div>
        </Formula>
        <p className="text-foreground/70">
          Example: January 2026 for session 2023-27 → academic_year = 2025, year_index = 2, semester ={" "}
          <strong>5</strong> (Sem V). This is also used in reverse — picking a month + semester auto-fills the
          session on the submit form.
        </p>
      </Section>

      <Section title="2. Class Attendance — calculations">
        <p>
          Every row in the database is one submission: <em>(teacher, department, session, semester, month, %)</em>.
          A single department/month can have multiple submissions — different teachers, different sessions, or even
          different semesters of the same dept all sit side-by-side as separate rows.
        </p>

        <Sub title="2.1 Per-department line (Chart view)">
          <p>For each (department, month) the chart plots the <strong>arithmetic mean</strong> of every matching submission after filters are applied:</p>
          <Formula>
            dept_pct(month) = Σ percentage / count   ⟶ over all rows where row.department = D and row.monthKey = month
          </Formula>
          <Example>
            <div className="mb-1.5 font-semibold">Example — ENGLISH for Nov 2025:</div>
            <table className="w-full text-xs">
              <thead className="text-foreground/60">
                <tr><th className="text-left py-1">Teacher</th><th className="text-left">Session</th><th className="text-left">Sem</th><th className="text-right">%</th></tr>
              </thead>
              <tbody>
                <tr><td>A</td><td>2023-27</td><td>V</td><td className="text-right">80</td></tr>
                <tr><td>A</td><td>2024-28</td><td>III</td><td className="text-right">70</td></tr>
                <tr><td>B</td><td>2023-27</td><td>V</td><td className="text-right">90</td></tr>
                <tr><td>B</td><td>2025-29</td><td>I</td><td className="text-right">60</td></tr>
              </tbody>
            </table>
            <div className="mt-1.5">ENGLISH point on Nov 2025 = (80 + 70 + 90 + 60) / 4 = <strong>75%</strong></div>
          </Example>
        </Sub>

        <Sub title="2.2 Overall-average line">
          <p>For each month, the average is taken across <em>every</em> filtered submission — not across departments. Departments that submitted twice contribute twice; departments that didn&apos;t submit are simply absent (not treated as 0).</p>
          <Formula>
            overall_pct(month) = Σ percentage / count   ⟶ over all filtered rows where row.monthKey = month
          </Formula>
          <Example>
            <div className="mb-1.5 font-semibold">Example — Nov 2025, two depts reporting:</div>
            <div>ENGLISH: 80, 70, 90, 60 (4 submissions, mean 75%)</div>
            <div>HISTORY: 65, 55 (2 submissions, mean 60%)</div>
            <div className="mt-1.5">Overall = (80 + 70 + 90 + 60 + 65 + 55) / 6 = <strong>70%</strong></div>
            <div className="text-foreground/60 mt-1">(Not 67.5% — that would be the dept-weighted mean. ENGLISH submitted more times so it pulls the bar slightly higher.)</div>
          </Example>
        </Sub>

        <Sub title="2.3 Department Ranking (bar chart on the right)">
          <p>Mean of every filtered submission for that dept across <strong>all</strong> months — i.e. the dept&apos;s overall standing, not month-by-month:</p>
          <Formula>dept_rank(D) = Σ percentage / count   ⟶ over all filtered rows where row.department = D</Formula>
          <Example>
            ENGLISH submissions across Sep 2025 → Mar 2026 (24 rows, sum 1740) ⟶ 1740 / 24 = <strong>72.5%</strong>. Departments with zero matching rows are dropped from the ranking entirely.
          </Example>
        </Sub>

        <Sub title="2.4 Filter interactions">
          <p>Filters work as <strong>row-level inclusions</strong>. A row only contributes to a calculation if it passes every active filter; means are then taken over the surviving rows.</p>
          <List>
            <li>
              <strong>Session filter</strong> (multi-select). No selection = include every session. With sessions checked, only rows whose <code>session</code> is in the selected set survive.
            </li>
            <li>
              <strong>Semester filter</strong> (multi-select). Same logic on the <code>semester</code> column.
            </li>
            <li>
              <strong>Combining session + semester</strong>: a row must match <em>both</em> sets (logical AND across filter rows, OR within each row).
            </li>
            <li>
              <strong>View toggle</strong>: changes which lines are drawn, not which rows survive.
              <ul className="list-disc pl-5 mt-0.5 space-y-0.5 text-foreground/75">
                <li><em>All N Departments</em>: one line per dept that has any data.</li>
                <li><em>Overall Average</em>: a single line using the overall_pct formula above.</li>
                <li><em>Custom Selection</em>: only the dept lines you&apos;ve picked, plus a dashed overall line for context.</li>
              </ul>
            </li>
            <li>
              Switching <strong>View</strong> resets sessions/semesters/depts to empty so each view starts clean.
            </li>
          </List>

          <Example>
            <div className="mb-1.5 font-semibold">Worked example — same Nov 2025 data as 2.1, different filter combos:</div>
            <table className="w-full text-xs">
              <thead className="text-foreground/60">
                <tr><th className="text-left py-1">Filters</th><th className="text-left">Surviving rows</th><th className="text-right">ENGLISH point</th></tr>
              </thead>
              <tbody>
                <tr><td>(none)</td><td>80, 70, 90, 60</td><td className="text-right">75%</td></tr>
                <tr><td>Session = 2023-27</td><td>80, 90</td><td className="text-right">85%</td></tr>
                <tr><td>Session = 2024-28</td><td>70</td><td className="text-right">70%</td></tr>
                <tr><td>Session = 2023-27, Sem V</td><td>80, 90</td><td className="text-right">85%</td></tr>
                <tr><td>Session = 2025-29, Sem V</td><td>(none)</td><td className="text-right">— (gap)</td></tr>
                <tr><td>Sem I + Sem III</td><td>70, 60</td><td className="text-right">65%</td></tr>
              </tbody>
            </table>
            <div className="text-foreground/60 mt-2">Empty result = the line shows a gap that month, not a zero.</div>
          </Example>
        </Sub>

        <Sub title="2.5 Why an absent dept is a gap, not a zero">
          <p>A silent department means &quot;no information&quot; — not &quot;0% attended&quot;. Treating non-submission as zero would unfairly drag both the dept ranking and the overall line down. The chart leaves the gap, the tooltip skips that dept for that month, and the average is computed only over what was actually reported.</p>
        </Sub>
      </Section>

      <Section title="3. Gate Entries (daily student footfall)">
        <p>Each row is one day&apos;s count from the gate register, optionally with a note.</p>
        <List>
          <li>
            <strong>Daily chart:</strong> raw counts per date, drawn as a gradient area. No averaging — every point is exactly what was logged.
          </li>
          <li>
            <strong>Daily-average reference line:</strong>{" "}
            <Formula inline>daily_avg = Σ counts / number_of_days_recorded</Formula>
          </li>
          <li>
            <strong>Weekday pattern:</strong>{" "}
            <Formula inline>weekday_avg = Σ counts_on_that_weekday / days_recorded_for_that_weekday</Formula>
            Weekdays with zero recorded days (e.g. Sundays) are omitted rather than shown as zero.
          </li>
          <li><strong>Monthly totals:</strong> sum of all daily counts within the calendar month.</li>
        </List>
        <Example>
          <div className="mb-1.5 font-semibold">Example — three Mondays logged this term:</div>
          <div>02-Sep: 1,200 · 09-Sep: 1,150 · 16-Sep: 1,400</div>
          <div className="mt-1.5">Monday weekday_avg = (1200 + 1150 + 1400) / 3 = <strong>1,250</strong></div>
          <div className="mt-1">If September has these three Mondays plus a few Tue/Wed entries totalling 8,500, the September monthly total = 1200 + 1150 + 1400 + 8500 = <strong>12,250</strong>.</div>
        </Example>
      </Section>

      <Section title="4. Session Admissions (enrolment progression)">
        <p>
          Each row is one <em>(session, stream, semester)</em> → student count, taken from the official enrolment register. Rows are upserted, so re-saving the same triple updates the count rather than adding a duplicate.
        </p>

        <Sub title="4.1 Progression chart (line per session × stream)">
          <p>One curve per (session, stream) combination. The Y value at each semester is just the recorded count for that semester — falling lines mean attrition, flat lines mean retention.</p>
          <Example>
            <div className="mb-1.5 font-semibold">2023-27 · B.Sc enrolment register:</div>
            <div>Sem I: 100 · Sem II: 90 · Sem III: 80 · Sem IV: 75</div>
            <div className="mt-1.5">10 students left between Sem I and Sem II, another 10 between II and III, another 5 between III and IV. The chart curve drops 100 → 90 → 80 → 75 — one line, four points. <strong>It is not 100 + 90 + 80 + 75 = 345.</strong></div>
          </Example>
          <p className="text-foreground/70">
            Cross-rule: <code>2025-26</code> is reserved for <code>BLIS</code> (1-year, 2-semester course). The chart hides combinations like <em>2025-26 · B.A</em> that the data model forbids.
          </p>
        </Sub>

        <Sub title="4.2 “Currently on roll” cards (the per-session totals)">
          <p>For each (session, stream) take only the row with the <strong>highest semester recorded</strong>, then sum across streams within the session. This estimates current head-count, not lifetime enrolment.</p>
          <Formula>
            session_total(S) = Σ count(latest_sem of (S, stream))   for every stream that has any row under S
          </Formula>
          <Example>
            <div className="mb-1.5 font-semibold">Example — session 2023-27:</div>
            <table className="w-full text-xs">
              <thead className="text-foreground/60">
                <tr><th className="text-left py-1">Stream</th><th className="text-left">Sems recorded</th><th className="text-right">Latest sem count</th></tr>
              </thead>
              <tbody>
                <tr><td>B.A</td><td>I (960), II (866)</td><td className="text-right">866</td></tr>
                <tr><td>B.Sc</td><td>I (570), II (511)</td><td className="text-right">511</td></tr>
                <tr><td>B.Com</td><td>I (200), II (180)</td><td className="text-right">180</td></tr>
              </tbody>
            </table>
            <div className="mt-1.5">Session 2023-27 “currently on roll” = 866 + 511 + 180 = <strong>1,557</strong>. (Not 960 + 866 + 570 + 511 + 200 + 180 = 3,287 — that would double-count students by counting them in every semester they passed through.)</div>
          </Example>
          <p className="text-foreground/70">
            The same logic powers the <em>Total Enrolled (latest sem)</em> stat at the top — it just sums the per-session totals.
          </p>
        </Sub>

        <Sub title="4.3 Key Pattern Changes (attrition spotlight)">
          <p>For every (session, stream), every consecutive semester pair (i, i+1) is scanned; if count drops, the drop and percentage are recorded. The top 5 by percentage drop are listed.</p>
          <Formula>
            drop = count(i) − count(i+1)   ·   pct = drop / count(i) × 100
          </Formula>
          <Example>
            2023-27 · B.A goes 960 → 866 from Sem I to Sem II. Drop = 94, pct = 94 / 960 × 100 = <strong>9.8%</strong>. That row appears in Key Pattern Changes ranked against every other (session, stream) pair.
          </Example>
        </Sub>
      </Section>

      <Section title="5. Duplicate handling">
        <p>Unique indexes in MongoDB enforce exactly one row per logical key:</p>
        <ul className="grid sm:grid-cols-2 gap-2 mt-2">
          <KeyCard label="Attendance" value="department · session · month" />
          <KeyCard label="Gate Entry" value="date" />
          <KeyCard label="Admission" value="session · stream · semester" />
        </ul>
        <p className="text-foreground/70 mt-2">
          Resubmitting for the same key <strong>overwrites</strong> the value (upsert semantics). Charts always
          reflect the most recent submission — no stale duplicates distort the averages.
        </p>
      </Section>

      <Section title="6. Authentication & data integrity">
        <List>
          <li>All <strong>create / update / delete</strong> endpoints are gated by admin JWT authentication.</li>
          <li>Analytics pages are <strong>public</strong>, so stakeholders can view charts without login.</li>
          <li>Teachers submit via the <code>/submit</code> flow; identity is cached locally for convenience but can be switched at any time.</li>
        </List>
      </Section>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/analytics/class-attendance"
          className="btn-primary"
        >
          Go to analytics →
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl border border-foreground/20 hover:bg-foreground/5 font-semibold text-sm"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card rounded-2xl p-5 sm:p-6">
      <h2 className="font-bold text-lg brand-gradient-text mb-2">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 text-foreground/85">{children}</ul>;
}

function Formula({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  if (inline) {
    return (
      <code className="mx-1 px-2 py-0.5 rounded-md bg-foreground/10 text-[0.8em] font-mono">{children}</code>
    );
  }
  return (
    <pre className="my-1 px-3 py-2 rounded-lg bg-foreground/10 text-xs font-mono overflow-auto leading-relaxed whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-1">
      <h3 className="font-semibold text-[0.95rem] mb-1">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-indigo-300/30 bg-indigo-500/5 px-3 py-2 text-[0.8rem] leading-relaxed">
      {children}
    </div>
  );
}

function KeyCard({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-lg border border-foreground/10 px-3 py-2 bg-foreground/[0.03] list-none">
      <div className="text-xs uppercase tracking-wide text-foreground/60 font-semibold">{label}</div>
      <div className="font-mono text-xs mt-0.5">{value}</div>
    </li>
  );
}
