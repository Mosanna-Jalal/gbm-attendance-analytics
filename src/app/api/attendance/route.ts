import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Attendance } from "@/models/Attendance";
import {
  DEPARTMENTS,
  SESSIONS,
  SESSION_DURATION_SEMS,
  computeSemester,
  isValidMonthKey,
  type Session,
  type MonthKey,
} from "@/lib/constants";
import { requireAuth } from "@/lib/authGuard";

// Attendance analytics must reflect every newly-submitted row immediately;
// tell Next/Vercel never to serve a cached snapshot of this endpoint.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { teacherName, department, session, monthKey, percentage, distinctionStudents } = body ?? {};

    if (!teacherName || typeof teacherName !== "string" || !teacherName.trim()) {
      return NextResponse.json({ error: "Teacher name is required" }, { status: 400 });
    }
    const dept = DEPARTMENTS.find((d) => d.name === department);
    if (!dept) return NextResponse.json({ error: "Invalid department" }, { status: 400 });
    if (!SESSIONS.includes(session)) return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    if (typeof monthKey !== "string" || !isValidMonthKey(monthKey))
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });

    const pct = Number(percentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100)
      return NextResponse.json({ error: "Percentage must be 0–100" }, { status: 400 });

    const semester = computeSemester(session as Session, monthKey as MonthKey);
    const maxSem = SESSION_DURATION_SEMS[session as Session];
    if (semester < 1 || semester > maxSem)
      return NextResponse.json(
        { error: `Semester out of range for session ${session} (max sem ${maxSem})` },
        { status: 400 }
      );

    const students = Array.isArray(distinctionStudents)
      ? distinctionStudents.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];

    await connectDB();
    try {
      const doc = await Attendance.create({
        teacherName: teacherName.trim(),
        department: dept.name,
        faculty: dept.faculty,
        session,
        semester,
        monthKey,
        percentage: pct,
        distinctionStudents: students,
      });
      return NextResponse.json({ ok: true, id: String(doc._id) });
    } catch (err: unknown) {
      // MongoDB duplicate key (E11000) → reject clearly
      if (typeof err === "object" && err && "code" in err && (err as { code: number }).code === 11000) {
        return NextResponse.json(
          {
            error: `Attendance for ${dept.name} · Session ${session} · ${monthKey} has already been submitted.`,
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const rows = await Attendance.find({}).sort({ monthKey: 1, department: 1 }).lean();
    return NextResponse.json(
      {
        rows: rows.map((r) => ({
          _id: String(r._id),
          teacherName: r.teacherName,
          department: r.department,
          faculty: r.faculty,
          session: r.session,
          semester: r.semester,
          monthKey: r.monthKey,
          percentage: r.percentage,
          distinctionStudents: r.distinctionStudents ?? [],
          createdAt: r.createdAt,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
