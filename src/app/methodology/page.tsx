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

      <Section title="2. Class Attendance">
        <p>
          Each entry in the database is one triple <em>(department, session, month)</em> with a percentage that the
          teacher submitted.
        </p>
        <List>
          <li>
            <strong>Per-department line:</strong> the raw monthly percentage for that department, plotted month by
            month. No smoothing, no averaging — exactly what was submitted.
          </li>
          <li>
            <strong>Overall-average line:</strong> for each month,
            <Formula inline>
              overall_avg(month) = Σ department_pct / count(departments that reported that month)
            </Formula>
            Departments that didn&apos;t submit for a month are <strong>skipped</strong>, not treated as zero — a
            silent dept shouldn&apos;t drag the average down.
          </li>
          <li>
            <strong>Session filter:</strong> sessions act as a distinct-row key, not a weighting. A department that
            submitted for two sessions in the same month contributes two points on its line.
          </li>
        </List>
      </Section>

      <Section title="3. Gate Entries (daily student footfall)">
        <p>Each row is one day&apos;s count from the gate register, optionally with a note.</p>
        <List>
          <li>
            <strong>Daily chart:</strong> raw counts per date, drawn as a gradient area.
          </li>
          <li>
            <strong>Daily-average reference line:</strong>
            <Formula inline>daily_avg = Σ counts / number_of_days_recorded</Formula>
          </li>
          <li>
            <strong>Weekday pattern:</strong> for each weekday,
            <Formula inline>weekday_avg = Σ counts_on_that_weekday / days_recorded_for_that_weekday</Formula>
            Weekdays with zero recorded days (e.g. Sundays) are omitted rather than shown as zero.
          </li>
          <li>
            <strong>Monthly totals:</strong> sum of all daily counts within the calendar month.
          </li>
        </List>
      </Section>

      <Section title="4. Session Admissions (enrolment progression)">
        <p>
          Each row is one <em>(session, stream, semester)</em> → student count, taken from the official enrolment
          sheet.
        </p>
        <List>
          <li>
            <strong>Progression chart:</strong> one line per session × stream, plotted against semesters I – VIII.
            Reads as attrition or retention as a batch advances.
          </li>
          <li>
            <strong>Session totals:</strong> Σ counts across all semesters of the session — total{" "}
            <em>student-semester</em> enrolments, not unique students (a student in Sem V is counted separately from
            that same student when they were in Sem I).
          </li>
          <li>
            <strong>Total enrolled (latest sem):</strong> for each (session, stream) pair, take only the{" "}
            <em>highest semester</em> recorded, then sum. This is the best available estimate of{" "}
            <em>students currently on-roll</em>.
          </li>
        </List>
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

function KeyCard({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-lg border border-foreground/10 px-3 py-2 bg-foreground/[0.03] list-none">
      <div className="text-xs uppercase tracking-wide text-foreground/60 font-semibold">{label}</div>
      <div className="font-mono text-xs mt-0.5">{value}</div>
    </li>
  );
}
