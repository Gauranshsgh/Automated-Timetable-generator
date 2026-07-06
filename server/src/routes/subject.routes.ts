import { Router } from 'express';
import { z } from 'zod';
import { Subject } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { SubjectType, UserRole } from '@timetable/types';

export const subjectRouter = Router();

const createSchema = z.object({
  code: z.string().min(1),
  fullName: z.string().min(1),
  types: z.array(z.nativeEnum(SubjectType)).min(1),
  weeklyHours: z.array(z.object({
    type: z.nativeEnum(SubjectType),
    hours: z.number().min(0),
  })).min(1),
  sectionIds: z.array(z.string()).min(1),
  institutionId: z.string().min(1),
});

subjectRouter.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), validate(createSchema), async (req, res, next) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

subjectRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = req.query.institutionId ? { institutionId: req.query.institutionId } : {};
    const subjects = await Subject.find(filter).sort({ code: 1 });
    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
});

subjectRouter.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!subject) throw new AppError('Subject not found', 404);
    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
});

subjectRouter.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) throw new AppError('Subject not found', 404);
    res.json({ success: true, message: 'Subject deleted' });
  } catch (err) {
    next(err);
  }
});

subjectRouter.post('/import', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const { data, institutionId } = req.body;
    if (!Array.isArray(data) || !institutionId) throw new AppError('Invalid import data', 400);

    let success = 0, failed = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        await Subject.create({ ...data[i], institutionId });
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
