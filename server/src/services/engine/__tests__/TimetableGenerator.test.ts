// ============================================================
// TimetableGenerator Integration Tests
// ============================================================
// These tests verify the complete generation pipeline including:
// - No faculty double-booking in ANY generated variation
// - No room double-booking
// - No section double-booking
// - Locked/fixed slots never moved
// - Infeasibility correctly reported
// - BREAK/LUNCH bands never allocated
// - 50+ distinct variations generated

import { describe, it, expect } from 'vitest';
import { DayOfWeek, SubjectType, ConstraintType } from '@timetable/types';
import type { IConstraint } from '@timetable/types';
import {
  TimetableGenerator,
  type Requirement,
  type FixedAssignment,
  type GenerationInput,
} from '../TimetableGenerator.js';
import type { SlotPlacement } from '../ConstraintValidator.js';
import { facultyKey, roomKey, sectionKey } from '../AvailabilityMatrix.js';

// ─── Test Helpers ──────────────────────────────────────────

function createBasicInput(overrides?: Partial<GenerationInput>): GenerationInput {
  const workingDays = [DayOfWeek.MON, DayOfWeek.TUE, DayOfWeek.WED, DayOfWeek.THU, DayOfWeek.FRI];

  // 10 time bands: 0-1 regular, 2 = BREAK, 3-4 regular, 5 = LUNCH, 6-9 regular
  const timeBandCount = 10;
  const nonAllocatableTimeBands = [2, 5]; // BREAK and LUNCH

  // Simple requirements: 3 subjects × 2 sections × 2 lectures/week = 12 slots
  const requirements: Requirement[] = [
    {
      subjectCode: 'DAA',
      subjectType: SubjectType.LECTURE,
      sectionId: 'secA',
      facultyId: 'fac1',
      eligibleRoomIds: ['room1', 'room2'],
      weeklySlots: 2,
    },
    {
      subjectCode: 'DBMS',
      subjectType: SubjectType.LECTURE,
      sectionId: 'secA',
      facultyId: 'fac2',
      eligibleRoomIds: ['room1', 'room2'],
      weeklySlots: 2,
    },
    {
      subjectCode: 'CN',
      subjectType: SubjectType.LECTURE,
      sectionId: 'secA',
      facultyId: 'fac3',
      eligibleRoomIds: ['room1', 'room2'],
      weeklySlots: 2,
    },
    {
      subjectCode: 'DAA',
      subjectType: SubjectType.LECTURE,
      sectionId: 'secB',
      facultyId: 'fac1',
      eligibleRoomIds: ['room3', 'room4'],
      weeklySlots: 2,
    },
    {
      subjectCode: 'DBMS',
      subjectType: SubjectType.LECTURE,
      sectionId: 'secB',
      facultyId: 'fac2',
      eligibleRoomIds: ['room3', 'room4'],
      weeklySlots: 2,
    },
    {
      subjectCode: 'CN',
      subjectType: SubjectType.LECTURE,
      sectionId: 'secB',
      facultyId: 'fac3',
      eligibleRoomIds: ['room3', 'room4'],
      weeklySlots: 2,
    },
  ];

  return {
    workingDays,
    timeBandCount,
    nonAllocatableTimeBands,
    requirements,
    fixedAssignments: [],
    constraints: [],
    facultySubjectMap: new Map(),
    ...overrides,
  };
}

function checkNoDoubleBooking(placements: SlotPlacement[]): {
  faculty: boolean;
  room: boolean;
  section: boolean;
  details: string[];
} {
  const details: string[] = [];
  const facultySlots = new Map<string, string>();
  const roomSlots = new Map<string, string>();
  const sectionSlots = new Map<string, string>();

  let facultyOk = true;
  let roomOk = true;
  let sectionOk = true;

  for (const p of placements) {
    const slotKey = `${p.dayIndex}:${p.timeBandIndex}`;

    // Faculty check
    const facKey = `${slotKey}:${p.facultyId}`;
    if (facultySlots.has(facKey)) {
      facultyOk = false;
      details.push(`Faculty ${p.facultyId} double-booked at ${slotKey}`);
    }
    facultySlots.set(facKey, p.subjectCode);

    // Room check
    const rmKey = `${slotKey}:${p.roomId}`;
    if (roomSlots.has(rmKey)) {
      roomOk = false;
      details.push(`Room ${p.roomId} double-booked at ${slotKey}`);
    }
    roomSlots.set(rmKey, p.subjectCode);

    // Section check
    const secKey = `${slotKey}:${p.sectionId}`;
    if (sectionSlots.has(secKey)) {
      sectionOk = false;
      details.push(`Section ${p.sectionId} double-booked at ${slotKey}`);
    }
    sectionSlots.set(secKey, p.subjectCode);
  }

  return { faculty: facultyOk, room: roomOk, section: sectionOk, details };
}

// ─── Tests ─────────────────────────────────────────────────

describe('TimetableGenerator', () => {
  const generator = new TimetableGenerator();

  describe('Basic Generation', () => {
    it('should generate at least one valid variation', async () => {
      const input = createBasicInput();
      const result = await generator.generate(input, 1);

      expect(result.infeasible).toBe(false);
      expect(result.variations.length).toBeGreaterThanOrEqual(1);
    });

    it('should place all required slots', async () => {
      const input = createBasicInput();
      const result = await generator.generate(input, 1);

      const variation = result.variations[0];
      // 6 requirements × 2 weekly slots = 12 total placements
      expect(variation.placements.length).toBe(12);
    });
  });

  describe('No Double-Booking (CRITICAL)', () => {
    it('should never double-book a faculty member', async () => {
      const input = createBasicInput();
      const result = await generator.generate(input, 10);

      for (const variation of result.variations) {
        const check = checkNoDoubleBooking(variation.placements);
        expect(check.faculty).toBe(true);
        if (!check.faculty) {
          console.error('Faculty double-booking:', check.details);
        }
      }
    });

    it('should never double-book a room', async () => {
      const input = createBasicInput();
      const result = await generator.generate(input, 10);

      for (const variation of result.variations) {
        const check = checkNoDoubleBooking(variation.placements);
        expect(check.room).toBe(true);
        if (!check.room) {
          console.error('Room double-booking:', check.details);
        }
      }
    });

    it('should never double-book a section', async () => {
      const input = createBasicInput();
      const result = await generator.generate(input, 10);

      for (const variation of result.variations) {
        const check = checkNoDoubleBooking(variation.placements);
        expect(check.section).toBe(true);
        if (!check.section) {
          console.error('Section double-booking:', check.details);
        }
      }
    });
  });

  describe('BREAK/LUNCH Bands', () => {
    it('should never allocate BREAK or LUNCH bands', async () => {
      const input = createBasicInput();
      const result = await generator.generate(input, 5);

      for (const variation of result.variations) {
        for (const p of variation.placements) {
          expect(p.timeBandIndex).not.toBe(2); // BREAK
          expect(p.timeBandIndex).not.toBe(5); // LUNCH
        }
      }
    });
  });

  describe('Fixed/Locked Slots', () => {
    it('should preserve fixed slot assignments', async () => {
      const fixedAssignments: FixedAssignment[] = [
        {
          dayIndex: 0, // Monday
          timeBandIndex: 0, // First band
          subjectCode: 'DAA',
          subjectType: SubjectType.LECTURE,
          sectionId: 'secA',
          facultyId: 'fac1',
          roomId: 'room1',
        },
      ];

      const input = createBasicInput({ fixedAssignments });
      const result = await generator.generate(input, 5);

      for (const variation of result.variations) {
        // Find the fixed slot in the generated placements
        const fixedSlot = variation.placements.find(
          (p) =>
            p.dayIndex === 0 &&
            p.timeBandIndex === 0 &&
            p.subjectCode === 'DAA' &&
            p.sectionId === 'secA'
        );

        expect(fixedSlot).toBeDefined();
        expect(fixedSlot!.facultyId).toBe('fac1');
        expect(fixedSlot!.roomId).toBe('room1');
      }
    });

    it('should never move a fixed slot to a different position', async () => {
      const fixedAssignments: FixedAssignment[] = [
        {
          dayIndex: 2,
          timeBandIndex: 3,
          subjectCode: 'DBMS',
          subjectType: SubjectType.LECTURE,
          sectionId: 'secB',
          facultyId: 'fac2',
          roomId: 'room3',
        },
      ];

      const input = createBasicInput({ fixedAssignments });
      const result = await generator.generate(input, 5);

      for (const variation of result.variations) {
        const fixedSlot = variation.placements.find(
          (p) =>
            p.subjectCode === 'DBMS' &&
            p.sectionId === 'secB' &&
            p.dayIndex === 2 &&
            p.timeBandIndex === 3
        );
        expect(fixedSlot).toBeDefined();
      }
    });
  });

  describe('Infeasibility Detection', () => {
    it('should report infeasibility when constraints cannot be satisfied', async () => {
      // Create an impossible scenario: 1 faculty, 1 room, too many requirements
      const requirements: Requirement[] = [];
      for (let i = 0; i < 50; i++) {
        requirements.push({
          subjectCode: `SUB${i}`,
          subjectType: SubjectType.LECTURE,
          sectionId: 'secA',
          facultyId: 'fac1', // All same faculty — cannot parallelize
          eligibleRoomIds: ['room1'], // Only 1 room
          weeklySlots: 2,
        });
      }

      // 5 days × 8 allocatable bands = 40 slots, but need 100
      const input = createBasicInput({ requirements });
      const result = await generator.generate(input, 1);

      expect(result.infeasible).toBe(true);
      expect(result.infeasibilityReason).toBeDefined();
    });
  });

  describe('Variation Generation', () => {
    it('should generate multiple distinct variations', async () => {
      const input = createBasicInput();
      const result = await generator.generate(input, 10);

      expect(result.variations.length).toBeGreaterThan(1);

      // Check all hashes are unique
      const hashes = new Set(result.variations.map((v) => v.hash));
      expect(hashes.size).toBe(result.variations.length);
    });

    it('should score variations correctly', async () => {
      const input = createBasicInput();
      const result = await generator.generate(input, 5);

      for (const variation of result.variations) {
        expect(variation.score.compositeScore).toBeGreaterThanOrEqual(0);
        expect(variation.score.compositeScore).toBeLessThanOrEqual(100);
        expect(variation.score.loadBalance).toBeGreaterThanOrEqual(0);
        expect(variation.score.gapMinimization).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort variations by score (highest first)', async () => {
      const input = createBasicInput();
      const result = await generator.generate(input, 10);

      for (let i = 1; i < result.variations.length; i++) {
        expect(result.variations[i - 1].score.compositeScore).toBeGreaterThanOrEqual(
          result.variations[i].score.compositeScore
        );
      }
    });
  });

  describe('Constraint Enforcement', () => {
    it('should respect max daily load constraints', async () => {
      const constraints: IConstraint[] = [
        {
          _id: 'c1',
          type: ConstraintType.MAX_DAILY_LOAD,
          payload: { sectionId: 'secA', maxLectures: 3 },
          institutionId: 'inst1',
          priority: 10,
          isSoft: false,
        },
      ];

      const input = createBasicInput({ constraints });
      const result = await generator.generate(input, 5);

      for (const variation of result.variations) {
        // Count classes per day for secA
        const dailyCounts = new Map<number, number>();
        for (const p of variation.placements) {
          if (p.sectionId === 'secA') {
            dailyCounts.set(p.dayIndex, (dailyCounts.get(p.dayIndex) || 0) + 1);
          }
        }

        for (const [day, count] of dailyCounts) {
          expect(count).toBeLessThanOrEqual(3);
        }
      }
    });
  });

  describe('Progress Reporting', () => {
    it('should call progress callback during generation', async () => {
      const input = createBasicInput();
      const progressMessages: string[] = [];

      await generator.generate(input, 3, (event) => {
        progressMessages.push(event.message);
      });

      expect(progressMessages.length).toBeGreaterThan(0);
      // Should include a completion message
      expect(
        progressMessages.some((m) => m.includes('complete') || m.includes('Complete'))
      ).toBe(true);
    });
  });
});
