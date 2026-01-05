/**
 * Pure calculation functions for performance management
 * These functions are JSON-in/JSON-out and can be imported by Flutter layer
 */

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

/**
 * Placeholder for calculation functions
 * Will be implemented based on Excel formulas from Figma images
 */
export interface CalculationInput {
  [key: string]: number | string | boolean | null;
}

export interface CalculationOutput {
  result: number | string | null;
  error?: string;
}

/**
 * Example calculation function template
 */
export function exampleCalculation(input: CalculationInput): CalculationOutput {
  try {
    // Implementation will match Excel formulas
    return { result: null };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export utilities for use in other calculation functions
export { areEqual, EPSILON };

