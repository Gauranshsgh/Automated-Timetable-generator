import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// ─── Frontend Serving (Production) ───────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

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
