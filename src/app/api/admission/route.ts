import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Admission } from "@/models/Admission";
import {
  SESSIONS,
  STREAMS,
  SESSION_DURATION_SEMS,
  isValidSessionStreamPair,
  type Session,
  type Stream,
} from "@/lib/constants";
import { requireAuth } from "@/lib/authGuard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await connectDB();
    const rows = await Admission.find({}).sort({ session: 1, stream: 1, semester: 1 }).lean();
    return NextResponse.json(
      {
        rows: rows.map((r) => ({
          _id: String(r._id),
          session: r.session,
          stream: r.stream,
          semester: r.semester,
          count: r.count,
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

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    await connectDB();

    if (Array.isArray(body?.entries)) {
      const ops: Parameters<typeof Admission.bulkWrite>[0] = [];
      for (const e of body.entries) {
        if (!SESSIONS.includes(e?.session)) continue;
        if (!STREAMS.includes(e?.stream)) continue;
        if (!isValidSessionStreamPair(e.session as Session, e.stream as Stream)) continue;
        const sem = Number(e?.semester);
        const count = Number(e?.count);
        const maxSem = SESSION_DURATION_SEMS[e.session as Session];
        if (!Number.isInteger(sem) || sem < 1 || sem > maxSem) continue;
        if (!Number.isFinite(count) || count < 0) continue;
        ops.push({
          updateOne: {
            filter: { session: e.session, stream: e.stream, semester: sem },
            update: { $set: { session: e.session, stream: e.stream, semester: sem, count: Math.round(count) } },
            upsert: true,
          },
        });
      }
      if (!ops.length) return NextResponse.json({ error: "No valid rows" }, { status: 400 });
      const result = await Admission.bulkWrite(ops);
      return NextResponse.json({
        ok: true,
        total: ops.length,
        inserted: result.upsertedCount ?? 0,
        updated: result.modifiedCount ?? 0,
      });
    }

    const { session, stream, semester, count } = body ?? {};
    if (!SESSIONS.includes(session)) return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    if (!STREAMS.includes(stream)) return NextResponse.json({ error: "Invalid stream" }, { status: 400 });
    if (!isValidSessionStreamPair(session as Session, stream as Stream))
      return NextResponse.json(
        { error: `Session ${session} and stream ${stream} cannot be combined (BLIS only pairs with 2025-26).` },
        { status: 400 }
      );
    const sem = Number(semester);
    const maxSem = SESSION_DURATION_SEMS[session as Session];
    if (!Number.isInteger(sem) || sem < 1 || sem > maxSem)
      return NextResponse.json({ error: `Semester must be between 1 and ${maxSem} for session ${session}` }, { status: 400 });
    const c = Number(count);
    if (!Number.isFinite(c) || c < 0) return NextResponse.json({ error: "Invalid count" }, { status: 400 });

    const doc = await Admission.findOneAndUpdate(
      { session, stream, semester: sem },
      { $set: { session, stream, semester: sem, count: Math.round(c) } },
      { upsert: true, new: true }
    );
    return NextResponse.json({ ok: true, id: String(doc._id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const { session, stream, semester } = await req.json();
    await connectDB();
    await Admission.deleteOne({ session, stream, semester });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
