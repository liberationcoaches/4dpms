import { safeDivide, exampleCalculation } from '../utils/calculations';

describe('Calculation Utilities', () => {
  describe('safeDivide', () => {
    it('should divide two numbers correctly', () => {
      expect(safeDivide(10, 2)).toBe(5);
      expect(safeDivide(15, 3)).toBe(5);
    });

    it('should return null for division by zero', () => {
      expect(safeDivide(10, 0)).toBeNull();
      expect(safeDivide(-5, 0)).toBeNull();
    });

    it('should handle negative numbers', () => {
      expect(safeDivide(-10, 2)).toBe(-5);
      expect(safeDivide(10, -2)).toBe(-5);
    });

    it('should handle decimal division', () => {
      const result = safeDivide(1, 3);
      expect(result).toBeCloseTo(0.3333333333, 10);
    });
  });

  describe('exampleCalculation', () => {
    it('should return a result object', () => {
      const result = exampleCalculation({});
      expect(result).toHaveProperty('result');
    });
  });
});

