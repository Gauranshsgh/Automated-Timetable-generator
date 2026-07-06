// ============================================================
// Seed Script — Reference Image Data
// ============================================================
// Seeds the database with data matching the reference timetable:
// B.Tech. (IT) and B.Tech. (IT-BI) 4th Semester
// ============================================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DayOfWeek, SubjectType, RoomType, UserRole } from '@timetable/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Import models
import { Institution } from '../models/Institution.js';
import { Faculty } from '../models/Faculty.js';
import { Subject } from '../models/Subject.js';
import { Section } from '../models/Section.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable-generator';

export async function runSeed(uri?: string) {
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(uri || MONGO_URI);
  console.log('[Seed] Connected.');

  // Clear existing data
  console.log('[Seed] Clearing existing data...');
  await Promise.all([
    Institution.deleteMany({}),
    Faculty.deleteMany({}),
    Subject.deleteMany({}),
    Section.deleteMany({}),
    Room.deleteMany({}),
    User.deleteMany({}),
  ]);

  // ─── 1. Create Admin User ─────────────────────────────────
  console.log('[Seed] Creating admin user...');
  const passwordHash = await bcrypt.hash('admin123', 12);
  await User.create({
    email: 'admin@timetable.edu',
    passwordHash,
    name: 'Admin User',
    role: UserRole.ADMIN,
  });

  // ─── 2. Create Institution ────────────────────────────────
  console.log('[Seed] Creating institution...');
  const institution = await Institution.create({
    name: 'B.Tech. (IT) and B.Tech. (IT-BI)',
    batch: '2024-2028',
    semester: '4th Semester',
    workingDays: [DayOfWeek.MON, DayOfWeek.TUE, DayOfWeek.WED, DayOfWeek.THU, DayOfWeek.FRI],
    timeBands: [
      { label: '08:50-09:50', startTime: '08:50', endTime: '09:50', order: 0, isBreak: false, isLunch: false },
      { label: '09:50-10:50', startTime: '09:50', endTime: '10:50', order: 1, isBreak: false, isLunch: false },
      { label: '10:50-11:00', startTime: '10:50', endTime: '11:00', order: 2, isBreak: true, isLunch: false },
      { label: '11:00-12:00', startTime: '11:00', endTime: '12:00', order: 3, isBreak: false, isLunch: false },
      { label: '12:00-1:00', startTime: '12:00', endTime: '13:00', order: 4, isBreak: false, isLunch: false },
      { label: '1:00-2:30', startTime: '13:00', endTime: '14:30', order: 5, isBreak: false, isLunch: true },
      { label: '2:30-3:30', startTime: '14:30', endTime: '15:30', order: 6, isBreak: false, isLunch: false },
      { label: '3:30-4:30', startTime: '15:30', endTime: '16:30', order: 7, isBreak: false, isLunch: false },
      { label: '4:30-5:30', startTime: '16:30', endTime: '17:30', order: 8, isBreak: false, isLunch: false },
      { label: '5:30-6:30', startTime: '17:30', endTime: '18:30', order: 9, isBreak: false, isLunch: false },
    ],
  });

  const instId = institution._id.toString();

  // ─── 3. Create Sections ───────────────────────────────────
  console.log('[Seed] Creating sections...');
  const sectionA = await Section.create({ name: 'A', studentCount: 60, institutionId: instId });
  const sectionB = await Section.create({ name: 'B', studentCount: 60, institutionId: instId });
  const sectionC = await Section.create({ name: 'C', studentCount: 60, institutionId: instId });
  const sectionBI = await Section.create({ name: 'IT-BI', batchGrouping: 'IT-BI combined', studentCount: 45, institutionId: instId });

  const sectionIds = {
    A: sectionA._id.toString(),
    B: sectionB._id.toString(),
    C: sectionC._id.toString(),
    BI: sectionBI._id.toString(),
  };
  const allSectionIds = [sectionIds.A, sectionIds.B, sectionIds.C, sectionIds.BI];

  // ─── 4. Create Rooms ──────────────────────────────────────
  console.log('[Seed] Creating rooms...');
  const roomData = [
    { code: 'CC3-5106', capacity: 60, type: RoomType.CLASSROOM },
    { code: 'CC3-5107', capacity: 60, type: RoomType.CLASSROOM },
    { code: 'CC3-5119', capacity: 40, type: RoomType.LAB },
    { code: 'CC3-5155', capacity: 60, type: RoomType.CLASSROOM },
    { code: 'CC3-5242', capacity: 40, type: RoomType.LAB },
    { code: 'CC3-5403', capacity: 40, type: RoomType.LAB },
    { code: 'CC3-5241', capacity: 40, type: RoomType.LAB },
    { code: 'LT-3113', capacity: 200, type: RoomType.LECTURE_THEATRE },
    { code: 'CC2-4205', capacity: 60, type: RoomType.CLASSROOM },
    { code: 'CC3-5006', capacity: 60, type: RoomType.CLASSROOM },
    { code: 'CC3-5007', capacity: 60, type: RoomType.CLASSROOM },
    { code: 'CC3-5154', capacity: 60, type: RoomType.CLASSROOM },
    { code: 'CC3-5206', capacity: 60, type: RoomType.CLASSROOM },
  ];

  const rooms: Record<string, string> = {};
  for (const r of roomData) {
    const room = await Room.create({ ...r, institutionId: instId });
    rooms[r.code] = room._id.toString();
  }

  // ─── 5. Create Subjects ───────────────────────────────────
  console.log('[Seed] Creating subjects...');
  const subjectData = [
    {
      code: 'DAA', fullName: 'Design and Analysis of Algorithms',
      types: [SubjectType.LECTURE, SubjectType.PRACTICAL],
      weeklyHours: [
        { type: SubjectType.LECTURE, hours: 3 },
        { type: SubjectType.PRACTICAL, hours: 2 },
      ],
      sectionIds: allSectionIds,
    },
    {
      code: 'DBMS', fullName: 'Database Management Systems',
      types: [SubjectType.LECTURE, SubjectType.PRACTICAL],
      weeklyHours: [
        { type: SubjectType.LECTURE, hours: 3 },
        { type: SubjectType.PRACTICAL, hours: 2 },
      ],
      sectionIds: allSectionIds,
    },
    {
      code: 'CGV', fullName: 'Computer Graphics and Visualization',
      types: [SubjectType.LECTURE, SubjectType.PRACTICAL],
      weeklyHours: [
        { type: SubjectType.LECTURE, hours: 2 },
        { type: SubjectType.PRACTICAL, hours: 2 },
      ],
      sectionIds: [sectionIds.A, sectionIds.B, sectionIds.C],
    },
    {
      code: 'CN', fullName: 'Computer Networks',
      types: [SubjectType.LECTURE, SubjectType.PRACTICAL],
      weeklyHours: [
        { type: SubjectType.LECTURE, hours: 3 },
        { type: SubjectType.PRACTICAL, hours: 2 },
      ],
      sectionIds: allSectionIds,
    },
    {
      code: 'PPL', fullName: 'Principles of Programming Languages',
      types: [SubjectType.LECTURE],
      weeklyHours: [
        { type: SubjectType.LECTURE, hours: 3 },
      ],
      sectionIds: allSectionIds,
    },
    {
      code: 'DM', fullName: 'Discrete Mathematics',
      types: [SubjectType.LECTURE, SubjectType.PRACTICAL],
      weeklyHours: [
        { type: SubjectType.LECTURE, hours: 2 },
        { type: SubjectType.PRACTICAL, hours: 1 },
      ],
      sectionIds: [sectionIds.BI],
    },
    {
      code: 'MSP', fullName: 'Mathematical and Statistical Principles',
      types: [SubjectType.LECTURE],
      weeklyHours: [
        { type: SubjectType.LECTURE, hours: 2 },
      ],
      sectionIds: [sectionIds.BI],
    },
    {
      code: 'OR', fullName: 'Operations Research',
      types: [SubjectType.LECTURE],
      weeklyHours: [
        { type: SubjectType.LECTURE, hours: 2 },
      ],
      sectionIds: [sectionIds.BI],
    },
  ];

  for (const s of subjectData) {
    await Subject.create({ ...s, institutionId: instId });
  }

  // ─── 6. Create Faculty ────────────────────────────────────
  console.log('[Seed] Creating faculty...');
  const facultyData = [
    { name: 'Dr. Arun Kumar', code: 'FAC01', subjectCodes: ['DAA'], maxLoadPerWeek: 20 },
    { name: 'Dr. Priya Sharma', code: 'FAC02', subjectCodes: ['DBMS'], maxLoadPerWeek: 20 },
    { name: 'Dr. Rajesh Singh', code: 'FAC03', subjectCodes: ['CGV'], maxLoadPerWeek: 18 },
    { name: 'Dr. Meena Patel', code: 'FAC04', subjectCodes: ['CN'], maxLoadPerWeek: 20 },
    { name: 'Dr. Vikram Desai', code: 'FAC05', subjectCodes: ['PPL'], maxLoadPerWeek: 18 },
    { name: 'Dr. Sunita Rao', code: 'FAC06', subjectCodes: ['DM'], maxLoadPerWeek: 16 },
    { name: 'Dr. Karthik Nair', code: 'FAC07', subjectCodes: ['MSP'], maxLoadPerWeek: 16 },
    { name: 'Dr. Ananya Gupta', code: 'FAC08', subjectCodes: ['OR'], maxLoadPerWeek: 16 },
    { name: 'Prof. Ravi Verma', code: 'FAC09', subjectCodes: ['DAA', 'DBMS'], maxLoadPerWeek: 22 },
    { name: 'Prof. Deepa Joshi', code: 'FAC10', subjectCodes: ['CN', 'CGV'], maxLoadPerWeek: 22 },
    { name: 'Prof. Amit Kulkarni', code: 'FAC11', subjectCodes: ['PPL', 'DM'], maxLoadPerWeek: 20 },
    { name: 'Prof. Neha Reddy', code: 'FAC12', subjectCodes: ['DBMS', 'CN'], maxLoadPerWeek: 20 },
  ];

  for (const f of facultyData) {
    await Faculty.create({ ...f, institutionId: instId, unavailableSlots: [] });
  }

  console.log('[Seed] ✅ Seed complete!');
  console.log(`  Institution: ${institution.name} — ${institution.semester}`);
  console.log(`  Sections: ${Object.keys(sectionIds).join(', ')}`);
  console.log(`  Rooms: ${roomData.length}`);
  console.log(`  Subjects: ${subjectData.length}`);
  console.log(`  Faculty: ${facultyData.length}`);
  console.log(`  Admin login: admin@timetable.edu / admin123`);
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeed().then(() => {
    mongoose.disconnect();
    process.exit(0);
  }).catch((err) => {
    console.error('[Seed] Error:', err);
    process.exit(1);
  });
}
