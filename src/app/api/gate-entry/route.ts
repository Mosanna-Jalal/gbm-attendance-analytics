import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { GateEntry } from "@/models/GateEntry";
import { requireAuth } from "@/lib/authGuard";

function isValidDateKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime());
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    await connectDB();

    // Bulk mode
    if (Array.isArray(body?.entries)) {
      const cleaned: { dateKey: string; count: number }[] = [];
      for (const e of body.entries) {
        if (!isValidDateKey(String(e?.dateKey))) continue;
        const c = Number(e?.count);
        if (!Number.isFinite(c) || c < 0) continue;
        cleaned.push({ dateKey: String(e.dateKey), count: Math.round(c) });
      }
      if (!cleaned.length) return NextResponse.json({ error: "No valid rows" }, { status: 400 });

      const ops = cleaned.map((r) => ({
        updateOne: {
          filter: { dateKey: r.dateKey },
          update: { $set: { count: r.count } },
          upsert: true,
        },
      }));
      const result = await GateEntry.bulkWrite(ops);
      return NextResponse.json({
        ok: true,
        inserted: result.upsertedCount ?? 0,
        updated: result.modifiedCount ?? 0,
        total: cleaned.length,
      });
    }

    // Single entry
    const { dateKey, count, note } = body ?? {};
    if (!isValidDateKey(String(dateKey)))
      return NextResponse.json({ error: "Invalid date (YYYY-MM-DD expected)" }, { status: 400 });
    const c = Number(count);
    if (!Number.isFinite(c) || c < 0)
      return NextResponse.json({ error: "Count must be a non-negative number" }, { status: 400 });

    const doc = await GateEntry.findOneAndUpdate(
      { dateKey: String(dateKey) },
      { $set: { count: Math.round(c), note: typeof note === "string" ? note : "" } },
      { upsert: true, new: true }
    );
    return NextResponse.json({ ok: true, id: String(doc._id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const rows = await GateEntry.find({}).sort({ dateKey: 1 }).lean();
    return NextResponse.json({
      rows: rows.map((r) => ({
        _id: String(r._id),
        dateKey: r.dateKey,
        count: r.count,
        note: r.note ?? "",
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    const { dateKey } = await req.json();
    if (!isValidDateKey(String(dateKey)))
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    await connectDB();
    await GateEntry.deleteOne({ dateKey });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
