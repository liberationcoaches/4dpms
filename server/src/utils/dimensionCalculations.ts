/**
 * Calculation functions for different dimensions
 */

/**
 * Calculate Average Score for any dimension (R1, R2, R3, R4)
 */
export function calculateAverageScore(scores: (number | undefined | null)[]): number | null {
  const validScores = scores.filter(
    (score) => score !== undefined && score !== null && !isNaN(score) && score !== 0
  ) as number[];

  if (validScores.length === 0) {
    return null;
  }

  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return sum / validScores.length;
}

/**
 * Calculate average for Organizational Dimension
 */
export function calculateOrganizationalAverage(dimension: {
  r1Score?: number;
  r2Score?: number;
  r3Score?: number;
  r4Score?: number;
}): number | null {
  return calculateAverageScore([dimension.r1Score, dimension.r2Score, dimension.r3Score, dimension.r4Score]);
}

/**
 * Calculate average for Self Development
 */
export function calculateSelfDevelopmentAverage(development: {
  r1Score?: number;
  r2Score?: number;
  r3Score?: number;
  r4Score?: number;
}): number | null {
  return calculateAverageScore([development.r1Score, development.r2Score, development.r3Score, development.r4Score]);
}

/**
 * Calculate average for Developing Others
 */
export function calculateDevelopingOthersAverage(developing: {
  r1Score?: number;
  r2Score?: number;
  r3Score?: number;
  r4Score?: number;
}): number | null {
  return calculateAverageScore([developing.r1Score, developing.r2Score, developing.r3Score, developing.r4Score]);
}


