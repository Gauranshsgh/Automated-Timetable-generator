import mongoose, { Schema, type Document } from 'mongoose';
import type { IInstitution, ITimeBand } from '@timetable/types';
import { DayOfWeek } from '@timetable/types';

// ─── TimeBand sub-schema ─────────────────────────────────────
const timeBandSchema = new Schema<ITimeBand>(
  {
    label: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    order: { type: Number, required: true },
    isBreak: { type: Boolean, default: false },
    isLunch: { type: Boolean, default: false },
  },
  { _id: true }
);

// ─── Institution Schema ─────────────────────────────────────
export interface InstitutionDocument extends Omit<IInstitution, '_id'>, Document {}

const institutionSchema = new Schema<InstitutionDocument>(
  {
    name: { type: String, required: true, trim: true },
    batch: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    workingDays: {
      type: [{ type: String, enum: Object.values(DayOfWeek) }],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'At least one working day is required',
      },
    },
    timeBands: {
      type: [timeBandSchema],
      required: true,
      validate: {
        validator: (v: ITimeBand[]) => v.length > 0,
        message: 'At least one time band is required',
      },
    },
    createdBy: { type: String },
  },
  { timestamps: true }
);

institutionSchema.index({ name: 1, semester: 1 }, { unique: true });

export const Institution = mongoose.model<InstitutionDocument>('Institution', institutionSchema);
