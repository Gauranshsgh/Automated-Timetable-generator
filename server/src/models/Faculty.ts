import mongoose, { Schema, type Document } from 'mongoose';
import type { IFaculty, IFacultyUnavailableSlot } from '@timetable/types';
import { DayOfWeek } from '@timetable/types';

const unavailableSlotSchema = new Schema<IFacultyUnavailableSlot>(
  {
    day: { type: String, enum: Object.values(DayOfWeek), required: true },
    timeBandIndex: { type: Number, required: true },
  },
  { _id: false }
);

export interface FacultyDocument extends Omit<IFaculty, '_id'>, Document {}

const facultySchema = new Schema<FacultyDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    subjectCodes: [{ type: String, required: true }],
    maxLoadPerWeek: { type: Number, required: true, min: 1, max: 40 },
    unavailableSlots: [unavailableSlotSchema],
    institutionId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

facultySchema.index({ code: 1, institutionId: 1 }, { unique: true });

export const Faculty = mongoose.model<FacultyDocument>('Faculty', facultySchema);
