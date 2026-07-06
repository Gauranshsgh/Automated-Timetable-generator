import { Router } from 'express';
import { z } from 'zod';
import { Section } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { UserRole } from '@timetable/types';

export const sectionRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  batchGrouping: z.string().optional(),
  studentCount: z.number().min(1),
  institutionId: z.string().min(1),
});

sectionRouter.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), validate(createSchema), async (req, res, next) => {
  try {
    const section = await Section.create(req.body);
    res.status(201).json({ success: true, data: section });
  } catch (err) {
    next(err);
  }
});

sectionRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = req.query.institutionId ? { institutionId: req.query.institutionId } : {};
    const sections = await Section.find(filter).sort({ name: 1 });
    res.json({ success: true, data: sections });
  } catch (err) {
    next(err);
  }
});

sectionRouter.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!section) throw new AppError('Section not found', 404);
    res.json({ success: true, data: section });
  } catch (err) {
    next(err);
  }
});

sectionRouter.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res, next) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) throw new AppError('Section not found', 404);
    res.json({ success: true, message: 'Section deleted' });
  } catch (err) {
    next(err);
  }
});
