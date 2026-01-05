/**
 * Pure OTP generation and validation functions
 * JSON-in/JSON-out for Flutter compatibility
 */

/**
 * Generate a random 6-digit OTP
 * Formula: Random integer between 100000 and 999999
 */
export function generateOTP(): string {
  // Excel equivalent: =RANDBETWEEN(100000,999999)
  // Plain English: Generate random integer from 100000 to 999999
  const min = 100000;
  const max = 999999;
  const otp = Math.floor(Math.random() * (max - min + 1)) + min;
  return otp.toString().padStart(6, '0');
}

/**
 * Validate OTP format (must be 6 digits)
 */
export function validateOTPFormat(otp: string): boolean {
  // Excel equivalent: =AND(LEN(A1)=6,ISNUMBER(A1))
  // Plain English: Check if OTP is exactly 6 digits
  return /^\d{6}$/.test(otp);
}

/**
 * Check if OTP has expired
 * Formula: Current time >= Expiry time
 */
export function isOTPExpired(expiresAt: Date): boolean {
  // Excel equivalent: =NOW()>=B1 (where B1 is expiry time)
  // Plain English: Check if current time is greater than or equal to expiry time
  return new Date() >= expiresAt;
}

/**
 * Calculate OTP expiry time (10 minutes from now)
 * Formula: Current time + 10 minutes
 */
export function calculateOTPExpiry(): Date {
  // Excel equivalent: =NOW()+TIME(0,10,0)
  // Plain English: Add 10 minutes to current time
  const now = new Date();
  return new Date(now.getTime() + 10 * 60 * 1000);
}

/**
 * Check if OTP attempts exceeded limit (max 3)
 * Formula: Attempts >= 3
 */
export function isAttemptsExceeded(attempts: number): boolean {
  // Excel equivalent: =A1>=3
  // Plain English: Check if attempts are greater than or equal to 3
  return attempts >= 3;
}

/**
 * Verify OTP match (case-sensitive string comparison)
 */
export function verifyOTPMatch(inputOTP: string, storedOTP: string): boolean {
  // Excel equivalent: =A1=B1 (exact match)
  // Plain English: Check if input OTP exactly matches stored OTP
  return inputOTP === storedOTP;
}

/**
 * Calculate remaining attempts
 * Formula: Max attempts (3) - Current attempts
 */
export function calculateRemainingAttempts(attempts: number): number {
  // Excel equivalent: =3-A1
  // Plain English: Subtract current attempts from maximum (3)
  const maxAttempts = 3;
  return Math.max(0, maxAttempts - attempts);
}

/**
 * Calculate cooldown time remaining in seconds
 * Formula: Expiry time - Current time (convert to seconds)
 */
export function calculateCooldownSeconds(expiresAt: Date): number {
  // Excel equivalent: =MAX(0,(B1-NOW())*86400) (where B1 is expiry)
  // Plain English: Calculate seconds remaining until expiry, minimum 0
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}

