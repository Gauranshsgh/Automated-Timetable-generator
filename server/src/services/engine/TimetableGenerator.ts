// ============================================================
// TimetableGenerator — CSP Backtracking Solver
// ============================================================
//
// ALGORITHM OVERVIEW:
//
// 1. Collect all (subject, type, section) requirements with their
//    weekly hour counts → produce a flat list of "slots to place".
//
// 2. Place all locked/fixed_slot assignments first → mark matrix.
//
// 3. Sort remaining requirements by MRV (Minimum Remaining Values)
//    heuristic: the requirement with the fewest available candidate
//    slots is placed first, reducing the backtracking search space.
//
// 4. For each requirement, iterate candidate (day, timeBand) pairs:
//    - O(1) matrix conflict check for faculty + room + section
//    - Validate against all active constraints
//    - If valid: place, mark matrix, recurse to next requirement
//    - If invalid: skip, try next candidate
//    - If all candidates exhausted: backtrack (unmark matrix),
//      relax soft constraints if possible, then report infeasibility
//
// 5. Run the solver 50+ times with shuffled candidate orderings
//    (random tie-breaking in MRV) to produce distinct valid variations.
//
// 6. Deduplicate identical layouts via hash comparison.
// 7. Score each variation using ScoreCalculator.
// ============================================================

import type { DayOfWeek, IConstraint, SubjectType } from '@timetable/types';
import {
  AvailabilityMatrix,
  facultyKey,
  roomKey,
  sectionKey,
} from './AvailabilityMatrix.js';
import {
  ConstraintValidator,
  type SlotPlacement,
} from './ConstraintValidator.js';
import { ScoreCalculator, type ScoreBreakdown } from './ScoreCalculator.js';

// ─── Types ────────────────────────────────────────────────────

export interface Requirement {
  subjectCode: string;
  subjectType: SubjectType;
  sectionId: string;
  facultyId: string;          // assigned faculty for this subject+section
  eligibleRoomIds: string[];  // rooms that can host this class type
  weeklySlots: number;        // how many slots needed per week
}

export interface FixedAssignment {
  dayIndex: number;
  timeBandIndex: number;
  subjectCode: string;
  subjectType: SubjectType;
  sectionId: string;
  facultyId: string;
  roomId: string;
}

export interface GenerationInput {
  workingDays: DayOfWeek[];
  timeBandCount: number;
  nonAllocatableTimeBands: number[];
  requirements: Requirement[];
  fixedAssignments: FixedAssignment[];
  constraints: IConstraint[];
  facultySubjectMap: Map<string, string>; // subjectCode+sectionId → facultyId
}

export interface GenerationResult {
  variations: GeneratedVariation[];
  infeasible: boolean;
  infeasibilityReason?: string;
}

export interface GeneratedVariation {
  placements: SlotPlacement[];
  score: ScoreBreakdown;
  hash: string;
}

export type ProgressCallback = (event: {
  message: string;
  percentage: number;
  variationsFound: number;
  currentAction: string;
}) => void;

// ─── Generator Class ──────────────────────────────────────────

export class TimetableGenerator {
  private scoreCalculator: ScoreCalculator;
  private maxBacktrackSteps = 100000; // safety limit

  constructor() {
    this.scoreCalculator = new ScoreCalculator();
  }

  /**
   * Generate multiple conflict-free timetable variations.
   *
   * @param input All data needed for generation
   * @param targetVariations Number of distinct variations to produce (default 50)
   * @param onProgress Callback for progress updates
   */
  async generate(
    input: GenerationInput,
    targetVariations: number = 50,
    onProgress?: ProgressCallback
  ): Promise<GenerationResult> {
    const {
      workingDays,
      timeBandCount,
      nonAllocatableTimeBands,
      requirements,
      fixedAssignments,
      constraints,
    } = input;

    const validator = new ConstraintValidator(constraints);
    const seenHashes = new Set<string>();
    const variations: GeneratedVariation[] = [];

    // Expand requirements into individual slot-to-place items
    const slotsToPlace = this.expandRequirements(requirements);

    // Attempt generation with different random seeds
    const maxAttempts = targetVariations * 3; // Over-attempt to hit target
    let attempts = 0;
    let consecutiveFailures = 0;

    for (let i = 0; i < maxAttempts && variations.length < targetVariations; i++) {
      attempts++;

      // Create fresh matrix for each attempt
      const matrix = new AvailabilityMatrix(
        workingDays,
        timeBandCount,
        nonAllocatableTimeBands
      );

      // Reset constraint relaxations
      validator.resetRelaxations();

      // 1. Place fixed assignments first
      const fixedPlacements = this.placeFixedAssignments(
        fixedAssignments,
        matrix
      );

      // 2. Shuffle slots for variation (random tie-breaking)
      const shuffled = this.shuffleWithMRV(
        slotsToPlace,
        matrix,
        workingDays.length,
        timeBandCount
      );

      // 3. Run backtracking solver
      const placements: SlotPlacement[] = [...fixedPlacements];
      const success = this.backtrack(
        shuffled,
        0,
        placements,
        matrix,
        validator,
        workingDays.length,
        timeBandCount,
        0
      );

      if (success) {
        const hash = this.hashPlacements(placements);

        if (!seenHashes.has(hash)) {
          seenHashes.add(hash);

          const score = this.scoreCalculator.calculate(
            placements,
            workingDays.length,
            timeBandCount
          );

          variations.push({ placements: [...placements], score, hash });
          consecutiveFailures = 0;

          onProgress?.({
            message: `Variation ${variations.length} of ${targetVariations} generated (score: ${score.compositeScore})`,
            percentage: Math.round((variations.length / targetVariations) * 100),
            variationsFound: variations.length,
            currentAction: `Generated variation #${variations.length}`,
          });
        }
      } else {
        consecutiveFailures++;

        // If we've failed many times in a row, constraints might be unsatisfiable
        if (consecutiveFailures > 20) {
          break;
        }
      }

      // Progress update for attempts
      if (i % 5 === 0) {
        onProgress?.({
          message: `Attempt ${i + 1}/${maxAttempts}...`,
          percentage: Math.round((variations.length / targetVariations) * 100),
          variationsFound: variations.length,
          currentAction: `Searching for variations (attempt ${i + 1})`,
        });
      }
    }

    if (variations.length === 0) {
      return {
        variations: [],
        infeasible: true,
        infeasibilityReason: `Could not find any valid timetable after ${attempts} attempts. Constraints may be unsatisfiable — check faculty availability, room capacity, and time band count.`,
      };
    }

    // Sort by score (highest first)
    variations.sort((a, b) => b.score.compositeScore - a.score.compositeScore);

    onProgress?.({
      message: `Generation complete! ${variations.length} unique variations found.`,
      percentage: 100,
      variationsFound: variations.length,
      currentAction: 'Complete',
    });

    return { variations, infeasible: false };
  }

  // ─── Expand requirements into individual slot items ──────

  private expandRequirements(requirements: Requirement[]): SlotToPlace[] {
    const slots: SlotToPlace[] = [];

    for (const req of requirements) {
      for (let i = 0; i < req.weeklySlots; i++) {
        slots.push({
          subjectCode: req.subjectCode,
          subjectType: req.subjectType,
          sectionId: req.sectionId,
          facultyId: req.facultyId,
          eligibleRoomIds: [...req.eligibleRoomIds],
          instanceIndex: i,
        });
      }
    }

    return slots;
  }

  // ─── Place fixed/locked assignments ──────────────────────

  private placeFixedAssignments(
    fixed: FixedAssignment[],
    matrix: AvailabilityMatrix
  ): SlotPlacement[] {
    const placements: SlotPlacement[] = [];

    for (const f of fixed) {
      const resources = [
        facultyKey(f.facultyId),
        roomKey(f.roomId),
        sectionKey(f.sectionId),
      ];

      matrix.markSlotOccupied(f.dayIndex, f.timeBandIndex, resources);

      placements.push({
        dayIndex: f.dayIndex,
        timeBandIndex: f.timeBandIndex,
        subjectCode: f.subjectCode,
        subjectType: f.subjectType,
        sectionId: f.sectionId,
        facultyId: f.facultyId,
        roomId: f.roomId,
      });
    }

    return placements;
  }

  // ─── MRV Heuristic + Shuffle ─────────────────────────────
  //
  // Sort by "most constrained first" — slots with fewer available
  // candidate positions go first. Within equal constraint counts,
  // shuffle randomly for variation generation.

  private shuffleWithMRV(
    slots: SlotToPlace[],
    matrix: AvailabilityMatrix,
    dayCount: number,
    timeBandCount: number
  ): SlotToPlace[] {
    // Calculate available positions for each slot
    const withAvailability = slots.map((slot) => {
      let available = 0;
      for (let d = 0; d < dayCount; d++) {
        const allocatable = matrix.getAllocatableTimeBands(d);
        for (const tb of allocatable) {
          const resources = [
            facultyKey(slot.facultyId),
            sectionKey(slot.sectionId),
          ];
          const { conflict } = matrix.hasConflict(d, tb, resources);
          if (!conflict) available++;
        }
      }
      return { slot, available };
    });

    // Sort by MRV (fewest available first), then shuffle within equal groups
    withAvailability.sort((a, b) => {
      if (a.available !== b.available) return a.available - b.available;
      return Math.random() - 0.5; // Random tie-breaking for variation
    });

    return withAvailability.map((item) => item.slot);
  }

  // ─── Backtracking Solver ─────────────────────────────────

  private backtrack(
    slots: SlotToPlace[],
    index: number,
    placements: SlotPlacement[],
    matrix: AvailabilityMatrix,
    validator: ConstraintValidator,
    dayCount: number,
    timeBandCount: number,
    steps: number
  ): boolean {
    // Base case: all slots placed successfully
    if (index >= slots.length) return true;

    // Safety limit to prevent infinite loops
    if (steps > this.maxBacktrackSteps) return false;

    const slot = slots[index];

    // Generate candidate positions (day × timeBand × room combinations)
    const candidates = this.generateCandidates(
      slot,
      matrix,
      dayCount,
      timeBandCount
    );

    // Shuffle candidates for variation
    this.shuffleArray(candidates);

    for (const candidate of candidates) {
      const placement: SlotPlacement = {
        dayIndex: candidate.dayIndex,
        timeBandIndex: candidate.timeBandIndex,
        subjectCode: slot.subjectCode,
        subjectType: slot.subjectType,
        sectionId: slot.sectionId,
        facultyId: slot.facultyId,
        roomId: candidate.roomId,
      };

      // Validate against matrix AND constraints
      const result = validator.validate(placement, matrix, placements);

      // Only accept if no HARD constraint violations
      if (result.valid) {
        // Place: mark matrix as occupied
        const resources = [
          facultyKey(placement.facultyId),
          roomKey(placement.roomId),
          sectionKey(placement.sectionId),
        ];
        matrix.markSlotOccupied(
          candidate.dayIndex,
          candidate.timeBandIndex,
          resources
        );
        placements.push(placement);

        // Recurse to next slot
        if (
          this.backtrack(
            slots,
            index + 1,
            placements,
            matrix,
            validator,
            dayCount,
            timeBandCount,
            steps + 1
          )
        ) {
          return true;
        }

        // Backtrack: unmark matrix and remove placement
        matrix.markSlotFree(
          candidate.dayIndex,
          candidate.timeBandIndex,
          resources
        );
        placements.pop();
      }
    }

    // All candidates exhausted for this slot
    return false;
  }

  // ─── Generate candidate (day, timeBand, room) triples ────

  private generateCandidates(
    slot: SlotToPlace,
    matrix: AvailabilityMatrix,
    dayCount: number,
    _timeBandCount: number
  ): { dayIndex: number; timeBandIndex: number; roomId: string }[] {
    const candidates: {
      dayIndex: number;
      timeBandIndex: number;
      roomId: string;
    }[] = [];

    for (let d = 0; d < dayCount; d++) {
      const allocatable = matrix.getAllocatableTimeBands(d);

      for (const tb of allocatable) {
        // Quick pre-check: faculty and section must be free (O(1))
        if (
          matrix.isOccupied(d, tb, facultyKey(slot.facultyId)) ||
          matrix.isOccupied(d, tb, sectionKey(slot.sectionId))
        ) {
          continue;
        }

        // Try each eligible room
        for (const roomId of slot.eligibleRoomIds) {
          if (!matrix.isOccupied(d, tb, roomKey(roomId))) {
            candidates.push({ dayIndex: d, timeBandIndex: tb, roomId });
          }
        }
      }
    }

    return candidates;
  }

  // ─── Hash a set of placements for deduplication ──────────

  private hashPlacements(placements: SlotPlacement[]): string {
    const sorted = placements
      .map(
        (p) =>
          `${p.dayIndex}:${p.timeBandIndex}:${p.subjectCode}:${p.subjectType}:${p.sectionId}:${p.roomId}`
      )
      .sort();
    return sorted.join('|');
  }

  // ─── Fisher-Yates Shuffle ───────────────────────────────

  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

// ─── Internal Types ────────────────────────────────────────

interface SlotToPlace {
  subjectCode: string;
  subjectType: SubjectType;
  sectionId: string;
  facultyId: string;
  eligibleRoomIds: string[];
  instanceIndex: number; // which instance of this weekly requirement
}
