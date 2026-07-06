import mongoose, { Schema, type Document } from 'mongoose';
import type { ISubject, IWeeklyHours } from '@timetable/types';
import { SubjectType } from '@timetable/types';

const weeklyHoursSchema = new Schema<IWeeklyHours>(
  {
    type: { type: String, enum: Object.values(SubjectType), required: true },
    hours: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

export interface SubjectDocument extends Omit<ISubject, '_id'>, Document {}

const subjectSchema = new Schema<SubjectDocument>(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    fullName: { type: String, required: true, trim: true },
    types: [{ type: String, enum: Object.values(SubjectType), required: true }],
    weeklyHours: {
      type: [weeklyHoursSchema],
      required: true,
      validate: {
        validator: (v: IWeeklyHours[]) => v.length > 0,
        message: 'At least one weekly hour entry is required',
      },
    },
    sectionIds: [{ type: String, required: true }],
    institutionId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

subjectSchema.index({ code: 1, institutionId: 1 }, { unique: true });

export const Subject = mongoose.model<SubjectDocument>('Subject', subjectSchema);
