import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { UserRole } from '@timetable/types';

export const exportRouter = Router();

// ─── CSV Import Templates ────────────────────────────────────
exportRouter.get('/template/faculty', (_req, res) => {
  const csv = 'name,code,subjectCodes,maxLoadPerWeek\nDr. John Doe,FAC01,"DAA,DBMS",20\nDr. Jane Smith,FAC02,"CN,PPL",18';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=faculty_template.csv');
  res.send(csv);
});

exportRouter.get('/template/subjects', (_req, res) => {
  const csv = 'code,fullName,types,weeklyHoursL,weeklyHoursP,weeklyHoursT\nDAA,Design and Analysis of Algorithms,"L,P",3,2,0\nDBMS,Database Management Systems,"L,P",3,2,0';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=subjects_template.csv');
  res.send(csv);
});

exportRouter.get('/template/rooms', (_req, res) => {
  const csv = 'code,capacity,type\nCC3-5106,60,classroom\nCC3-5242,40,lab\nLT-3113,200,lecture-theatre';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=rooms_template.csv');
  res.send(csv);
});

// ─── PDF Export (Puppeteer — available in Docker deployments) ─
exportRouter.post('/pdf/:versionId', authenticate, async (req, res, next) => {
  try {
    // In production Docker environments, this would use Puppeteer
    // For now, return a 501 indicating the client-side fallback should be used
    res.status(501).json({
      success: false,
      error: 'Server-side PDF export requires Puppeteer (available in Docker deployments). Use client-side export.',
      fallback: 'client',
    });
  } catch (err) {
    next(err);
  }
});
