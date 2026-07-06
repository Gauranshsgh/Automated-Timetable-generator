import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';
import type { UserRole } from '@timetable/types';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      role: UserRole;
    };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}
