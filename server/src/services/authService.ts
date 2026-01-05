import { User, IUser } from '../models/User';
import { OTP, IOTP } from '../models/OTP';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import {
  generateOTP,
  validateOTPFormat,
  isOTPExpired,
  calculateOTPExpiry,
  isAttemptsExceeded,
  verifyOTPMatch,
} from '../utils/otpService';
import { generateOrgCode, generateTeamCode } from '../utils/codeGenerator';
import { SignUpInput, OTPVerificationInput } from '../utils/validation';

/**
 * Create a new user account (unverified) with hierarchical organization structure
 */
export async function createUser(data: SignUpInput): Promise<{ user: IUser; orgCode?: string; teamCode?: string }> {
  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: data.email }, { mobile: data.mobile }],
  });

  if (existingUser) {
    throw new Error('User with this email or mobile already exists');
  }

  let user: IUser;
  let orgCode: string | undefined;
  let teamCode: string | undefined;

  if (data.signupType === 'platform_admin') {
    // Platform Admin signup: Simple signup, no organization, no team, no access code required
    user = new User({
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      companyName: '',
      industry: 'Other',
      isMobileVerified: false,
      role: 'platform_admin',
      hierarchyLevel: 0,
      // No accessCode set - platform admin doesn't need access code
    });

    await user.save();
  } else if (data.signupType === 'reviewer') {
    // Reviewer signup: Simple signup, no organization, no team, no access code required
    user = new User({
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      companyName: '',
      industry: 'Other',
      isMobileVerified: false,
      role: 'reviewer',
      hierarchyLevel: 0,
      // No accessCode set - reviewer doesn't need access code
    });

    await user.save();
  } else if (data.signupType === 'boss') {
    // Boss signup: Create organization and generate org code
    const orgCodeGenerated = await generateOrgCode();
    const org = new Organization({
      name: data.companyName || `${data.name}'s Organization`,
      code: orgCodeGenerated,
      type: data.industry || 'Other',
      employeeSize: '',
      bossId: null as any, // Will be set after user creation
    });

    user = new User({
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      companyName: data.companyName || '',
      industry: data.industry || 'Other',
      isMobileVerified: false,
      role: 'boss',
      hierarchyLevel: 1,
      organizationId: null as any, // Will be set after org creation
    });

    await user.save();
    org.bossId = user._id;
    await org.save();
    user.organizationId = org._id;
    await user.save();

    orgCode = orgCodeGenerated;
  } else if (data.signupType === 'manager') {
    // Manager signup: Use org code, create team, generate team code
    if (!data.orgCode) {
      throw new Error('Organization code is required for manager signup');
    }

    const org = await Organization.findOne({ code: data.orgCode.toUpperCase() });
    if (!org) {
      throw new Error('Invalid organization code');
    }

    const teamCodeGenerated = await generateTeamCode();
    const team = new Team({
      name: `${data.name}'s Team`,
      code: teamCodeGenerated,
      createdBy: null as any, // Will be set after user creation
      members: [],
      membersDetails: [],
    });

    user = new User({
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      companyName: org.name,
      industry: org.type || 'Other',
      isMobileVerified: false,
      role: 'manager',
      hierarchyLevel: 2,
      organizationId: org._id,
      bossId: org.bossId,
      teamId: null as any, // Will be set after team creation
    });

    await user.save();
    team.createdBy = user._id;
    team.members = [user._id];
    await team.save();
    user.teamId = team._id;
    await user.save();
    org.managers.push(user._id);
    await org.save();

    teamCode = teamCodeGenerated;
  } else if (data.signupType === 'employee') {
    // Employee signup: Use team code
    if (!data.teamCode) {
      throw new Error('Team code is required for employee signup');
    }

    const team = await Team.findOne({ code: data.teamCode.toUpperCase() });
    if (!team) {
      throw new Error('Invalid team code');
    }

    // Get organization from manager
    const manager = await User.findById(team.createdBy);
    if (!manager || !manager.organizationId) {
      throw new Error('Team manager or organization not found');
    }

    const org = await Organization.findById(manager.organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    user = new User({
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      companyName: org.name,
      industry: org.type || 'Other',
      isMobileVerified: false,
      role: 'employee',
      hierarchyLevel: 3,
      organizationId: org._id,
      bossId: org.bossId,
      managerId: manager._id,
      teamId: team._id,
    });

    await user.save();
    team.members.push(user._id);
    await team.save();
  } else {
    throw new Error('Invalid signup type');
  }

  return { user, orgCode, teamCode };
}

/**
 * Generate and save OTP for email or mobile
 */
export async function generateAndSaveOTP(identifier: string, type: 'email' | 'mobile'): Promise<string> {
  const otp = generateOTP();
  const expiresAt = calculateOTPExpiry();

  // Normalize identifier (trim and ensure consistent format for mobile)
  const normalizedIdentifier = type === 'mobile' ? identifier.trim().replace(/\D/g, '') : identifier.trim().toLowerCase();

  // Invalidate previous OTPs for this identifier
  await OTP.updateMany(
    { identifier: normalizedIdentifier, type, isUsed: false },
    { isUsed: true }
  );

  // Create new OTP
  const otpRecord = new OTP({
    identifier: normalizedIdentifier,
    type,
    otp,
    expiresAt,
    attempts: 0,
    isUsed: false,
  });

  await otpRecord.save();
  return otp;
}

/**
 * Verify single OTP (for auto-validation)
 * @param markAsUsed - If true, marks OTP as used. If false, only validates without marking as used.
 */
export async function verifySingleOTP(
  identifier: string,
  type: 'email' | 'mobile',
  inputOTP: string,
  markAsUsed: boolean = true
): Promise<boolean> {
  if (!validateOTPFormat(inputOTP)) {
    return false;
  }

  // Normalize identifier (trim and ensure consistent format for mobile)
  const normalizedIdentifier = type === 'mobile' ? identifier.trim().replace(/\D/g, '') : identifier.trim().toLowerCase();

  // Find most recent unused OTP
  const otpRecord = await OTP.findOne({
    identifier: normalizedIdentifier,
    type,
    isUsed: false,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return false;
  }

  // Check if expired
  if (isOTPExpired(otpRecord.expiresAt)) {
    return false;
  }

  // Check attempts
  if (isAttemptsExceeded(otpRecord.attempts)) {
    return false;
  }

  // Verify OTP
  if (!verifyOTPMatch(inputOTP, otpRecord.otp)) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    return false;
  }

  // Mark as used only if requested
  if (markAsUsed) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    // Update user verification status only when marking as used
    if (type === 'mobile') {
      const user = await User.findOne({ mobile: normalizedIdentifier });
      if (user) {
        user.isMobileVerified = true;
        await user.save();
      }
    }
  }
  
  return true;
}

/**
 * Verify mobile OTP and activate user
 */
export async function verifyUserOTPs(data: OTPVerificationInput): Promise<IUser> {
  // Normalize mobile
  const normalizedMobile = data.mobile.trim().replace(/\D/g, '');

  // Verify mobile OTP
  const mobileVerified = await verifySingleOTP(normalizedMobile, 'mobile', data.mobileOTP, true);
  if (!mobileVerified) {
    throw new Error('Invalid or expired mobile OTP');
  }

  // Update user verification status
  const user = await User.findOne({ mobile: normalizedMobile });
  if (!user) {
    throw new Error('User not found');
  }

  user.isMobileVerified = true;
  await user.save();

  return user;
}

/**
 * Get user by email or mobile
 */
export async function getUserByIdentifier(email?: string, mobile?: string): Promise<IUser | null> {
  if (email) {
    return await User.findOne({ email });
  }
  if (mobile) {
    return await User.findOne({ mobile });
  }
  return null;
}

