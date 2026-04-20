import { readFileSync } from "node:fs";
import mongoose from "mongoose";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2];
}

// From the college enrollment sheet (as on 12-04-2026 / 20-04-2026).
// [session, stream, semesterCountsArray]
const SHEET = [
  ["2025-29", "B.A", [702, 641]],
  ["2025-29", "B.Sc", [491, 454]],
  ["2025-29", "B.Com", [6, 5]],

  ["2024-28", "B.A", [904, 832, 765, 726]],
  ["2024-28", "B.Sc", [639, 597, 572, 548]],
  ["2024-28", "B.Com", [17, 16, 13, 13]],

  ["2023-27", "B.A", [960, 866, 820, 788, 740, 716]],
  ["2023-27", "B.Sc", [570, 511, 500, 785, 463, 449]],
  ["2023-27", "B.Com", [7, 7, 7, 7, 7, 7]],
];

const schema = new mongoose.Schema(
  {
    session: { type: String, required: true },
    stream: { type: String, required: true },
    semester: { type: Number, required: true },
    count: { type: Number, required: true },
  },
  { timestamps: true }
);
schema.index({ session: 1, stream: 1, semester: 1 }, { unique: true });
const Admission = mongoose.models.Admission || mongoose.model("Admission", schema);

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  await mongoose.connect(process.env.MONGODB_URI);

  const ops = [];
  for (const [session, stream, counts] of SHEET) {
    counts.forEach((count, i) => {
      ops.push({
        updateOne: {
          filter: { session, stream, semester: i + 1 },
          update: { $set: { session, stream, semester: i + 1, count } },
          upsert: true,
        },
      });
    });
  }
  const res = await Admission.bulkWrite(ops);
  console.log(`Seeded ${ops.length} rows · upserted ${res.upsertedCount ?? 0} · modified ${res.modifiedCount ?? 0}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
