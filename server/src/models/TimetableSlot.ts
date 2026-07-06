import mongoose, { Schema, type Document } from 'mongoose';
import type { ITimetableSlot } from '@timetable/types';
import { DayOfWeek, SubjectType } from '@timetable/types';

export interface TimetableSlotDocument extends Omit<ITimetableSlot, '_id'>, Document {}

const timetableSlotSchema = new Schema<TimetableSlotDocument>(
  {
    day: { type: String, enum: Object.values(DayOfWeek), required: true },
    timeBandIndex: { type: Number, required: true },
    subjectCode: { type: String, required: true },
    type: { type: String, enum: Object.values(SubjectType), required: true },
    sectionId: { type: String, required: true },
    facultyId: { type: String, required: true },
    roomId: { type: String, required: true },
    locked: { type: Boolean, default: false },
    isManualOverride: { type: Boolean, default: false },
    timetableVersionId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

// ─── Compound Indexes for Fast Conflict Detection ────────────
// These indexes enforce uniqueness at the database level and provide
// O(1) lookup for conflict checks during generation and editing.

// Prevents a faculty member from being double-booked in the same time slot
timetableSlotSchema.index(
  { timetableVersionId: 1, day: 1, timeBandIndex: 1, facultyId: 1 },
  { unique: true, name: 'unique_faculty_slot' }
);

// Prevents a room from being double-booked in the same time slot
timetableSlotSchema.index(
  { timetableVersionId: 1, day: 1, timeBandIndex: 1, roomId: 1 },
  { unique: true, name: 'unique_room_slot' }
);

// Prevents a section from having two classes at the same time
timetableSlotSchema.index(
  { timetableVersionId: 1, day: 1, timeBandIndex: 1, sectionId: 1 },
  { unique: true, name: 'unique_section_slot' }
);

// Fast per-day rendering queries (fetch all slots for a given day in a version)
timetableSlotSchema.index(
  { timetableVersionId: 1, day: 1 },
  { name: 'version_day_lookup' }
);

export const TimetableSlot = mongoose.model<TimetableSlotDocument>(
  'TimetableSlot',
  timetableSlotSchema
);
