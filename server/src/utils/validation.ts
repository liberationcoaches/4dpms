import { z } from 'zod';

/**
 * Sign Up validation schema
 */
export const signUpSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  mobile: z
    .string()
    .regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits')
    .trim(),
  designation: z
    .string()
    .max(100, 'Designation cannot exceed 100 characters')
    .trim()
    .optional(),
  companyName: z
    .string()
    .max(200, 'Company name cannot exceed 200 characters')
    .trim()
    .optional(),
  industry: z.enum(
    ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Consulting', 'Other'],
    {
      errorMap: () => ({ message: 'Invalid industry selected' }),
    }
  ).optional(),
  signupType: z.enum(['platform_admin', 'reviewer', 'boss', 'manager', 'employee'], {
    errorMap: () => ({ message: 'Invalid signup type' }),
  }),
  orgCode: z
    .preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.string()
        .regex(/^[A-Z0-9]{6,8}$/, 'Organization code must be 6-8 alphanumeric characters')
        .optional()
    ),
  teamCode: z
    .preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.string()
        .regex(/^[A-Z0-9]{4,8}$/, 'Team code must be 4-8 alphanumeric characters')
        .optional()
    ),
}).refine((data) => {
  // Platform admin and reviewer don't need codes or designation
  if (data.signupType === 'platform_admin' || data.signupType === 'reviewer') return true;
  // Boss doesn't need codes
  if (data.signupType === 'boss') return true;
  // Manager needs org code
  if (data.signupType === 'manager') return !!data.orgCode;
  // Employee needs team code
  if (data.signupType === 'employee') return !!data.teamCode;
  return true;
}, {
  message: 'Organization code is required for managers, Team code is required for employees',
  path: ['orgCode'],
});

export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * OTP Verification schema
 */
export const otpVerificationSchema = z.object({
  mobile: z.string().regex(/^[0-9]{10}$/, 'Invalid mobile number'),
  mobileOTP: z.string().regex(/^\d{6}$/, 'Mobile OTP must be 6 digits'),
});

export type OTPVerificationInput = z.infer<typeof otpVerificationSchema>;

/**
 * Single OTP verification schema (for individual OTP checks)
 */
export const singleOTPVerificationSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

/**
 * Resend OTP schema
 */
export const resendOTPSchema = z.object({
  mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits'),
});

export type ResendOTPInput = z.infer<typeof resendOTPSchema>;

