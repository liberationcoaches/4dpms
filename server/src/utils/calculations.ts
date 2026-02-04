/**
 * Pure calculation functions for performance management
 * Based on Excel formulas from KRA Setting sheets
 * These functions are JSON-in/JSON-out and can be imported by Flutter layer
 */

import {
  IFunctionalKRA,
  IOrganizationalKRA,
  ISelfDevelopmentKRA,
  IDevelopingOthersKRA,
  IDimensionWeights,
} from '../models/Team';

/**
 * Excel formula simulation utilities
 * All numeric comparisons use proper tolerance for floating point precision
 */
const EPSILON = 1e-10;

/**
 * Compare two numbers with tolerance (matches Excel precision)
 */
function areEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

/**
 * Divide two numbers, returning null for division by zero (Excel #DIV/0!)
 */
export function safeDivide(numerator: number, denominator: number): number | null {
  if (Math.abs(denominator) < EPSILON) {
    return null; // Excel #DIV/0! equivalent
  }
  return numerator / denominator;
}

// ============================================================================
// DIMENSION WEIGHT DEFAULTS (from Excel template)
// ============================================================================

export const DEFAULT_DIMENSION_WEIGHTS: IDimensionWeights = {
  functional: 60,
  organizational: 20,
  selfDevelopment: 10,
  developingOthers: 10,
};

// ============================================================================
// FUNCTIONAL DIMENSION CALCULATIONS
// Excel: Weighted average = Σ(score × weight) / Σ(weights)
// ============================================================================

/**
 * Calculate weighted average for Functional KRAs for a specific period
 * Excel Formula: =SUMPRODUCT(scores, weights) / SUM(weights)
 * 
 * @param kras - Array of Functional KRAs
 * @param period - Review period (1-4) or 'pilot'
 * @returns Weighted average score (0-5 scale)
 */
export function calculateFunctionalDimensionScore(
  kras: IFunctionalKRA[] | undefined,
  period: 'pilot' | 1 | 2 | 3 | 4
): number {
  if (!kras || kras.length === 0) return 0;

  let sumProduct = 0;
  let sumWeights = 0;

  for (const kra of kras) {
    const scoreKey = period === 'pilot' ? 'pilotScore' : `r${period}Score` as keyof IFunctionalKRA;
    const weightKey = period === 'pilot' ? 'pilotWeight' : `r${period}Weight` as keyof IFunctionalKRA;

    const score = (kra[scoreKey] as number) || 0;
    const weight = (kra[weightKey] as number) || 0;

    if (score > 0 && weight > 0) {
      sumProduct += score * weight;
      sumWeights += weight;
    }
  }

  if (sumWeights === 0) return 0;

  // Weighted average (on 0-5 scale)
  return sumProduct / sumWeights;
}

/**
 * Calculate average Functional score across R1-R4 periods
 * Excel Formula: =AVERAGE(R1, R2, R3, R4) - only non-zero values
 */
export function calculateFunctionalAverageAcrossPeriods(
  kras: IFunctionalKRA[] | undefined,
  includePilot: boolean = false
): number {
  const periods: Array<'pilot' | 1 | 2 | 3 | 4> = includePilot 
    ? ['pilot', 1, 2, 3, 4] 
    : [1, 2, 3, 4];
  
  const scores: number[] = [];
  
  for (const period of periods) {
    const score = calculateFunctionalDimensionScore(kras, period);
    if (score > 0) {
      scores.push(score);
    }
  }

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ============================================================================
// ORGANIZATIONAL DIMENSION CALCULATIONS
// Excel: Simple average of scores per Core Value, then average across values
// ============================================================================

/**
 * Calculate Organizational dimension score for a specific period
 * Excel Formula: =IF(SUM(scores)=0, 0, AVERAGE(scores))
 */
export function calculateOrganizationalDimensionScore(
  kras: IOrganizationalKRA[] | undefined,
  period: 'pilot' | 1 | 2 | 3 | 4
): number {
  if (!kras || kras.length === 0) return 0;

  const scores: number[] = [];

  for (const kra of kras) {
    // Organizational doesn't have pilot score in Excel structure
    if (period === 'pilot') continue;
    
    const scoreKey = `r${period}Score` as keyof IOrganizationalKRA;
    const score = (kra[scoreKey] as number) || 0;
    
    if (score > 0) {
      scores.push(score);
    }
  }

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Calculate average Organizational score across R1-R4 periods
 */
export function calculateOrganizationalAverageAcrossPeriods(
  kras: IOrganizationalKRA[] | undefined
): number {
  const periods: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
  const scores: number[] = [];

  for (const period of periods) {
    const score = calculateOrganizationalDimensionScore(kras, period);
    if (score > 0) {
      scores.push(score);
    }
  }

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ============================================================================
// SELF DEVELOPMENT DIMENSION CALCULATIONS
// Excel: Simple average including Pilot
// ============================================================================

/**
 * Calculate Self Development dimension score for a specific period
 */
export function calculateSelfDevelopmentDimensionScore(
  kras: ISelfDevelopmentKRA[] | undefined,
  period: 'pilot' | 1 | 2 | 3 | 4
): number {
  if (!kras || kras.length === 0) return 0;

  const scores: number[] = [];

  for (const kra of kras) {
    const scoreKey = period === 'pilot' ? 'pilotScore' : `r${period}Score` as keyof ISelfDevelopmentKRA;
    const score = (kra[scoreKey] as number) || 0;
    
    if (score > 0) {
      scores.push(score);
    }
  }

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Calculate average Self Development score across Pilot + R1-R4 periods
 */
export function calculateSelfDevelopmentAverageAcrossPeriods(
  kras: ISelfDevelopmentKRA[] | undefined,
  includePilot: boolean = true
): number {
  const periods: Array<'pilot' | 1 | 2 | 3 | 4> = includePilot
    ? ['pilot', 1, 2, 3, 4]
    : [1, 2, 3, 4];
  
  const scores: number[] = [];

  for (const period of periods) {
    const score = calculateSelfDevelopmentDimensionScore(kras, period);
    if (score > 0) {
      scores.push(score);
    }
  }

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ============================================================================
// DEVELOPING OTHERS DIMENSION CALCULATIONS
// Excel: Simple average including Pilot
// ============================================================================

/**
 * Calculate Developing Others dimension score for a specific period
 */
export function calculateDevelopingOthersDimensionScore(
  kras: IDevelopingOthersKRA[] | undefined,
  period: 'pilot' | 1 | 2 | 3 | 4
): number {
  if (!kras || kras.length === 0) return 0;

  const scores: number[] = [];

  for (const kra of kras) {
    const scoreKey = period === 'pilot' ? 'pilotScore' : `r${period}Score` as keyof IDevelopingOthersKRA;
    const score = (kra[scoreKey] as number) || 0;
    
    if (score > 0) {
      scores.push(score);
    }
  }

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Calculate average Developing Others score across Pilot + R1-R4 periods
 */
export function calculateDevelopingOthersAverageAcrossPeriods(
  kras: IDevelopingOthersKRA[] | undefined,
  includePilot: boolean = true
): number {
  const periods: Array<'pilot' | 1 | 2 | 3 | 4> = includePilot
    ? ['pilot', 1, 2, 3, 4]
    : [1, 2, 3, 4];
  
  const scores: number[] = [];

  for (const period of periods) {
    const score = calculateDevelopingOthersDimensionScore(kras, period);
    if (score > 0) {
      scores.push(score);
    }
  }

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ============================================================================
// 4D INDEX / FINAL SCORE CALCULATION
// Excel: Final = (Func × FuncWeight + Org × OrgWeight + Self × SelfWeight + Dev × DevWeight) / 100
// ============================================================================

export interface DimensionScoresResult {
  functional: number;      // 0-5 scale
  organizational: number;  // 0-5 scale
  selfDevelopment: number; // 0-5 scale
  developingOthers: number; // 0-5 scale
  fourDIndex: number;      // 0-5 scale (weighted final score)
  fourDIndexPercent: number; // 0-100 scale (for display)
}

export interface MemberKRAs {
  functionalKRAs?: IFunctionalKRA[];
  organizationalKRAs?: IOrganizationalKRA[];
  selfDevelopmentKRAs?: ISelfDevelopmentKRA[];
  developingOthersKRAs?: IDevelopingOthersKRA[];
}

/**
 * Calculate all dimension scores and the final 4D Index for a member
 * This is the MASTER calculation function used across all dashboards
 * 
 * @param memberKRAs - Member's KRA data
 * @param dimensionWeights - Organization's dimension weights (must sum to 100)
 * @param period - Specific period to calculate, or 'average' for across all periods
 * @param includePilot - Whether to include pilot scores in average calculations
 * @returns Dimension scores and 4D Index
 */
export function calculateMemberScores(
  memberKRAs: MemberKRAs,
  dimensionWeights: IDimensionWeights = DEFAULT_DIMENSION_WEIGHTS,
  period: 'average' | 'pilot' | 1 | 2 | 3 | 4 = 'average',
  includePilot: boolean = true
): DimensionScoresResult {
  let functional: number;
  let organizational: number;
  let selfDevelopment: number;
  let developingOthers: number;

  if (period === 'average') {
    // Calculate average across all periods
    functional = calculateFunctionalAverageAcrossPeriods(memberKRAs.functionalKRAs, includePilot);
    organizational = calculateOrganizationalAverageAcrossPeriods(memberKRAs.organizationalKRAs);
    selfDevelopment = calculateSelfDevelopmentAverageAcrossPeriods(memberKRAs.selfDevelopmentKRAs, includePilot);
    developingOthers = calculateDevelopingOthersAverageAcrossPeriods(memberKRAs.developingOthersKRAs, includePilot);
  } else {
    // Calculate for specific period
    functional = calculateFunctionalDimensionScore(memberKRAs.functionalKRAs, period);
    organizational = calculateOrganizationalDimensionScore(memberKRAs.organizationalKRAs, period);
    selfDevelopment = calculateSelfDevelopmentDimensionScore(memberKRAs.selfDevelopmentKRAs, period);
    developingOthers = calculateDevelopingOthersDimensionScore(memberKRAs.developingOthersKRAs, period);
  }

  // Calculate 4D Index (weighted average)
  // Excel: = (Func × FuncWeight + Org × OrgWeight + Self × SelfWeight + Dev × DevWeight) / 100
  const totalWeight = dimensionWeights.functional + dimensionWeights.organizational + 
                      dimensionWeights.selfDevelopment + dimensionWeights.developingOthers;
  
  // Handle case where total weight is not exactly 100 (normalize)
  const normalizer = totalWeight > 0 ? totalWeight : 100;
  
  const fourDIndex = (
    (functional * dimensionWeights.functional) +
    (organizational * dimensionWeights.organizational) +
    (selfDevelopment * dimensionWeights.selfDevelopment) +
    (developingOthers * dimensionWeights.developingOthers)
  ) / normalizer;

  return {
    functional: Math.round(functional * 100) / 100,
    organizational: Math.round(organizational * 100) / 100,
    selfDevelopment: Math.round(selfDevelopment * 100) / 100,
    developingOthers: Math.round(developingOthers * 100) / 100,
    fourDIndex: Math.round(fourDIndex * 100) / 100,
    fourDIndexPercent: Math.round(fourDIndex * 20), // Convert 0-5 to 0-100
  };
}

/**
 * Calculate scores for each period (for historical/trend data)
 */
export function calculateMemberScoresByPeriod(
  memberKRAs: MemberKRAs,
  dimensionWeights: IDimensionWeights = DEFAULT_DIMENSION_WEIGHTS
): Array<{ period: number; scores: DimensionScoresResult }> {
  const results: Array<{ period: number; scores: DimensionScoresResult }> = [];

  for (let period = 1; period <= 4; period++) {
    const scores = calculateMemberScores(memberKRAs, dimensionWeights, period as 1 | 2 | 3 | 4);
    
    // Only include if there's any score data
    if (scores.functional > 0 || scores.organizational > 0 || 
        scores.selfDevelopment > 0 || scores.developingOthers > 0) {
      results.push({ period, scores });
    }
  }

  return results;
}

// ============================================================================
// SALARY / HIKE CALCULATIONS
// ============================================================================

export interface HikeSlab {
  minScore: number;  // Minimum 4D Index (0-5 scale)
  maxScore: number;  // Maximum 4D Index (0-5 scale)
  hikePercent: number; // Hike percentage
}

export const DEFAULT_HIKE_SLABS: HikeSlab[] = [
  { minScore: 4.5, maxScore: 5.0, hikePercent: 15 },
  { minScore: 4.0, maxScore: 4.49, hikePercent: 12 },
  { minScore: 3.5, maxScore: 3.99, hikePercent: 10 },
  { minScore: 3.0, maxScore: 3.49, hikePercent: 7 },
  { minScore: 2.5, maxScore: 2.99, hikePercent: 5 },
  { minScore: 2.0, maxScore: 2.49, hikePercent: 3 },
  { minScore: 0, maxScore: 1.99, hikePercent: 0 },
];

/**
 * Calculate hike percentage based on 4D Index score
 */
export function calculateHikePercent(
  fourDIndex: number,
  hikeSlabs: HikeSlab[] = DEFAULT_HIKE_SLABS
): number {
  for (const slab of hikeSlabs) {
    if (fourDIndex >= slab.minScore && fourDIndex <= slab.maxScore) {
      return slab.hikePercent;
    }
  }
  return 0;
}

/**
 * Calculate salary hike details
 */
export function calculateSalaryHike(
  currentSalary: number,
  fourDIndex: number,
  hikeSlabs: HikeSlab[] = DEFAULT_HIKE_SLABS
): { hikePercent: number; hikeAmount: number; newSalary: number } {
  const hikePercent = calculateHikePercent(fourDIndex, hikeSlabs);
  const hikeAmount = Math.round(currentSalary * hikePercent / 100);
  const newSalary = currentSalary + hikeAmount;

  return {
    hikePercent,
    hikeAmount,
    newSalary,
  };
}

// Export utilities for use in other calculation functions
export { areEqual, EPSILON };

