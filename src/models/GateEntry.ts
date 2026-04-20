import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const GateEntrySchema = new Schema(
  {
    dateKey: { type: String, required: true, unique: true, index: true }, // "YYYY-MM-DD"
    count: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export type GateEntryDoc = InferSchemaType<typeof GateEntrySchema> & { _id: mongoose.Types.ObjectId };

export const GateEntry: Model<GateEntryDoc> =
  (mongoose.models.GateEntry as Model<GateEntryDoc>) ||
  mongoose.model<GateEntryDoc>("GateEntry", GateEntrySchema);
