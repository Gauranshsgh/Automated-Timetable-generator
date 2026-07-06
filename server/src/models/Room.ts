import mongoose, { Schema, type Document } from 'mongoose';
import type { IRoom } from '@timetable/types';
import { RoomType } from '@timetable/types';

export interface RoomDocument extends Omit<IRoom, '_id'>, Document {}

const roomSchema = new Schema<RoomDocument>(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    capacity: { type: Number, required: true, min: 1 },
    type: { type: String, enum: Object.values(RoomType), required: true },
    institutionId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

roomSchema.index({ code: 1, institutionId: 1 }, { unique: true });

export const Room = mongoose.model<RoomDocument>('Room', roomSchema);
