/**
 * KRA Calculation Functions
 * Based on Excel formulas from KRA Setting sheet
 */

import {
  IFunctionalKRA,
  IOrganizationalKRA,
  ISelfDevelopmentKRA,
  IDevelopingOthersKRA,
} from '../models/Team';

/**
 * Calculate Average Score for Functional Dimension KRA
 * Excel Formula: =AVERAGE(R1, R2, R3, R4)
 */
export function calculateFunctionalAverageScore(kra: IFunctionalKRA): number | null {
  const scores: number[] = [];

  // Collect valid scores (non-zero, non-null, non-undefined)
  if (kra.r1Score !== undefined && kra.r1Score !== null && !isNaN(kra.r1Score) && kra.r1Score !== 0) {
    scores.push(kra.r1Score);
  }
  if (kra.r2Score !== undefined && kra.r2Score !== null && !isNaN(kra.r2Score) && kra.r2Score !== 0) {
    scores.push(kra.r2Score);
  }
  if (kra.r3Score !== undefined && kra.r3Score !== null && !isNaN(kra.r3Score) && kra.r3Score !== 0) {
    scores.push(kra.r3Score);
  }
  if (kra.r4Score !== undefined && kra.r4Score !== null && !isNaN(kra.r4Score) && kra.r4Score !== 0) {
    scores.push(kra.r4Score);
  }

  if (scores.length === 0) {
    return null; // No valid scores
  }

  // Excel AVERAGE function
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return sum / scores.length;
}

/**
 * Calculate weighted average for Functional KRA if weights are provided
 * Excel Formula: =SUMPRODUCT(scores, weights) / SUM(weights)
 */
export function calculateFunctionalWeightedAverage(kra: IFunctionalKRA): number | null {
  const scores: number[] = [];
  const weights: number[] = [];

  // Collect valid score-weight pairs
  if (kra.r1Score !== undefined && kra.r1Score !== null && kra.r1Weight !== undefined && kra.r1Weight !== null) {
    scores.push(kra.r1Score);
    weights.push(kra.r1Weight);
  }
  if (kra.r2Score !== undefined && kra.r2Score !== null && kra.r2Weight !== undefined && kra.r2Weight !== null) {
    scores.push(kra.r2Score);
    weights.push(kra.r2Weight);
  }
  if (kra.r3Score !== undefined && kra.r3Score !== null && kra.r3Weight !== undefined && kra.r3Weight !== null) {
    scores.push(kra.r3Score);
    weights.push(kra.r3Weight);
  }
  if (kra.r4Score !== undefined && kra.r4Score !== null && kra.r4Weight !== undefined && kra.r4Weight !== null) {
    scores.push(kra.r4Score);
    weights.push(kra.r4Weight);
  }

  if (scores.length === 0 || weights.length === 0) {
    return null;
  }

  // Excel SUMPRODUCT equivalent
  const sumProduct = scores.reduce((acc, score, idx) => acc + score * weights[idx], 0);
  const sumWeights = weights.reduce((acc, weight) => acc + weight, 0);

  if (sumWeights === 0) {
    return null; // Division by zero
  }

  return sumProduct / sumWeights;
}

/**
 * Calculate Average Score for Organizational Dimension
 * Excel Formula: =AVERAGE(R1, R2, R3, R4)
 */
export function calculateOrganizationalAverageScore(kra: IOrganizationalKRA): number | null {
  const scores: number[] = [];
  if (kra.r1Score !== undefined && kra.r1Score !== null && !isNaN(kra.r1Score) && kra.r1Score !== 0) {
    scores.push(kra.r1Score);
  }
  if (kra.r2Score !== undefined && kra.r2Score !== null && !isNaN(kra.r2Score) && kra.r2Score !== 0) {
    scores.push(kra.r2Score);
  }
  if (kra.r3Score !== undefined && kra.r3Score !== null && !isNaN(kra.r3Score) && kra.r3Score !== 0) {
    scores.push(kra.r3Score);
  }
  if (kra.r4Score !== undefined && kra.r4Score !== null && !isNaN(kra.r4Score) && kra.r4Score !== 0) {
    scores.push(kra.r4Score);
  }
  if (scores.length === 0) return null;
  return scores.reduce((acc, score) => acc + score, 0) / scores.length;
}

/**
 * Calculate Average Score for Self Development
 * Excel Formula: =AVERAGE(Pilot, R1, R2, R3, R4)
 */
export function calculateSelfDevelopmentAverageScore(kra: ISelfDevelopmentKRA): number | null {
  const scores: number[] = [];
  if (kra.pilotScore !== undefined && kra.pilotScore !== null && !isNaN(kra.pilotScore) && kra.pilotScore !== 0) {
    scores.push(kra.pilotScore);
  }
  if (kra.r1Score !== undefined && kra.r1Score !== null && !isNaN(kra.r1Score) && kra.r1Score !== 0) {
    scores.push(kra.r1Score);
  }
  if (kra.r2Score !== undefined && kra.r2Score !== null && !isNaN(kra.r2Score) && kra.r2Score !== 0) {
    scores.push(kra.r2Score);
  }
  if (kra.r3Score !== undefined && kra.r3Score !== null && !isNaN(kra.r3Score) && kra.r3Score !== 0) {
    scores.push(kra.r3Score);
  }
  if (kra.r4Score !== undefined && kra.r4Score !== null && !isNaN(kra.r4Score) && kra.r4Score !== 0) {
    scores.push(kra.r4Score);
  }
  if (scores.length === 0) return null;
  return scores.reduce((acc, score) => acc + score, 0) / scores.length;
}

/**
 * Calculate Average Score for Developing Others
 * Excel Formula: =AVERAGE(Pilot, R1, R2, R3, R4)
 */
export function calculateDevelopingOthersAverageScore(kra: IDevelopingOthersKRA): number | null {
  const scores: number[] = [];
  if (kra.pilotScore !== undefined && kra.pilotScore !== null && !isNaN(kra.pilotScore) && kra.pilotScore !== 0) {
    scores.push(kra.pilotScore);
  }
  if (kra.r1Score !== undefined && kra.r1Score !== null && !isNaN(kra.r1Score) && kra.r1Score !== 0) {
    scores.push(kra.r1Score);
  }
  if (kra.r2Score !== undefined && kra.r2Score !== null && !isNaN(kra.r2Score) && kra.r2Score !== 0) {
    scores.push(kra.r2Score);
  }
  if (kra.r3Score !== undefined && kra.r3Score !== null && !isNaN(kra.r3Score) && kra.r3Score !== 0) {
    scores.push(kra.r3Score);
  }
  if (kra.r4Score !== undefined && kra.r4Score !== null && !isNaN(kra.r4Score) && kra.r4Score !== 0) {
    scores.push(kra.r4Score);
  }
  if (scores.length === 0) return null;
  return scores.reduce((acc, score) => acc + score, 0) / scores.length;
}

/**
 * Update average score for Functional KRA
 */
export function updateFunctionalKRAAverageScore(kra: IFunctionalKRA): IFunctionalKRA {
  const avgScore = calculateFunctionalAverageScore(kra);
  return {
    ...kra,
    averageScore: avgScore ?? undefined,
  };
}

/**
 * Update average score for Organizational KRA
 */
export function updateOrganizationalKRAAverageScore(kra: IOrganizationalKRA): IOrganizationalKRA {
  const avgScore = calculateOrganizationalAverageScore(kra);
  return {
    ...kra,
    averageScore: avgScore ?? undefined,
  };
}

/**
 * Update average score for Self Development KRA
 */
export function updateSelfDevelopmentKRAAverageScore(kra: ISelfDevelopmentKRA): ISelfDevelopmentKRA {
  const avgScore = calculateSelfDevelopmentAverageScore(kra);
  return {
    ...kra,
    averageScore: avgScore ?? undefined,
  };
}

/**
 * Update average score for Developing Others KRA
 */
export function updateDevelopingOthersKRAAverageScore(kra: IDevelopingOthersKRA): IDevelopingOthersKRA {
  const avgScore = calculateDevelopingOthersAverageScore(kra);
  return {
    ...kra,
    averageScore: avgScore ?? undefined,
  };
}

/**
 * Validate Functional KRA data
 */
export function validateFunctionalKRA(kra: Partial<IFunctionalKRA>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!kra.kra || !kra.kra.trim()) {
    errors.push('KRA name is required');
  }
  
  // Validate KPIs
  if (!kra.kpis || !Array.isArray(kra.kpis) || kra.kpis.length === 0) {
    errors.push('At least one KPI is required');
  } else {
    kra.kpis.forEach((kpi, index) => {
      if (!kpi.kpi || !kpi.kpi.trim()) {
        errors.push(`KPI ${index + 1} is required`);
      }
    });
  }
  
  // Validate pilot score (0-5)
  if (kra.pilotScore !== undefined && kra.pilotScore !== null) {
    if (isNaN(kra.pilotScore) || kra.pilotScore < 0 || kra.pilotScore > 5) {
      errors.push('Pilot score must be between 0 and 5');
    }
  }
  
  // Validate review scores (0-5)
  const scoreFields = ['r1Score', 'r2Score', 'r3Score', 'r4Score'] as const;
  scoreFields.forEach((field) => {
    const score = kra[field];
    if (score !== undefined && score !== null) {
      if (isNaN(score) || score < 0 || score > 5) {
        errors.push(`${field} must be between 0 and 5`);
      }
    }
  });
  
  // Validate weights (10-100, multiples of 10)
  const weightFields = ['pilotWeight', 'r1Weight', 'r2Weight', 'r3Weight', 'r4Weight'] as const;
  weightFields.forEach((field) => {
    const weight = kra[field];
    if (weight !== undefined && weight !== null) {
      if (isNaN(weight) || weight < 10 || weight > 100 || weight % 10 !== 0) {
        errors.push(`${field} must be between 10 and 100 and a multiple of 10`);
      }
    }
  });
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate Organizational KRA data
 */
export function validateOrganizationalKRA(kra: Partial<IOrganizationalKRA>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!kra.coreValues || !kra.coreValues.trim()) {
    errors.push('Core Values is required');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate Self Development KRA data
 */
export function validateSelfDevelopmentKRA(kra: Partial<ISelfDevelopmentKRA>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!kra.areaOfConcern || !kra.areaOfConcern.trim()) {
    errors.push('Area of Concern is required');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate Developing Others KRA data
 */
export function validateDevelopingOthersKRA(kra: Partial<IDevelopingOthersKRA>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!kra.person || !kra.person.trim()) {
    errors.push('Person is required');
  }
  return { valid: errors.length === 0, errors };
}

