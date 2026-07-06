import mongoose, { Schema, type Document } from 'mongoose';
import type { IConstraint, IConstraintPayload } from '@timetable/types';
import { ConstraintType } from '@timetable/types';

export interface ConstraintDocument extends Omit<IConstraint, '_id'>, Document {}

const constraintSchema = new Schema<ConstraintDocument>(
  {
    type: {
      type: String,
      enum: Object.values(ConstraintType),
      required: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    institutionId: { type: String, required: true, index: true },
    priority: { type: Number, default: 1, min: 0, max: 100 },
    isSoft: { type: Boolean, default: false },
  },
  { timestamps: true }
);

constraintSchema.index({ type: 1, institutionId: 1 });

export const Constraint = mongoose.model<ConstraintDocument>('Constraint', constraintSchema);
