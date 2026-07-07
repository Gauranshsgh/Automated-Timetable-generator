import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { User } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { UserRole } from '@timetable/types';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
  institutionId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Register ────────────────────────────────────────────────
authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, role, institutionId } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      passwordHash,
      name,
      role,
      institutionId,
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      config.jwt.refreshSecret as jwt.Secret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          institutionId: user.institutionId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Login ───────────────────────────────────────────────────
authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      config.jwt.refreshSecret as jwt.Secret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          institutionId: user.institutionId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get Current User ────────────────────────────────────────
authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        institutionId: user.institutionId,
      },
    });
  } catch (err) {
    next(err);
  }
});
