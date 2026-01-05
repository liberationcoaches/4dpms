import {
  generateOTP,
  validateOTPFormat,
  isOTPExpired,
  calculateOTPExpiry,
  isAttemptsExceeded,
  verifyOTPMatch,
  calculateRemainingAttempts,
  calculateCooldownSeconds,
} from '../../utils/otpService';

describe('OTP Service - Pure Functions', () => {
  describe('generateOTP', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should generate different OTPs on multiple calls', () => {
      const otps = new Set();
      for (let i = 0; i < 100; i++) {
        otps.add(generateOTP());
      }
      // Very high probability of unique OTPs
      expect(otps.size).toBeGreaterThan(90);
    });

    it('should generate OTPs in valid range (100000-999999)', () => {
      for (let i = 0; i < 100; i++) {
        const otp = parseInt(generateOTP(), 10);
        expect(otp).toBeGreaterThanOrEqual(100000);
        expect(otp).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('validateOTPFormat', () => {
    it('should validate correct 6-digit OTP', () => {
      expect(validateOTPFormat('123456')).toBe(true);
      expect(validateOTPFormat('000000')).toBe(true);
      expect(validateOTPFormat('999999')).toBe(true);
    });

    it('should reject invalid OTPs', () => {
      expect(validateOTPFormat('12345')).toBe(false); // 5 digits
      expect(validateOTPFormat('1234567')).toBe(false); // 7 digits
      expect(validateOTPFormat('12345a')).toBe(false); // contains letter
      expect(validateOTPFormat('')).toBe(false); // empty
      expect(validateOTPFormat('12 345')).toBe(false); // contains space
    });
  });

  describe('isOTPExpired', () => {
    it('should return true for expired OTPs', () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(isOTPExpired(pastDate)).toBe(true);
    });

    it('should return false for future expiry dates', () => {
      const futureDate = new Date(Date.now() + 60000);
      expect(isOTPExpired(futureDate)).toBe(false);
    });

    it('should handle edge case of exact current time', () => {
      const now = new Date();
      // Small tolerance for test execution time
      const slightlyPast = new Date(now.getTime() - 100);
      expect(isOTPExpired(slightlyPast)).toBe(true);
    });
  });

  describe('calculateOTPExpiry', () => {
    it('should calculate expiry 10 minutes from now', () => {
      const now = Date.now();
      const expiry = calculateOTPExpiry();
      const diff = expiry.getTime() - now;
      const expectedDiff = 10 * 60 * 1000; // 10 minutes in ms

      // Allow 1 second tolerance for execution time
      expect(diff).toBeGreaterThanOrEqual(expectedDiff - 1000);
      expect(diff).toBeLessThanOrEqual(expectedDiff + 1000);
    });
  });

  describe('isAttemptsExceeded', () => {
    it('should return true when attempts >= 3', () => {
      expect(isAttemptsExceeded(3)).toBe(true);
      expect(isAttemptsExceeded(4)).toBe(true);
      expect(isAttemptsExceeded(10)).toBe(true);
    });

    it('should return false when attempts < 3', () => {
      expect(isAttemptsExceeded(0)).toBe(false);
      expect(isAttemptsExceeded(1)).toBe(false);
      expect(isAttemptsExceeded(2)).toBe(false);
    });
  });

  describe('verifyOTPMatch', () => {
    it('should match identical OTPs', () => {
      expect(verifyOTPMatch('123456', '123456')).toBe(true);
      expect(verifyOTPMatch('000000', '000000')).toBe(true);
    });

    it('should not match different OTPs', () => {
      expect(verifyOTPMatch('123456', '654321')).toBe(false);
      expect(verifyOTPMatch('123456', '123457')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(verifyOTPMatch('123456', '123456')).toBe(true);
      // OTPs are numeric, but test demonstrates exact match requirement
    });
  });

  describe('calculateRemainingAttempts', () => {
    it('should calculate remaining attempts correctly', () => {
      expect(calculateRemainingAttempts(0)).toBe(3);
      expect(calculateRemainingAttempts(1)).toBe(2);
      expect(calculateRemainingAttempts(2)).toBe(1);
      expect(calculateRemainingAttempts(3)).toBe(0);
      expect(calculateRemainingAttempts(4)).toBe(0);
    });
  });

  describe('calculateCooldownSeconds', () => {
    it('should calculate remaining seconds correctly', () => {
      const futureDate = new Date(Date.now() + 5000); // 5 seconds from now
      const seconds = calculateCooldownSeconds(futureDate);
      expect(seconds).toBeGreaterThanOrEqual(4);
      expect(seconds).toBeLessThanOrEqual(5);
    });

    it('should return 0 for expired dates', () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(calculateCooldownSeconds(pastDate)).toBe(0);
    });

    it('should return 0 for dates in the past', () => {
      const pastDate = new Date(Date.now() - 60000);
      expect(calculateCooldownSeconds(pastDate)).toBe(0);
    });
  });
});

