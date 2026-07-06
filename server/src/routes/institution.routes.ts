import { Router } from 'express';
import { z } from 'zod';
import { Institution } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { DayOfWeek, UserRole } from '@timetable/types';

export const institutionRouter = Router();

const timeBandSchema = z.object({
  label: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  order: z.number(),
  isBreak: z.boolean().default(false),
  isLunch: z.boolean().default(false),
});

const createSchema = z.object({
  name: z.string().min(1),
  batch: z.string().min(1),
  semester: z.string().min(1),
  workingDays: z.array(z.nativeEnum(DayOfWeek)).min(1),
  timeBands: z.array(timeBandSchema).min(1),
});

// Create
institutionRouter.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), validate(createSchema), async (req: AuthRequest, res, next) => {
  try {
    const institution = await Institution.create({ ...req.body, createdBy: req.userId });
    res.status(201).json({ success: true, data: institution });
  } catch (err) {
    next(err);
  }
});

// List
institutionRouter.get('/', authenticate, async (_req, res, next) => {
  try {
    const institutions = await Institution.find().sort({ createdAt: -1 });
    res.json({ success: true, data: institutions });
  } catch (err) {
    next(err);
  }
});

// Get by ID
institutionRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) throw new AppError('Institution not found', 404);
    res.json({ success: true, data: institution });
  } catch (err) {
    next(err);
  }
});

// Update
institutionRouter.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), validate(createSchema), async (req, res, next) => {
  try {
    const institution = await Institution.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!institution) throw new AppError('Institution not found', 404);
    res.json({ success: true, data: institution });
  } catch (err) {
    next(err);
  }
});
