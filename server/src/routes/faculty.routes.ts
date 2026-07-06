import { Router } from 'express';
import { z } from 'zod';
import { Faculty } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { DayOfWeek, UserRole } from '@timetable/types';

export const facultyRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  subjectCodes: z.array(z.string()).min(1),
  maxLoadPerWeek: z.number().min(1).max(40),
  unavailableSlots: z.array(z.object({
    day: z.nativeEnum(DayOfWeek),
    timeBandIndex: z.number().min(0),
  })).default([]),
  institutionId: z.string().min(1),
});

facultyRouter.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), validate(createSchema), async (req, res, next) => {
  try {
    const faculty = await Faculty.create(req.body);
    res.status(201).json({ success: true, data: faculty });
  } catch (err) {
    next(err);
  }
});

facultyRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = req.query.institutionId ? { institutionId: req.query.institutionId } : {};
    const faculty = await Faculty.find(filter).sort({ name: 1 });
    res.json({ success: true, data: faculty });
  } catch (err) {
    next(err);
  }
});

facultyRouter.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!faculty) throw new AppError('Faculty not found', 404);
    res.json({ success: true, data: faculty });
  } catch (err) {
    next(err);
  }
});

facultyRouter.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res, next) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);
    if (!faculty) throw new AppError('Faculty not found', 404);
    res.json({ success: true, message: 'Faculty deleted' });
  } catch (err) {
    next(err);
  }
});

// CSV/Excel bulk import
facultyRouter.post('/import', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const { data, institutionId } = req.body;
    if (!Array.isArray(data) || !institutionId) {
      throw new AppError('Invalid import data', 400);
    }

    let success = 0;
    let failed = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        await Faculty.create({ ...data[i], institutionId });
        success++;
      } catch (err: any) {
        failed++;
        errors.push({ row: i + 1, message: err.message });
      }
    }

    res.json({ success: true, data: { success, failed, errors } });
  } catch (err) {
    next(err);
  }
});
