import mongoose, { Schema, type Document } from 'mongoose';
import type { ITimetableVersion, ICustomAnnotation } from '@timetable/types';

const annotationSchema = new Schema<ICustomAnnotation>(
  {
    cellRef: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: true }
);

export interface TimetableVersionDocument extends Omit<ITimetableVersion, '_id' | 'slots'>, Document {
  slots: string[];
}

const timetableVersionSchema = new Schema<TimetableVersionDocument>(
  {
    institutionId: { type: String, required: true, index: true },
    slots: [{ type: Schema.Types.ObjectId, ref: 'TimetableSlot' }],
    score: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: false },
    customAnnotations: [annotationSchema],
    parentVersionId: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
);

timetableVersionSchema.index({ institutionId: 1, generatedAt: -1 });

export const TimetableVersion = mongoose.model<TimetableVersionDocument>(
  'TimetableVersion',
  timetableVersionSchema
);
