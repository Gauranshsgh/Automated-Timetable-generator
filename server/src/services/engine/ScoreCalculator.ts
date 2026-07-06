// ============================================================
// ScoreCalculator — Timetable Quality Scoring
// ============================================================
//
// Scores generated timetable variations on multiple quality axes:
// 1. Load balance — even distribution of classes across days
// 2. Gap minimization — fewer free periods between classes
// 3. Faculty load distribution — fair workload across faculty
// 4. Preferred slot satisfaction — how many soft preferences met
//
// Each axis produces a 0-100 score; the composite score is a
// weighted average.
// ============================================================

import type { SlotPlacement } from './ConstraintValidator.js';

export interface ScoreBreakdown {
  loadBalance: number;       // 0-100 — even distribution across days
  gapMinimization: number;   // 0-100 — fewer gaps = better
  facultyBalance: number;    // 0-100 — fair faculty workload
  compositeScore: number;    // 0-100 weighted average
  gapCount: number;          // absolute number of gaps
}

export class ScoreCalculator {
  private weights = {
    loadBalance: 0.35,
    gapMinimization: 0.40,
    facultyBalance: 0.25,
  };

  /**
   * Calculate a comprehensive quality score for a set of placements.
   */
  calculate(
    placements: SlotPlacement[],
    dayCount: number,
    timeBandCount: number
  ): ScoreBreakdown {
    const loadBalance = this.calcLoadBalance(placements, dayCount);
    const { score: gapMinimization, gapCount } = this.calcGapMinimization(
      placements,
      dayCount,
      timeBandCount
    );
    const facultyBalance = this.calcFacultyBalance(placements, dayCount);

    const compositeScore = Math.round(
      loadBalance * this.weights.loadBalance +
      gapMinimization * this.weights.gapMinimization +
      facultyBalance * this.weights.facultyBalance
    );

    return {
      loadBalance: Math.round(loadBalance),
      gapMinimization: Math.round(gapMinimization),
      facultyBalance: Math.round(facultyBalance),
      compositeScore,
      gapCount,
    };
  }

  /**
   * Load Balance: measures how evenly classes are distributed across days
   * for each section. Lower standard deviation = better balance = higher score.
   */
  private calcLoadBalance(placements: SlotPlacement[], dayCount: number): number {
    // Group by section, count per day
    const sectionDayLoads = new Map<string, Map<number, number>>();

    for (const p of placements) {
      if (!sectionDayLoads.has(p.sectionId)) {
        sectionDayLoads.set(p.sectionId, new Map());
      }
      const dayMap = sectionDayLoads.get(p.sectionId)!;
      dayMap.set(p.dayIndex, (dayMap.get(p.dayIndex) || 0) + 1);
    }

    if (sectionDayLoads.size === 0) return 100;

    let totalDeviation = 0;
    let sectionCount = 0;

    for (const [, dayMap] of sectionDayLoads) {
      const counts: number[] = [];
      for (let d = 0; d < dayCount; d++) {
        counts.push(dayMap.get(d) || 0);
      }

      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance =
        counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
      const stdDev = Math.sqrt(variance);

      // Normalize: 0 stddev = 100, higher stddev = lower score
      // Max expected stddev ~ 3 for a typical schedule
      totalDeviation += Math.max(0, 100 - stdDev * 33);
      sectionCount++;
    }

    return totalDeviation / sectionCount;
  }

  /**
   * Gap Minimization: counts free periods between first and last class
   * for each section on each day. Fewer gaps = higher score.
   */
  private calcGapMinimization(
    placements: SlotPlacement[],
    dayCount: number,
    timeBandCount: number
  ): { score: number; gapCount: number } {
    // Group by section+day, find occupied time bands
    const sectionDayBands = new Map<string, Set<number>>();

    for (const p of placements) {
      const key = `${p.sectionId}:${p.dayIndex}`;
      if (!sectionDayBands.has(key)) {
        sectionDayBands.set(key, new Set());
      }
      sectionDayBands.get(key)!.add(p.timeBandIndex);
    }

    let totalGaps = 0;
    let totalPossibleGaps = 0;

    for (const [, bands] of sectionDayBands) {
      if (bands.size <= 1) continue;

      const sorted = Array.from(bands).sort((a, b) => a - b);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const span = last - first + 1;
      const gaps = span - bands.size;

      totalGaps += gaps;
      totalPossibleGaps += span - 1;
    }

    if (totalPossibleGaps === 0) return { score: 100, gapCount: 0 };

    const score = Math.max(0, 100 - (totalGaps / totalPossibleGaps) * 100);
    return { score, gapCount: totalGaps };
  }

  /**
   * Faculty Balance: measures how evenly teaching load is distributed
   * across faculty members. Lower variance = higher score.
   */
  private calcFacultyBalance(placements: SlotPlacement[], dayCount: number): number {
    const facultyLoads = new Map<string, number>();

    for (const p of placements) {
      facultyLoads.set(p.facultyId, (facultyLoads.get(p.facultyId) || 0) + 1);
    }

    if (facultyLoads.size <= 1) return 100;

    const loads = Array.from(facultyLoads.values());
    const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance =
      loads.reduce((sum, l) => sum + (l - mean) ** 2, 0) / loads.length;
    const stdDev = Math.sqrt(variance);

    // Normalize: lower deviation = higher score
    return Math.max(0, 100 - stdDev * 10);
  }
}
