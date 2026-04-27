import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { STREAMS, type Stream } from "@/lib/constants";

// Re-export so existing server-side imports `from "@/models/Admission"` keep working.
export { STREAMS };
export type { Stream };

const AdmissionSchema = new Schema(
  {
    session: { type: String, required: true, index: true }, // "2023-27" | "2024-28" | "2025-29"
    stream: { type: String, required: true, enum: STREAMS, index: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    count: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

AdmissionSchema.index({ session: 1, stream: 1, semester: 1 }, { unique: true, name: "uniq_session_stream_sem" });

export type AdmissionDoc = InferSchemaType<typeof AdmissionSchema> & { _id: mongoose.Types.ObjectId };
export const Admission: Model<AdmissionDoc> =
  (mongoose.models.Admission as Model<AdmissionDoc>) ||
  mongoose.model<AdmissionDoc>("Admission", AdmissionSchema);
