import { Router } from 'express';
import { z } from 'zod';
import { Constraint } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { ConstraintType, UserRole } from '@timetable/types';

export const constraintRouter = Router();

const createSchema = z.object({
  type: z.nativeEnum(ConstraintType),
  payload: z.record(z.unknown()),
  institutionId: z.string().min(1),
  priority: z.number().min(0).max(100).default(1),
  isSoft: z.boolean().default(false),
});

constraintRouter.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), validate(createSchema), async (req, res, next) => {
  try {
    const constraint = await Constraint.create(req.body);
    res.status(201).json({ success: true, data: constraint });
  } catch (err) {
    next(err);
  }
});

constraintRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = req.query.institutionId ? { institutionId: req.query.institutionId } : {};
    const constraints = await Constraint.find(filter).sort({ priority: -1 });
    res.json({ success: true, data: constraints });
  } catch (err) {
    next(err);
  }
});

constraintRouter.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const constraint = await Constraint.findByIdAndDelete(req.params.id);
    if (!constraint) throw new AppError('Constraint not found', 404);
    res.json({ success: true, message: 'Constraint deleted' });
  } catch (err) {
    next(err);
  }
});
