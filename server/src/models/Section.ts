import mongoose, { Schema, type Document } from 'mongoose';
import type { ISection } from '@timetable/types';

export interface SectionDocument extends Omit<ISection, '_id'>, Document {}

const sectionSchema = new Schema<SectionDocument>(
  {
    name: { type: String, required: true, trim: true },
    batchGrouping: { type: String, trim: true },
    studentCount: { type: Number, required: true, min: 1 },
    institutionId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

sectionSchema.index({ name: 1, institutionId: 1 }, { unique: true });

export const Section = mongoose.model<SectionDocument>('Section', sectionSchema);
