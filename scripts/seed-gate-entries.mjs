import { readFileSync } from "node:fs";
import mongoose from "mongoose";

// Load MONGODB_URI from .env.local (project root)
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2];
}

const DATA = [
  ["2026-02-17", 17],
  ["2026-02-18", 56],
  ["2026-02-19", 58],
  ["2026-02-20", 37],
  ["2026-02-21", 44],
  ["2026-02-23", 287],
  ["2026-02-24", 326],
  ["2026-02-25", 457],
  ["2026-02-26", 425],
  ["2026-02-27", 490],
  ["2026-02-28", 264],
  ["2026-03-06", 55],
  ["2026-03-07", 193],
  ["2026-03-08", 18],
  ["2026-03-09", 442],
  ["2026-03-10", 314],
  ["2026-03-11", 350],
  ["2026-03-12", 291],
  ["2026-03-13", 388],
  ["2026-03-14", 266],
  ["2026-03-16", 496],
  ["2026-03-17", 538],
  ["2026-03-18", 538],
  ["2026-03-19", 527],
  ["2026-03-23", 624],
  ["2026-03-24", 517],
  ["2026-03-25", 504],
  ["2026-03-28", 545],
  ["2026-03-30", 684],
  ["2026-04-01", 631],
  ["2026-04-02", 480],
  ["2026-04-03", 40],
  ["2026-04-04", 468],
  ["2026-04-05", 149],
  ["2026-04-06", 664],
  ["2026-04-07", 334],
  ["2026-04-08", 418],
  ["2026-04-09", 457],
  ["2026-04-10", 949],
  ["2026-04-11", 923],
  ["2026-04-13", 851],
  ["2026-04-15", 275],
  ["2026-04-16", 934],
  ["2026-04-17", 867],
  ["2026-04-18", 787],
  ["2026-04-20", 786],
];

const schema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);
const GateEntry = mongoose.models.GateEntry || mongoose.model("GateEntry", schema);

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing from .env.local");
  console.log("Connecting…");
  await mongoose.connect(process.env.MONGODB_URI);

  const ops = DATA.map(([dateKey, count]) => ({
    updateOne: {
      filter: { dateKey },
      update: { $set: { count } },
      upsert: true,
    },
  }));
  const res = await GateEntry.bulkWrite(ops);
  console.log(`Seeded: ${DATA.length} rows · upserted ${res.upsertedCount ?? 0} · modified ${res.modifiedCount ?? 0}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
