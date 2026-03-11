import { z } from 'zod';

/**
 * Sign Up validation schema (new org_admin flow)
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
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  orgName: z
    .string()
    .min(1, 'Organization name is required')
    .max(200, 'Organization name cannot exceed 200 characters')
    .trim(),
  orgSize: z.enum(['1-10', '11-50', '51-200', '200+'], {
    errorMap: () => ({ message: 'Please select organization size' }),
  }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * Legacy sign up schema (for backward compat - boss/manager/employee with codes)
 */
export const signUpLegacySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  mobile: z.string().regex(/^[0-9]{10}$/).trim(),
  designation: z.string().max(100).trim().optional(),
  companyName: z.string().max(200).trim().optional(),
  industry: z.enum(['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Consulting', 'Other']).optional(),
  signupType: z.enum(['platform_admin', 'reviewer', 'boss', 'manager', 'employee']),
  orgCode: z.string().regex(/^[A-Z0-9]{6,8}$/).optional(),
  teamCode: z.string().regex(/^[A-Z0-9]{4,8}$/).optional(),
}).refine((data) => {
  if (data.signupType === 'platform_admin' || data.signupType === 'reviewer') return true;
  if (data.signupType === 'boss') return true;
  if (data.signupType === 'manager') return !!data.orgCode;
  if (data.signupType === 'employee') return !!data.teamCode;
  return true;
}, { message: 'Organization code is required for Supervisors, Team code is required for Members', path: ['orgCode'] });

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

/**
 * Sign up (Boss only - create organization). No role selection.
 */
export const signUpBossSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters').trim(),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits').trim(),
  designation: z.string().max(100).trim().optional(),
  companyName: z.string().max(200).trim().optional(),
  industry: z.enum(['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Consulting', 'Other']).optional(),
});

export type SignUpBossInput = z.infer<typeof signUpBossSchema>;

/**
 * Create invite (CSA / Boss / Manager). Role comes from invite, not from sign-up.
 */
export const createInviteSchema = z.object({
  role: z.enum(['manager', 'employee'], { errorMap: () => ({ message: 'Invalid role' }) }),
  organizationId: z.string().min(1, 'Organization is required'),
  teamId: z.string().optional(),
}).refine((data) => {
  if (data.role === 'employee') return !!data.teamId;
  return true;
}, { message: 'Team is required for Member invite', path: ['teamId'] });

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/**
 * Sign up with invite. No role selection – role comes from invite.
 * When invite has invitedUserId (pre-created user), password is required; name/email/mobile can be omitted.
 */
export const signupWithInviteSchema = z.object({
  inviteToken: z.string().min(1).optional(),
  inviteCode: z.string().min(1).optional(),
  name: z.string().max(100).trim().optional(),
  email: z.string().email('Invalid email format').toLowerCase().trim().optional(),
  mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits').trim().optional(),
  designation: z.string().max(100).trim().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
}).refine((data) => !!data.inviteToken || !!data.inviteCode, {
  message: 'Invite link or code is required',
  path: ['inviteToken'],
});

export type SignupWithInviteInput = z.infer<typeof signupWithInviteSchema>;

