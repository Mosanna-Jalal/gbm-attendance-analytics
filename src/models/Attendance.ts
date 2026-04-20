import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const AttendanceSchema = new Schema(
  {
    teacherName: { type: String, required: true, trim: true },
    department: { type: String, required: true, index: true },
    faculty: { type: String, required: true },
    session: { type: String, required: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    monthKey: { type: String, required: true, index: true }, // "YYYY-MM"
    percentage: { type: Number, required: true, min: 0, max: 100 },
    distinctionStudents: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Prevent duplicate submissions for the same department + session + month.
// (Semester is derived from session+month, so it's implicitly covered.)
AttendanceSchema.index(
  { department: 1, session: 1, monthKey: 1 },
  { unique: true, name: "uniq_dept_session_month" }
);

export type AttendanceDoc = InferSchemaType<typeof AttendanceSchema> & { _id: mongoose.Types.ObjectId };

export const Attendance: Model<AttendanceDoc> =
  (mongoose.models.Attendance as Model<AttendanceDoc>) ||
  mongoose.model<AttendanceDoc>("Attendance", AttendanceSchema);
