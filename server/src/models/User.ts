import mongoose, { Schema, type Document } from 'mongoose';
import type { IUser } from '@timetable/types';
import { UserRole } from '@timetable/types';

export interface UserDocument extends Omit<IUser, '_id'>, Document {}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.VIEWER,
    },
    institutionId: { type: String },
    facultyId: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDocument>('User', userSchema);
