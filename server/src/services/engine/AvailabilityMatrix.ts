// ============================================================
// AvailabilityMatrix — 3D Conflict Detection Matrix
// ============================================================
//
// CORE DESIGN DECISION: Matrix-Based Validation
//
// Instead of scanning all existing assignments (O(n)) to check for
// conflicts, we maintain a pre-allocated 3D boolean matrix where
// each cell represents whether a specific resource (faculty, room,
// or section) is occupied at a specific (day, timeBand) pair.
//
// This gives us O(1) conflict detection for any proposed slot
// placement — the key performance claim of this engine.
//
// Matrix dimensions: [dayIndex][timeBandIndex][resourceKey]
// Resource keys are strings: "faculty:<id>", "room:<id>", "section:<id>"
//
// Memory: For a typical schedule (5 days × 10 bands × 100 resources),
// the matrix uses ~5KB — negligible overhead for O(1) lookups.
// ============================================================

import type { DayOfWeek } from '@timetable/types';

export type ResourceKey = string; // "faculty:<id>" | "room:<id>" | "section:<id>"

export function facultyKey(id: string): ResourceKey {
  return `faculty:${id}`;
}

export function roomKey(id: string): ResourceKey {
  return `room:${id}`;
}

export function sectionKey(id: string): ResourceKey {
  return `section:${id}`;
}

export interface MatrixCell {
  day: number;
  timeBandIndex: number;
  resourceKey: ResourceKey;
}

export class AvailabilityMatrix {
  // The core 3D structure: occupied[dayIndex][timeBandIndex] = Set<ResourceKey>
  private occupied: Map<string, boolean>;
  private dayCount: number;
  private timeBandCount: number;
  private dayIndexMap: Map<DayOfWeek, number>;
  private nonAllocatable: Set<string>; // "dayIdx:timeBandIdx" combos that are BREAK/LUNCH

  constructor(
    workingDays: DayOfWeek[],
    timeBandCount: number,
    nonAllocatableTimeBands: number[] // indices of BREAK/LUNCH bands
  ) {
    this.dayCount = workingDays.length;
    this.timeBandCount = timeBandCount;
    this.occupied = new Map();
    this.dayIndexMap = new Map();
    this.nonAllocatable = new Set();

    // Map day enum values to numeric indices for array access
    workingDays.forEach((day, idx) => {
      this.dayIndexMap.set(day, idx);
    });

    // Mark non-allocatable time bands (BREAK/LUNCH) as permanently occupied
    // for ALL resource types — these can never be assigned
    for (let d = 0; d < this.dayCount; d++) {
      for (const tb of nonAllocatableTimeBands) {
        this.nonAllocatable.add(`${d}:${tb}`);
      }
    }
  }

  /**
   * Build a composite key for O(1) Map lookups.
   * Using string concatenation + Map is faster than nested arrays
   * for sparse matrices (most cells are unoccupied).
   */
  private key(dayIndex: number, timeBandIndex: number, resourceKey: ResourceKey): string {
    return `${dayIndex}:${timeBandIndex}:${resourceKey}`;
  }

  /**
   * Check if a resource is already occupied at (day, timeBand).
   * O(1) lookup — the core performance guarantee.
   */
  isOccupied(dayIndex: number, timeBandIndex: number, resourceKey: ResourceKey): boolean {
    return this.occupied.has(this.key(dayIndex, timeBandIndex, resourceKey));
  }

  /**
   * Check if a time band is non-allocatable (BREAK/LUNCH).
   * O(1) lookup.
   */
  isNonAllocatable(dayIndex: number, timeBandIndex: number): boolean {
    return this.nonAllocatable.has(`${dayIndex}:${timeBandIndex}`);
  }

  /**
   * Check if ANY of the given resources conflict at (day, timeBand).
   * Used to validate a full slot placement (checks faculty + room + section).
   * Still O(1) per resource — O(k) for k resources, where k is always 3.
   */
  hasConflict(
    dayIndex: number,
    timeBandIndex: number,
    resources: ResourceKey[]
  ): { conflict: boolean; conflictingResources: ResourceKey[] } {
    if (this.isNonAllocatable(dayIndex, timeBandIndex)) {
      return { conflict: true, conflictingResources: ['NON_ALLOCATABLE'] };
    }

    const conflicting: ResourceKey[] = [];
    for (const res of resources) {
      if (this.isOccupied(dayIndex, timeBandIndex, res)) {
        conflicting.push(res);
      }
    }

    return {
      conflict: conflicting.length > 0,
      conflictingResources: conflicting,
    };
  }

  /**
   * Mark a resource as occupied at (day, timeBand).
   * O(1) write.
   */
  markOccupied(dayIndex: number, timeBandIndex: number, resourceKey: ResourceKey): void {
    this.occupied.set(this.key(dayIndex, timeBandIndex, resourceKey), true);
  }

  /**
   * Mark multiple resources as occupied at once (for a full slot placement).
   */
  markSlotOccupied(
    dayIndex: number,
    timeBandIndex: number,
    resources: ResourceKey[]
  ): void {
    for (const res of resources) {
      this.markOccupied(dayIndex, timeBandIndex, res);
    }
  }

  /**
   * Unmark a resource (for backtracking).
   * O(1) delete.
   */
  markFree(dayIndex: number, timeBandIndex: number, resourceKey: ResourceKey): void {
    this.occupied.delete(this.key(dayIndex, timeBandIndex, resourceKey));
  }

  /**
   * Unmark multiple resources (for backtracking a full slot).
   */
  markSlotFree(
    dayIndex: number,
    timeBandIndex: number,
    resources: ResourceKey[]
  ): void {
    for (const res of resources) {
      this.markFree(dayIndex, timeBandIndex, res);
    }
  }

  /**
   * Get the day index for a DayOfWeek enum value.
   */
  getDayIndex(day: DayOfWeek): number {
    const idx = this.dayIndexMap.get(day);
    if (idx === undefined) {
      throw new Error(`Day ${day} is not a working day`);
    }
    return idx;
  }

  /**
   * Get all working day indices.
   */
  getDayIndices(): number[] {
    return Array.from({ length: this.dayCount }, (_, i) => i);
  }

  /**
   * Get allocatable time band indices (excluding BREAK/LUNCH).
   */
  getAllocatableTimeBands(dayIndex: number): number[] {
    const bands: number[] = [];
    for (let tb = 0; tb < this.timeBandCount; tb++) {
      if (!this.isNonAllocatable(dayIndex, tb)) {
        bands.push(tb);
      }
    }
    return bands;
  }

  /**
   * Count total occupied cells (for debugging/scoring).
   */
  getOccupiedCount(): number {
    return this.occupied.size;
  }

  /**
   * Count occupied cells for a specific resource across all slots (for load tracking).
   */
  getResourceLoad(resourceKey: ResourceKey): number {
    let count = 0;
    for (const k of this.occupied.keys()) {
      if (k.endsWith(`:${resourceKey}`)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Count how many slots are occupied for a resource on a specific day.
   * Used for max_daily_load constraint checking.
   */
  getDailyLoad(dayIndex: number, resourceKey: ResourceKey): number {
    let count = 0;
    for (let tb = 0; tb < this.timeBandCount; tb++) {
      if (this.isOccupied(dayIndex, tb, resourceKey)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Create a deep clone of this matrix (for variation generation).
   */
  clone(): AvailabilityMatrix {
    const clone = new AvailabilityMatrix([], 0, []);
    clone.dayCount = this.dayCount;
    clone.timeBandCount = this.timeBandCount;
    clone.dayIndexMap = new Map(this.dayIndexMap);
    clone.nonAllocatable = new Set(this.nonAllocatable);
    clone.occupied = new Map(this.occupied);
    return clone;
  }
}
