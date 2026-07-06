import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { Institution, Faculty, Subject, Section, Room, Constraint, TimetableSlot, TimetableVersion } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { UserRole, SubjectType, RoomType } from '@timetable/types';
import type { IConstraint } from '@timetable/types';
import { TimetableGenerator, type Requirement, type GenerationInput, type FixedAssignment } from '../services/engine/index.js';

export const timetableRouter = Router();

// ─── Active SSE Connections ──────────────────────────────────
const activeConnections = new Map<string, Response>();

// ─── Generate Timetable ──────────────────────────────────────
const generateSchema = z.object({
  institutionId: z.string().min(1),
  variationCount: z.number().min(1).max(200).default(50),
});

timetableRouter.post('/generate', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), validate(generateSchema), async (req: AuthRequest, res, next) => {
  try {
    const { institutionId, variationCount } = req.body;

    // Load all required data
    const [institution, faculty, subjects, sections, rooms, constraints] = await Promise.all([
      Institution.findById(institutionId),
      Faculty.find({ institutionId }),
      Subject.find({ institutionId }),
      Section.find({ institutionId }),
      Room.find({ institutionId }),
      Constraint.find({ institutionId }),
    ]);

    if (!institution) throw new AppError('Institution not found', 404);

    // Generate a job ID for SSE tracking
    const jobId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Respond immediately with the job ID
    res.json({ success: true, data: { jobId } });

    // Build generation input
    const nonAllocatableTimeBands = institution.timeBands
      .map((tb, i) => (tb.isBreak || tb.isLunch) ? i : -1)
      .filter((i) => i >= 0);

    // Build requirements from subjects
    const requirements: Requirement[] = [];
    for (const subject of subjects) {
      for (const wh of subject.weeklyHours) {
        for (const sectionId of subject.sectionIds) {
          // Find a faculty member who teaches this subject
          const assignedFaculty = faculty.find((f) =>
            f.subjectCodes.includes(subject.code)
          );
          if (!assignedFaculty) continue;

          // Find eligible rooms based on subject type
          const eligibleRooms = rooms.filter((r) => {
            if (wh.type === SubjectType.PRACTICAL) return r.type === RoomType.LAB;
            if (wh.type === SubjectType.LECTURE) return r.type === RoomType.CLASSROOM || r.type === RoomType.LECTURE_THEATRE;
            return true;
          });

          if (eligibleRooms.length === 0) continue;

          requirements.push({
            subjectCode: subject.code,
            subjectType: wh.type,
            sectionId: sectionId,
            facultyId: assignedFaculty._id.toString(),
            eligibleRoomIds: eligibleRooms.map((r) => r._id.toString()),
            weeklySlots: wh.hours,
          });
        }
      }
    }

    // Get locked/fixed slots
    const fixedConstraints = constraints.filter((c) => c.type === 'fixed_slot');
    const fixedAssignments: FixedAssignment[] = fixedConstraints.map((c) => ({
      dayIndex: c.payload.day as number,
      timeBandIndex: c.payload.timeBandIndex as number,
      subjectCode: c.payload.subjectCode as string,
      subjectType: c.payload.subjectType as SubjectType,
      sectionId: c.payload.sectionId as string,
      facultyId: c.payload.facultyId as string,
      roomId: c.payload.roomId as string,
    }));

    const genInput: GenerationInput = {
      workingDays: institution.workingDays,
      timeBandCount: institution.timeBands.length,
      nonAllocatableTimeBands,
      requirements,
      fixedAssignments,
      constraints: constraints.map((c) => c.toObject() as IConstraint),
      facultySubjectMap: new Map(),
    };

    // Run generation asynchronously
    const generator = new TimetableGenerator();

    generator.generate(genInput, variationCount, (event) => {
      // Send progress via SSE to connected clients
      const sseRes = activeConnections.get(jobId);
      if (sseRes) {
        sseRes.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    }).then(async (result) => {
      // Save variations to DB
      for (const variation of result.variations) {
        const version = await TimetableVersion.create({
          institutionId,
          slots: [],
          score: variation.score.compositeScore,
          generatedAt: new Date(),
          isPublished: false,
          customAnnotations: [],
          createdBy: req.userId,
        });

        // Create slots
        const slots = await TimetableSlot.insertMany(
          variation.placements.map((p) => ({
            day: institution.workingDays[p.dayIndex],
            timeBandIndex: p.timeBandIndex,
            subjectCode: p.subjectCode,
            type: p.subjectType,
            sectionId: p.sectionId,
            facultyId: p.facultyId,
            roomId: p.roomId,
            locked: false,
            isManualOverride: false,
            timetableVersionId: version._id.toString(),
          }))
        );

        version.slots = slots.map((s) => s._id.toString());
        await version.save();
      }

      // Notify SSE clients of completion
      const sseRes = activeConnections.get(jobId);
      if (sseRes) {
        sseRes.write(`data: ${JSON.stringify({
          type: 'complete',
          message: result.infeasible
            ? `Generation failed: ${result.infeasibilityReason}`
            : `Complete! ${result.variations.length} variations generated.`,
          percentage: 100,
          variationsFound: result.variations.length,
          currentAction: 'complete',
          infeasible: result.infeasible,
        })}\n\n`);
        sseRes.end();
        activeConnections.delete(jobId);
      }
    }).catch((err) => {
      const sseRes = activeConnections.get(jobId);
      if (sseRes) {
        sseRes.write(`data: ${JSON.stringify({
          type: 'error',
          message: `Generation error: ${err.message}`,
          percentage: 0,
          variationsFound: 0,
          currentAction: 'error',
        })}\n\n`);
        sseRes.end();
        activeConnections.delete(jobId);
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── SSE Progress Stream ─────────────────────────────────────
timetableRouter.get('/generate/:jobId/progress', authenticate, (req: AuthRequest, res) => {
  const { jobId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to progress stream' })}\n\n`);

  activeConnections.set(jobId, res);

  req.on('close', () => {
    activeConnections.delete(jobId);
  });
});

// ─── List Versions ───────────────────────────────────────────
timetableRouter.get('/versions', authenticate, async (req, res, next) => {
  try {
    const filter = req.query.institutionId ? { institutionId: req.query.institutionId } : {};
    const versions = await TimetableVersion.find(filter)
      .sort({ score: -1, generatedAt: -1 })
      .select('-slots');
    res.json({ success: true, data: versions });
  } catch (err) {
    next(err);
  }
});

// ─── Delete Version ──────────────────────────────────────────
timetableRouter.delete('/versions/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const version = await TimetableVersion.findByIdAndDelete(req.params.id);
    if (!version) throw new AppError('Version not found', 404);
    
    // Also delete all associated slots
    await TimetableSlot.deleteMany({ timetableVersionId: version._id.toString() });
    
    res.json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
});

// ─── Get Full Version ────────────────────────────────────────
timetableRouter.get('/versions/:id', authenticate, async (req, res, next) => {
  try {
    const version = await TimetableVersion.findById(req.params.id);
    if (!version) throw new AppError('Version not found', 404);

    const slots = await TimetableSlot.find({ timetableVersionId: version._id.toString() });

    res.json({
      success: true,
      data: { ...version.toObject(), slots },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Publish Version ─────────────────────────────────────────
timetableRouter.put('/versions/:id/publish', authenticate, authorize(UserRole.ADMIN), async (req, res, next) => {
  try {
    // Unpublish all other versions for this institution
    const version = await TimetableVersion.findById(req.params.id);
    if (!version) throw new AppError('Version not found', 404);

    await TimetableVersion.updateMany(
      { institutionId: version.institutionId },
      { isPublished: false }
    );

    version.isPublished = true;
    await version.save();

    res.json({ success: true, data: version });
  } catch (err) {
    next(err);
  }
});

// ─── Update Slot ─────────────────────────────────────────────
timetableRouter.put('/slots/:id', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const slot = await TimetableSlot.findByIdAndUpdate(
      req.params.id,
      { ...req.body, isManualOverride: true },
      { new: true, runValidators: true }
    );
    if (!slot) throw new AppError('Slot not found', 404);
    res.json({ success: true, data: slot });
  } catch (err) {
    next(err);
  }
});

// ─── Swap Slots ──────────────────────────────────────────────
timetableRouter.post('/slots/swap', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const { slotIdA, slotIdB } = req.body;

    const slotA = await TimetableSlot.findById(slotIdA);
    const slotB = await TimetableSlot.findById(slotIdB);

    if (!slotA || !slotB) throw new AppError('One or both slots not found', 404);
    if (slotA.locked || slotB.locked) throw new AppError('Cannot swap locked slots', 400);

    // Swap day and timeBand
    const tempDay = slotA.day;
    const tempTimeBand = slotA.timeBandIndex;

    slotA.day = slotB.day;
    slotA.timeBandIndex = slotB.timeBandIndex;
    slotA.isManualOverride = true;

    slotB.day = tempDay;
    slotB.timeBandIndex = tempTimeBand;
    slotB.isManualOverride = true;

    await slotA.save();
    await slotB.save();

    res.json({ success: true, data: { slotA, slotB } });
  } catch (err) {
    next(err);
  }
});

// ─── Toggle Lock ─────────────────────────────────────────────
timetableRouter.post('/slots/:id/lock', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const slot = await TimetableSlot.findById(req.params.id);
    if (!slot) throw new AppError('Slot not found', 404);

    slot.locked = !slot.locked;
    await slot.save();

    res.json({ success: true, data: slot });
  } catch (err) {
    next(err);
  }
});

// ─── Add/Update Annotation ──────────────────────────────────
timetableRouter.post('/versions/:id/annotate', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const { cellRef, text } = req.body;
    const version = await TimetableVersion.findById(req.params.id);
    if (!version) throw new AppError('Version not found', 404);

    const existingIdx = version.customAnnotations.findIndex(
      (a) => a.cellRef === cellRef
    );

    if (existingIdx >= 0) {
      if (text) {
        version.customAnnotations[existingIdx].text = text;
      } else {
        version.customAnnotations.splice(existingIdx, 1);
      }
    } else if (text) {
      version.customAnnotations.push({ cellRef, text });
    }

    await version.save();
    res.json({ success: true, data: version });
  } catch (err) {
    next(err);
  }
});

// ─── Save Snapshot (for undo) ────────────────────────────────
timetableRouter.post('/versions/:id/snapshot', authenticate, authorize(UserRole.ADMIN, UserRole.COORDINATOR), async (req, res, next) => {
  try {
    const version = await TimetableVersion.findById(req.params.id);
    if (!version) throw new AppError('Version not found', 404);

    // Clone all slots
    const existingSlots = await TimetableSlot.find({ timetableVersionId: version._id.toString() });

    const newVersion = await TimetableVersion.create({
      institutionId: version.institutionId,
      slots: [],
      score: version.score,
      generatedAt: version.generatedAt,
      isPublished: false,
      customAnnotations: version.customAnnotations,
      parentVersionId: version._id.toString(),
      createdBy: version.createdBy,
    });

    const newSlots = await TimetableSlot.insertMany(
      existingSlots.map((s) => ({
        day: s.day,
        timeBandIndex: s.timeBandIndex,
        subjectCode: s.subjectCode,
        type: s.type,
        sectionId: s.sectionId,
        facultyId: s.facultyId,
        roomId: s.roomId,
        locked: s.locked,
        isManualOverride: s.isManualOverride,
        timetableVersionId: newVersion._id.toString(),
      }))
    );

    newVersion.slots = newSlots.map((s) => s._id.toString());
    await newVersion.save();

    res.status(201).json({ success: true, data: newVersion });
  } catch (err) {
    next(err);
  }
});

// ─── Conflict Check ──────────────────────────────────────────
timetableRouter.post('/slots/check-conflict', authenticate, async (req, res, next) => {
  try {
    const { timetableVersionId, day, timeBandIndex, facultyId, roomId, sectionId, excludeSlotId } = req.body;

    const filter: Record<string, unknown> = {
      timetableVersionId,
      day,
      timeBandIndex,
    };

    const conflicts = [];

    // Check faculty conflict
    if (facultyId) {
      const facConflict = await TimetableSlot.findOne({
        ...filter,
        facultyId,
        _id: { $ne: excludeSlotId },
      });
      if (facConflict) {
        conflicts.push({
          type: 'faculty',
          description: `Faculty already teaching ${facConflict.subjectCode} at this time`,
          existingSlotId: facConflict._id.toString(),
        });
      }
    }

    // Check room conflict
    if (roomId) {
      const roomConflict = await TimetableSlot.findOne({
        ...filter,
        roomId,
        _id: { $ne: excludeSlotId },
      });
      if (roomConflict) {
        conflicts.push({
          type: 'room',
          description: `Room already occupied by ${roomConflict.subjectCode} at this time`,
          existingSlotId: roomConflict._id.toString(),
        });
      }
    }

    // Check section conflict
    if (sectionId) {
      const secConflict = await TimetableSlot.findOne({
        ...filter,
        sectionId,
        _id: { $ne: excludeSlotId },
      });
      if (secConflict) {
        conflicts.push({
          type: 'section',
          description: `Section already has ${secConflict.subjectCode} at this time`,
          existingSlotId: secConflict._id.toString(),
        });
      }
    }

    res.json({
      success: true,
      data: {
        hasConflict: conflicts.length > 0,
        conflicts,
      },
    });
  } catch (err) {
    next(err);
  }
});
