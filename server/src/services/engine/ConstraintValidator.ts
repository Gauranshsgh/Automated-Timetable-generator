// ============================================================
// ConstraintValidator — Data-Driven Rule Engine
// ============================================================
//
// Validates slot placements against constraints loaded from the
// database. Each constraint type maps to a validation function.
// The validator separates hard constraints (never violated) from
// soft constraints (can be relaxed during backtracking).
// ============================================================

import type { DayOfWeek, IConstraint, SubjectType } from '@timetable/types';
import { ConstraintType } from '@timetable/types';
import {
  AvailabilityMatrix,
  facultyKey,
  roomKey,
  sectionKey,
} from './AvailabilityMatrix.js';

export interface SlotPlacement {
  dayIndex: number;
  timeBandIndex: number;
  subjectCode: string;
  subjectType: SubjectType;
  sectionId: string;
  facultyId: string;
  roomId: string;
}

export interface Violation {
  constraintType: ConstraintType | 'MATRIX_CONFLICT';
  message: string;
  isHard: boolean;
}

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
}

export class ConstraintValidator {
  private constraints: IConstraint[];
  private softRelaxed: Set<string>; // IDs of soft constraints currently relaxed

  constructor(constraints: IConstraint[]) {
    this.constraints = constraints;
    this.softRelaxed = new Set();
  }

  /**
   * Relax a soft constraint (allow it to be violated).
   * Used during backtracking when hard constraints are satisfied
   * but soft constraints prevent any valid placement.
   */
  relaxConstraint(constraintId: string): void {
    this.softRelaxed.add(constraintId);
  }

  /**
   * Reset all relaxations.
   */
  resetRelaxations(): void {
    this.softRelaxed.clear();
  }

  /**
   * Get the set of active (non-relaxed) constraints.
   */
  getActiveConstraints(): IConstraint[] {
    return this.constraints.filter(
      (c) => !c._id || !this.softRelaxed.has(c._id)
    );
  }

  /**
   * Validate a proposed slot placement against the matrix AND all constraints.
   * Returns all violations found (not just the first).
   */
  validate(
    placement: SlotPlacement,
    matrix: AvailabilityMatrix,
    existingPlacements: SlotPlacement[]
  ): ValidationResult {
    const violations: Violation[] = [];

    // ─── 1. Matrix conflict check (HARD — O(1)) ──────────
    const resources = [
      facultyKey(placement.facultyId),
      roomKey(placement.roomId),
      sectionKey(placement.sectionId),
    ];

    const { conflict, conflictingResources } = matrix.hasConflict(
      placement.dayIndex,
      placement.timeBandIndex,
      resources
    );

    if (conflict) {
      for (const res of conflictingResources) {
        violations.push({
          constraintType: 'MATRIX_CONFLICT',
          message: `Resource ${res} is already occupied at day ${placement.dayIndex}, timeBand ${placement.timeBandIndex}`,
          isHard: true,
        });
      }
    }

    // ─── 2. Constraint-specific checks ────────────────────
    for (const constraint of this.getActiveConstraints()) {
      const violation = this.checkConstraint(
        constraint,
        placement,
        matrix,
        existingPlacements
      );
      if (violation) {
        violations.push(violation);
      }
    }

    return {
      valid: violations.filter((v) => v.isHard).length === 0,
      violations,
    };
  }

  /**
   * Check a single constraint against a placement.
   * Returns a violation if the constraint is violated, null otherwise.
   */
  private checkConstraint(
    constraint: IConstraint,
    placement: SlotPlacement,
    matrix: AvailabilityMatrix,
    existingPlacements: SlotPlacement[]
  ): Violation | null {
    const isHard = !constraint.isSoft;

    switch (constraint.type) {
      case ConstraintType.FACULTY_UNAVAILABLE:
        return this.checkFacultyUnavailable(constraint, placement, isHard);

      case ConstraintType.ROOM_UNAVAILABLE:
        return this.checkRoomUnavailable(constraint, placement, isHard);

      case ConstraintType.MAX_DAILY_LOAD:
        return this.checkMaxDailyLoad(constraint, placement, matrix, isHard);

      case ConstraintType.FIXED_SLOT:
        return this.checkFixedSlot(constraint, placement, isHard);

      case ConstraintType.PREFERRED_SLOT:
        return this.checkPreferredSlot(constraint, placement, isHard);

      case ConstraintType.NO_BACK_TO_BACK_LABS:
        return this.checkNoBackToBackLabs(
          constraint,
          placement,
          existingPlacements,
          isHard
        );

      default:
        return null;
    }
  }

  private checkFacultyUnavailable(
    constraint: IConstraint,
    placement: SlotPlacement,
    isHard: boolean
  ): Violation | null {
    const { facultyId, day, timeBandIndex } = constraint.payload;
    if (
      placement.facultyId === facultyId &&
      placement.dayIndex === (day !== undefined ? placement.dayIndex : -1)
    ) {
      // Match by both day and timeBandIndex if specified
      if (
      day !== undefined &&
      timeBandIndex !== undefined &&
      placement.dayIndex === (day as unknown as number) &&
      placement.timeBandIndex === timeBandIndex
      ) {
        return {
          constraintType: ConstraintType.FACULTY_UNAVAILABLE,
          message: `Faculty ${facultyId} is unavailable at day ${day}, timeBand ${timeBandIndex}`,
          isHard,
        };
      }
    }
    return null;
  }

  private checkRoomUnavailable(
    constraint: IConstraint,
    placement: SlotPlacement,
    isHard: boolean
  ): Violation | null {
    const { roomId, day, timeBandIndex } = constraint.payload;
    if (
      placement.roomId === roomId &&
      day !== undefined &&
      timeBandIndex !== undefined &&
      placement.dayIndex === (day as unknown as number) &&
      placement.timeBandIndex === timeBandIndex
    ) {
      return {
        constraintType: ConstraintType.ROOM_UNAVAILABLE,
        message: `Room ${roomId} is unavailable at day ${day}, timeBand ${timeBandIndex}`,
        isHard,
      };
    }
    return null;
  }

  private checkMaxDailyLoad(
    constraint: IConstraint,
    placement: SlotPlacement,
    matrix: AvailabilityMatrix,
    isHard: boolean
  ): Violation | null {
    const { sectionId, maxLectures } = constraint.payload;
    if (placement.sectionId !== sectionId || maxLectures === undefined) {
      return null;
    }

    const currentLoad = matrix.getDailyLoad(
      placement.dayIndex,
      sectionKey(placement.sectionId)
    );

    if (currentLoad >= maxLectures) {
      return {
        constraintType: ConstraintType.MAX_DAILY_LOAD,
        message: `Section ${sectionId} already has ${currentLoad} classes on day ${placement.dayIndex} (max: ${maxLectures})`,
        isHard,
      };
    }
    return null;
  }

  private checkFixedSlot(
    constraint: IConstraint,
    placement: SlotPlacement,
    isHard: boolean
  ): Violation | null {
    const { subjectCode, subjectType, sectionId, day, timeBandIndex } =
      constraint.payload;

    // A fixed_slot constraint means: this subject+type+section MUST go at day+timeBand.
    // We validate this in the generator by placing fixed slots first.
    // Here we just check that nothing else tries to occupy the fixed slot's position.
    if (
      day !== undefined &&
      timeBandIndex !== undefined &&
      placement.dayIndex === (day as unknown as number) &&
      placement.timeBandIndex === timeBandIndex
    ) {
      if (
        placement.subjectCode !== subjectCode ||
        placement.subjectType !== subjectType ||
        placement.sectionId !== sectionId
      ) {
        return {
          constraintType: ConstraintType.FIXED_SLOT,
          message: `Slot day ${day}, timeBand ${timeBandIndex} is fixed for ${subjectCode} (${subjectType}) - ${sectionId}`,
          isHard,
        };
      }
    }
    return null;
  }

  private checkPreferredSlot(
    constraint: IConstraint,
    placement: SlotPlacement,
    isHard: boolean
  ): Violation | null {
    const { subjectCode, subjectType, day, timeBandIndex } = constraint.payload;

    // Preferred slot is a soft constraint — the subject SHOULD go at this time
    // but doesn't have to. We only report a violation if it's placed elsewhere.
    if (
      placement.subjectCode === subjectCode &&
      placement.subjectType === subjectType &&
      day !== undefined &&
      timeBandIndex !== undefined
    ) {
      if (
        placement.dayIndex !== (day as unknown as number) ||
        placement.timeBandIndex !== timeBandIndex
      ) {
        return {
          constraintType: ConstraintType.PREFERRED_SLOT,
          message: `${subjectCode} (${subjectType}) prefers day ${day}, timeBand ${timeBandIndex}`,
          isHard: false, // Always soft regardless of constraint setting
        };
      }
    }
    return null;
  }

  private checkNoBackToBackLabs(
    constraint: IConstraint,
    placement: SlotPlacement,
    existingPlacements: SlotPlacement[],
    isHard: boolean
  ): Violation | null {
    const { sectionId } = constraint.payload;
    if (
      placement.sectionId !== sectionId ||
      placement.subjectType !== 'P' // Only applies to Practicals
    ) {
      return null;
    }

    // Check if there's a lab in the adjacent time band for this section
    const adjacentBands = [
      placement.timeBandIndex - 1,
      placement.timeBandIndex + 1,
    ];

    for (const existing of existingPlacements) {
      if (
        existing.sectionId === placement.sectionId &&
        existing.dayIndex === placement.dayIndex &&
        existing.subjectType === 'P' &&
        adjacentBands.includes(existing.timeBandIndex)
      ) {
        return {
          constraintType: ConstraintType.NO_BACK_TO_BACK_LABS,
          message: `Section ${sectionId} cannot have back-to-back labs on day ${placement.dayIndex}`,
          isHard,
        };
      }
    }

    return null;
  }
}
