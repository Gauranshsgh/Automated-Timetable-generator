import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { institutionRouter } from './routes/institution.routes.js';
import { facultyRouter } from './routes/faculty.routes.js';
import { subjectRouter } from './routes/subject.routes.js';
import { sectionRouter } from './routes/section.routes.js';
import { roomRouter } from './routes/room.routes.js';
import { constraintRouter } from './routes/constraint.routes.js';
import { timetableRouter } from './routes/timetable.routes.js';
import { exportRouter } from './routes/export.routes.js';

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/institutions', institutionRouter);
app.use('/api/faculty', facultyRouter);
app.use('/api/subjects', subjectRouter);
app.use('/api/sections', sectionRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/constraints', constraintRouter);
app.use('/api/timetable', timetableRouter);
app.use('/api/export', exportRouter);

// ─── Error Handler ───────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port} (${config.nodeEnv})`);
  });
}

start().catch(console.error);

export default app;
