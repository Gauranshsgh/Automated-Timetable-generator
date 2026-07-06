// ============================================================
// AvailabilityMatrix Unit Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { DayOfWeek } from '@timetable/types';
import {
  AvailabilityMatrix,
  facultyKey,
  roomKey,
  sectionKey,
} from '../AvailabilityMatrix.js';

describe('AvailabilityMatrix', () => {
  let matrix: AvailabilityMatrix;
  const workingDays = [DayOfWeek.MON, DayOfWeek.TUE, DayOfWeek.WED, DayOfWeek.THU, DayOfWeek.FRI];
  const timeBandCount = 10;
  const breakBands = [2, 5]; // indices for BREAK and LUNCH

  beforeEach(() => {
    matrix = new AvailabilityMatrix(workingDays, timeBandCount, breakBands);
  });

  describe('O(1) Lookups', () => {
    it('should report empty cells as not occupied', () => {
      expect(matrix.isOccupied(0, 0, facultyKey('f1'))).toBe(false);
      expect(matrix.isOccupied(0, 0, roomKey('r1'))).toBe(false);
      expect(matrix.isOccupied(0, 0, sectionKey('s1'))).toBe(false);
    });

    it('should mark and detect occupied cells in O(1)', () => {
      matrix.markOccupied(0, 0, facultyKey('f1'));
      expect(matrix.isOccupied(0, 0, facultyKey('f1'))).toBe(true);
      expect(matrix.isOccupied(0, 0, facultyKey('f2'))).toBe(false);
      expect(matrix.isOccupied(0, 1, facultyKey('f1'))).toBe(false);
      expect(matrix.isOccupied(1, 0, facultyKey('f1'))).toBe(false);
    });

    it('should mark and free cells correctly for backtracking', () => {
      matrix.markOccupied(2, 3, roomKey('r1'));
      expect(matrix.isOccupied(2, 3, roomKey('r1'))).toBe(true);

      matrix.markFree(2, 3, roomKey('r1'));
      expect(matrix.isOccupied(2, 3, roomKey('r1'))).toBe(false);
    });
  });

  describe('Non-Allocatable Bands', () => {
    it('should identify BREAK bands as non-allocatable', () => {
      expect(matrix.isNonAllocatable(0, 2)).toBe(true);  // BREAK
      expect(matrix.isNonAllocatable(0, 5)).toBe(true);  // LUNCH
    });

    it('should identify regular bands as allocatable', () => {
      expect(matrix.isNonAllocatable(0, 0)).toBe(false);
      expect(matrix.isNonAllocatable(0, 1)).toBe(false);
      expect(matrix.isNonAllocatable(0, 3)).toBe(false);
    });

    it('should report conflict for non-allocatable bands', () => {
      const result = matrix.hasConflict(0, 2, [facultyKey('f1')]);
      expect(result.conflict).toBe(true);
      expect(result.conflictingResources).toContain('NON_ALLOCATABLE');
    });

    it('should return only allocatable time bands', () => {
      const allocatable = matrix.getAllocatableTimeBands(0);
      expect(allocatable).not.toContain(2);
      expect(allocatable).not.toContain(5);
      expect(allocatable).toContain(0);
      expect(allocatable).toContain(1);
      expect(allocatable).toContain(3);
      expect(allocatable.length).toBe(timeBandCount - breakBands.length);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect faculty double-booking', () => {
      matrix.markOccupied(0, 0, facultyKey('f1'));
      const result = matrix.hasConflict(0, 0, [facultyKey('f1')]);
      expect(result.conflict).toBe(true);
      expect(result.conflictingResources).toContain(facultyKey('f1'));
    });

    it('should detect room double-booking', () => {
      matrix.markOccupied(1, 3, roomKey('r1'));
      const result = matrix.hasConflict(1, 3, [roomKey('r1')]);
      expect(result.conflict).toBe(true);
    });

    it('should detect section double-booking', () => {
      matrix.markOccupied(2, 4, sectionKey('s1'));
      const result = matrix.hasConflict(2, 4, [sectionKey('s1')]);
      expect(result.conflict).toBe(true);
    });

    it('should allow different resources in the same slot', () => {
      matrix.markOccupied(0, 0, facultyKey('f1'));
      const result = matrix.hasConflict(0, 0, [facultyKey('f2')]);
      expect(result.conflict).toBe(false);
    });

    it('should check multiple resources at once', () => {
      matrix.markOccupied(0, 0, facultyKey('f1'));
      // Even though room and section are free, faculty conflict should be detected
      const result = matrix.hasConflict(0, 0, [
        facultyKey('f1'),
        roomKey('r1'),
        sectionKey('s1'),
      ]);
      expect(result.conflict).toBe(true);
      expect(result.conflictingResources.length).toBe(1);
      expect(result.conflictingResources[0]).toBe(facultyKey('f1'));
    });
  });

  describe('Batch Operations', () => {
    it('should mark and free multiple resources at once', () => {
      const resources = [facultyKey('f1'), roomKey('r1'), sectionKey('s1')];

      matrix.markSlotOccupied(0, 0, resources);
      expect(matrix.isOccupied(0, 0, facultyKey('f1'))).toBe(true);
      expect(matrix.isOccupied(0, 0, roomKey('r1'))).toBe(true);
      expect(matrix.isOccupied(0, 0, sectionKey('s1'))).toBe(true);

      matrix.markSlotFree(0, 0, resources);
      expect(matrix.isOccupied(0, 0, facultyKey('f1'))).toBe(false);
      expect(matrix.isOccupied(0, 0, roomKey('r1'))).toBe(false);
      expect(matrix.isOccupied(0, 0, sectionKey('s1'))).toBe(false);
    });
  });

  describe('Daily Load Tracking', () => {
    it('should count daily load for a resource', () => {
      matrix.markOccupied(0, 0, sectionKey('s1'));
      matrix.markOccupied(0, 1, sectionKey('s1'));
      matrix.markOccupied(0, 3, sectionKey('s1'));

      expect(matrix.getDailyLoad(0, sectionKey('s1'))).toBe(3);
      expect(matrix.getDailyLoad(1, sectionKey('s1'))).toBe(0);
    });
  });

  describe('Cloning', () => {
    it('should create an independent clone', () => {
      matrix.markOccupied(0, 0, facultyKey('f1'));
      const clone = matrix.clone();

      // Clone should have the same state
      expect(clone.isOccupied(0, 0, facultyKey('f1'))).toBe(true);

      // Modifying clone should not affect original
      clone.markOccupied(1, 1, facultyKey('f2'));
      expect(matrix.isOccupied(1, 1, facultyKey('f2'))).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle 1000 mark/check operations in under 50ms', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        const d = i % 5;
        const tb = i % 8; // avoid break bands
        const key = facultyKey(`f${i}`);
        matrix.markOccupied(d, tb, key);
        matrix.isOccupied(d, tb, key);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50); // Should be well under 50ms
    });
  });
});
