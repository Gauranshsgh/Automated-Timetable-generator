import { Router } from 'express';
import { z } from 'zod';
import { Room } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { RoomType, UserRole } from '@timetable/types';

export const roomRouter = Router();

const createSchema = z.object({
  code: z.string().min(1),
  capacity: z.number().min(1),
  type: z.nativeEnum(RoomType),
  institutionId: z.string().min(1),
});

roomRouter.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), validate(createSchema), async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

roomRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = req.query.institutionId ? { institutionId: req.query.institutionId } : {};
    const rooms = await Room.find(filter).sort({ code: 1 });
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
});

roomRouter.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) throw new AppError('Room not found', 404);
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

roomRouter.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res, next) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) throw new AppError('Room not found', 404);
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    next(err);
  }
});

roomRouter.post('/import', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const { data, institutionId } = req.body;
    if (!Array.isArray(data) || !institutionId) throw new AppError('Invalid import data', 400);

    let success = 0, failed = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      try {
        await Room.create({ ...data[i], institutionId });
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
