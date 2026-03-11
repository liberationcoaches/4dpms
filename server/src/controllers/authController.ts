import { Request, Response, NextFunction } from 'express';
import { createOrgAdminUser, generateAndSaveOTP, verifyUserOTPs, verifySingleOTP } from '../services/authService';
import { createUserFromInvite } from '../services/inviteService';
import { sendInviteEmail, sendVerificationEmail } from '../utils/emailService';
import {
  signUpSchema,
  signupWithInviteSchema,
  otpVerificationSchema,
  singleOTPVerificationSchema,
  resendOTPSchema,
} from '../utils/validation';
import crypto from 'crypto';

/**
 * Sign up new org_admin user (creates organization)
 * POST /api/auth/signup
 */
export async function signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = signUpSchema.parse(req.body);

    const { user, orgCode } = await createOrgAdminUser(validatedData);

    // Generate verification token and send verification email
    const verifyEmailToken = crypto.randomBytes(32).toString('hex');
    const { User } = await import('../models/User');
    await User.findByIdAndUpdate(user._id, { verifyEmailToken });

    const baseUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const verifyLink = `${baseUrl}/auth/verify-email?token=${verifyEmailToken}`;

    try {
      await sendVerificationEmail({
        to: user.email,
        recipientName: user.name,
        verifyLink,
      });
    } catch (emailErr) {
      console.error('[authController] Failed to send verification email:', emailErr);
    }

    res.status(201).json({
      status: 'success',
      message: 'User created successfully.',
      data: {
        userId: user._id.toString(),
        email: user.email,
        mobile: user.mobile,
        role: 'org_admin',
        orgCode,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Sign up with invite. No role selection – role from invite.
 * POST /api/auth/signup-with-invite
 */
export async function signupWithInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = signupWithInviteSchema.parse(req.body);
    const result = await createUserFromInvite(validatedData);
    const { user, teamCode, isPreCreated } = result;

    let mobileOTP: string | undefined;
    const usedPassword = !!(validatedData.password && validatedData.password.length >= 6);
    if (!isPreCreated && !usedPassword) {
      mobileOTP = await generateAndSaveOTP(user.mobile, 'mobile');
    }

    res.status(201).json({
      status: 'success',
      message: isPreCreated ? 'Account activated. You can now log in.' : usedPassword ? 'Account created. You can now log in.' : 'User created. OTP sent to mobile.',
      data: {
        userId: user._id.toString(),
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        teamCode: teamCode || undefined,
        mobileOTP: !isPreCreated && !usedPassword && process.env.NODE_ENV === 'development' ? mobileOTP : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Sign up with organization code. User selects their role.
 * POST /api/auth/signup-with-org
 */
export async function signupWithOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, mobile, role, organizationId, designation } = req.body;

    // Validate required fields
    if (!name || !email || !mobile || !role || !organizationId) {
      res.status(400).json({
        status: 'error',
        message: 'Name, email, mobile, role, and organizationId are required',
      });
      return;
    }

    // Validate role
    const validRoles = ['boss', 'manager', 'employee'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be boss, manager, or employee',
      });
      return;
    }

    // Check if organization exists
    const { Organization } = await import('../models/Organization');
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found',
      });
      return;
    }

    // Check if email already exists
    const { User } = await import('../models/User');
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.trim().replace(/\D/g, '');

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      res.status(400).json({
        status: 'error',
        message: 'A user with this email already exists',
      });
      return;
    }

    const existingMobile = await User.findOne({ mobile: normalizedMobile });
    if (existingMobile) {
      res.status(400).json({
        status: 'error',
        message: 'A user with this mobile number already exists',
      });
      return;
    }

    // Create user
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      role,
      designation: designation?.trim() || undefined,
      organizationId: organization._id,
      isActive: false,
      isMobileVerified: false,
    });

    await user.save();

    // Generate OTP for mobile
    const mobileOTP = await generateAndSaveOTP(normalizedMobile, 'mobile');

    res.status(201).json({
      status: 'success',
      message: 'User created. OTP sent to mobile.',
      data: {
        userId: user._id.toString(),
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        mobileOTP: process.env.NODE_ENV === 'development' ? mobileOTP : undefined,
      },
    });

    // Send join notification to CSA (async, non-blocking)
    try {
      const { sendNewMemberNotificationToCSA } = await import('./notificationController');
      await sendNewMemberNotificationToCSA(organization._id, name.trim(), role);
    } catch (err) {
      console.error('Failed to send org-code join notification:', err);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Get invite info by token or code. Distinguishes personal vs org invite.
 * GET /api/auth/invite-info?token=TOKEN or ?code=SHORTCODE
 * Response: { type: 'personal' | 'org', name?, email?, mobile?, orgName, role? }
 */
export async function getInviteInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = (req.query.token as string)?.trim();
    const code = (req.query.code as string)?.trim();
    const tokenOrCode = token || code;
    if (!tokenOrCode) {
      res.status(400).json({ status: 'error', message: 'Token or code is required' });
      return;
    }

    const codeUpper = tokenOrCode.toUpperCase();
    const isToken = tokenOrCode.length > 10;

    // Check personal invites first (Invite model by token or shortCode)
    const { resolveInvite } = await import('../services/inviteService');
    const inviteResult = await resolveInvite(isToken ? tokenOrCode : codeUpper);
    if (inviteResult.valid) {
      const { User } = await import('../models/User');
      let name: string | undefined;
      let email: string | undefined;
      let mobile: string | undefined;
      if (inviteResult.invitedUserId) {
        const invitedUser = await User.findById(inviteResult.invitedUserId).select('name email mobile').lean();
        if (invitedUser) {
          name = invitedUser.name;
          email = invitedUser.email;
          mobile = invitedUser.mobile;
        } else {
          email = inviteResult.invitedUserEmail;
        }
      }
      res.status(200).json({
        status: 'success',
        data: {
          type: 'personal',
          name,
          email: email || inviteResult.invitedUserEmail,
          mobile,
          orgName: inviteResult.organizationName,
          role: inviteResult.role,
          token: inviteResult.token,
          invitedUserId: inviteResult.invitedUserId,
          invitedUserEmail: inviteResult.invitedUserEmail,
          codeType: 'invite',
          valid: true,
          teamName: inviteResult.teamName,
          managerName: inviteResult.managerName,
          organizationId: undefined,
        },
      });
      return;
    }

    // Check Organization by inviteCode
    const { Organization } = await import('../models/Organization');
    const org = await Organization.findOne({ inviteCode: codeUpper });
    if (org) {
      res.status(200).json({
        status: 'success',
        data: {
          type: 'org',
          orgName: org.name,
          organizationId: org._id.toString(),
          code: codeUpper,
          codeType: 'org',
          valid: true,
        },
      });
      return;
    }

    // Also check org code (legacy)
    const orgByCode = await Organization.findOne({ code: codeUpper });
    if (orgByCode) {
      res.status(200).json({
        status: 'success',
        data: {
          type: 'org',
          orgName: orgByCode.name,
          organizationId: orgByCode._id.toString(),
          code: codeUpper,
          codeType: 'org',
          valid: true,
        },
      });
      return;
    }

    res.status(404).json({ status: 'error', message: 'Invalid code or token' });
  } catch (error) {
    next(error);
  }
}

/**
 * Accept personal invite (pre-created user sets password).
 * POST /api/auth/accept-invite
 * Body: { token?, code?, password }
 */
export async function acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, code, password } = req.body;
    const tokenOrCode = (token || code)?.trim();
    if (!tokenOrCode) {
      res.status(400).json({ status: 'error', message: 'Token or code is required' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
      return;
    }

    const { Invite } = await import('../models/Invite');
    const { User } = await import('../models/User');
    const bcrypt = await import('bcrypt');

    const isToken = tokenOrCode.length > 10;
    const invite = await Invite.findOne(
      isToken ? { token: tokenOrCode } : { shortCode: tokenOrCode.toUpperCase() }
    );
    if (!invite) {
      res.status(404).json({ status: 'error', message: 'Invite not found' });
      return;
    }
    if (invite.usedAt) {
      res.status(400).json({ status: 'error', message: 'Invite already used' });
      return;
    }
    if (new Date() > invite.expiresAt) {
      res.status(400).json({ status: 'error', message: 'Invite expired' });
      return;
    }
    if (!invite.invitedUserId) {
      res.status(400).json({ status: 'error', message: 'Invalid invite: no linked user' });
      return;
    }

    const user = await User.findById(invite.invitedUserId).select('+password');
    if (!user) {
      res.status(404).json({ status: 'error', message: 'Invited user not found' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    (user as any).password = hashedPassword;
    user.isActive = true;
    user.isMobileVerified = true;
    await user.save();

    invite.usedAt = new Date();
    invite.usedBy = user._id;
    await invite.save();

    res.status(200).json({
      status: 'success',
      message: 'Account activated',
      data: {
        userId: user._id.toString(),
        role: user.role || 'employee',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Join with org-level invite code. Creates user with password.
 * POST /api/auth/join-with-code
 */
export async function joinWithCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, name, email, mobile, designation, department, password, confirmPassword } = req.body;

    if (!code?.trim()) {
      res.status(400).json({ status: 'error', message: 'Code is required' });
      return;
    }
    if (!name?.trim() || !email?.trim() || !mobile?.trim()) {
      res.status(400).json({ status: 'error', message: 'Name, email, and mobile are required' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ status: 'error', message: 'Passwords do not match' });
      return;
    }

    const { Organization } = await import('../models/Organization');
    const { User } = await import('../models/User');
    const bcrypt = await import('bcrypt');

    const codeUpper = (code as string).trim().toUpperCase();
    const org = await Organization.findOne({ $or: [{ inviteCode: codeUpper }, { code: codeUpper }] });
    if (!org) {
      res.status(404).json({ status: 'error', message: 'Invalid invite code' });
      return;
    }

    const normalizedEmail = (email as string).trim().toLowerCase();
    const normalizedMobile = (mobile as string).replace(/\D/g, '').slice(0, 10);
    if (normalizedMobile.length !== 10) {
      res.status(400).json({ status: 'error', message: 'Valid 10-digit mobile is required' });
      return;
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      res.status(400).json({ status: 'error', message: 'A user with this email already exists' });
      return;
    }
    const existingMobile = await User.findOne({ mobile: normalizedMobile });
    if (existingMobile) {
      res.status(400).json({ status: 'error', message: 'A user with this mobile number already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: (name as string).trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      designation: (designation as string)?.trim() || undefined,
      role: 'employee',
      hierarchyLevel: 3,
      organizationId: org._id,
      password: hashedPassword,
      isActive: true,
      isMobileVerified: true,
    });
    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'Account created',
      data: {
        userId: user._id.toString(),
        role: 'employee',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify both OTPs and activate user
 * POST /api/auth/verify-otp
 */
export async function verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = otpVerificationSchema.parse(req.body);

    const user = await verifyUserOTPs(validatedData);

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully. Account activated.',
      data: {
        userId: user._id.toString(),
        email: user.email,
        isMobileVerified: user.isMobileVerified,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify single OTP (for auto-validation)
 * POST /api/auth/verify-otp/email or /api/auth/verify-otp/mobile
 */
export async function verifySingleOTPEndpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { otp } = singleOTPVerificationSchema.parse(req.body);
    const identifier = req.body.mobile;

    if (!identifier) {
      res.status(400).json({
        status: 'error',
        message: 'Mobile is required',
      });
      return;
    }

    // Normalize identifier
    const normalizedIdentifier = identifier.trim().replace(/\D/g, '');
    const type = 'mobile';

    // Check if user is already verified (skip OTP if already verified)
    const { getUserByIdentifier } = await import('../services/authService');
    const user = await getUserByIdentifier(
      undefined,
      normalizedIdentifier
    );

    // Check if this is auto-validation (from onChange) or final submission
    // Auto-validation should not mark as used, final submission should
    const isAutoValidation = req.headers['x-auto-validate'] === 'true';
    const markAsUsed = !isAutoValidation;

    // If user is already verified and this is final submission, allow it
    if (user && markAsUsed) {
      if (user.isMobileVerified) {
        res.status(200).json({
          status: 'success',
          message: 'Already verified',
          data: {
            verified: true,
            userId: user._id.toString(),
          },
        });
        return;
      }
    }

    const isValid = await verifySingleOTP(normalizedIdentifier, type, otp, markAsUsed);

    if (isValid) {
      // Get user info if marking as used (or use already fetched user)
      let userId = null;
      if (markAsUsed) {
        const verifiedUser = user || await getUserByIdentifier(
          undefined,
          normalizedIdentifier
        );
        userId = verifiedUser?._id.toString();
      }

      // Get user role if marking as used
      let userRole = null;
      if (markAsUsed && userId) {
        const { User } = await import('../models/User');
        const verifiedUser = await User.findById(userId);
        userRole = verifiedUser?.role || null;
      }

      res.status(200).json({
        status: 'success',
        message: 'OTP verified successfully',
        data: {
          verified: true,
          userId: userId || undefined,
          role: userRole || undefined,
        },
      });
    } else {
      // Provide more specific error message
      let errorMessage = 'Invalid or expired OTP';
      try {
        const { OTP } = await import('../models/OTP');
        const otpRecord = await OTP.findOne({
          identifier: normalizedIdentifier,
          type,
          isUsed: false,
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
          errorMessage = 'No OTP found. Please request a new OTP.';
        } else if (otpRecord.attempts >= 3) {
          errorMessage = 'Too many failed attempts. Please request a new OTP.';
        } else if (new Date() >= otpRecord.expiresAt) {
          errorMessage = 'OTP has expired. Please request a new OTP.';
        }
      } catch (err) {
        // Use default message if error checking fails
      }

      res.status(400).json({
        status: 'error',
        message: errorMessage,
        data: { verified: false },
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user exists and whether they need to set password
 * GET /api/auth/check-user?identifier=EMAIL_OR_MOBILE
 */
export async function checkUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const identifier = req.query.identifier as string;
    if (!identifier?.trim()) {
      res.status(400).json({ status: 'error', message: 'Identifier is required' });
      return;
    }

    const { User } = await import('../models/User');
    const trimmed = identifier.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const normalizedMobile = trimmed.replace(/\D/g, '');

    let user = null;
    if (isEmail) {
      user = await User.findOne({ email: trimmed.toLowerCase() }).select('+password');
    }
    if (!user && normalizedMobile.length === 10) {
      user = await User.findOne({ mobile: normalizedMobile }).select('+password');
    }

    if (!user) {
      res.status(200).json({ status: 'success', data: { exists: false } });
      return;
    }

    const hasPassword = !!(user as any).password;
    res.status(200).json({
      status: 'success',
      data: {
        exists: true,
        needsPassword: !hasPassword,
        userId: hasPassword ? undefined : user._id.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login with email/mobile and password
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { identifier, password } = req.body;

    if (!identifier?.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Email or mobile is required',
      });
      return;
    }

    if (!password) {
      res.status(400).json({
        status: 'error',
        message: 'Password is required',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    const { User } = await import('../models/User');
    const bcrypt = await import('bcrypt');

    const trimmed = identifier.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const normalizedMobile = trimmed.replace(/\D/g, '');

    let user = null;
    if (isEmail) {
      user = await User.findOne({ email: trimmed.toLowerCase() }).select('+password');
    }
    if (!user && normalizedMobile.length === 10) {
      user = await User.findOne({ mobile: normalizedMobile }).select('+password');
    }

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid email/mobile or password',
      });
      return;
    }

    const hasPassword = !!(user as any).password;
    if (!hasPassword) {
      res.status(401).json({
        status: 'error',
        message: 'Please set your password first. Use the Set Password step.',
      });
      return;
    }

    const match = await bcrypt.compare(password, (user as any).password);
    if (!match) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid email/mobile or password',
      });
      return;
    }

    if (!user.isActive) {
      user.isActive = true;
      await user.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role || 'employee',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resend OTP
 * POST /api/auth/resend-otp/email or /api/auth/resend-otp/mobile
 */
export async function resendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = resendOTPSchema.parse(req.body);
    const identifier = validatedData.mobile;

    if (!identifier) {
      res.status(400).json({
        status: 'error',
        message: 'Mobile is required',
      });
      return;
    }

    const otp = await generateAndSaveOTP(identifier, 'mobile');

    // In production, send OTP via SMS service
    res.status(200).json({
      status: 'success',
      message: 'OTP sent to mobile',
      data: {
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Set password for invited users (no password set yet)
 * POST /api/auth/set-password
 * Body: { userId, password }
 */
export async function setPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, password } = req.body;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'userId is required',
      });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    const bcrypt = await import('bcrypt');
    const { User } = await import('../models/User');
    const user = await User.findById(userId).select('+password');

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    if ((user as any).password) {
      res.status(400).json({
        status: 'error',
        message: 'Password already set. Please log in.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    (user as any).password = hashedPassword;
    user.isActive = true;
    user.isMobileVerified = true;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password set successfully. You can now log in.',
      data: {
        userId: user._id.toString(),
        role: user.role || 'employee',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify email via token
 * GET /api/auth/verify-email?token=TOKEN
 */
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ status: 'error', message: 'Token is required' });
      return;
    }

    const { User } = await import('../models/User');
    const user = await User.findOne({ verifyEmailToken: token }).select('+verifyEmailToken');
    if (!user) {
      res.status(400).json({ status: 'error', message: 'Invalid or expired verification link' });
      return;
    }

    user.isEmailVerified = true;
    (user as any).verifyEmailToken = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
      data: {
        success: true,
        userId: user._id.toString(),
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, email } = req.body;
    if (!userId && !email?.trim()) {
      res.status(400).json({ status: 'error', message: 'userId or email is required' });
      return;
    }

    const { User } = await import('../models/User');
    const user = userId
      ? await User.findById(userId).select('+verifyEmailToken')
      : await User.findOne({ email: (email as string).trim().toLowerCase() }).select('+verifyEmailToken');
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    if (user.isEmailVerified) {
      res.status(200).json({ status: 'success', message: 'Email already verified' });
      return;
    }

    const verifyEmailToken = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(userId, { verifyEmailToken });

    const baseUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const verifyLink = `${baseUrl}/auth/verify-email?token=${verifyEmailToken}`;

    try {
      await sendVerificationEmail({
        to: user.email,
        recipientName: user.name,
        verifyLink,
      });
    } catch (emailErr) {
      console.error('[authController] Failed to resend verification email:', emailErr);
      res.status(500).json({ status: 'error', message: 'Failed to send verification email' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Verification email sent' });
  } catch (error) {
    next(error);
  }
}

/**
 * Test email endpoint (for development - remove in production)
 * GET /api/auth/test-email
 */
export async function testEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await sendInviteEmail({
      to: 'sumedh.m@liberationcoaches.com',
      recipientName: 'Test User',
      orgName: 'Test Org',
      inviterName: 'Admin',
      inviteLink: 'https://google.com',
      shortCode: 'TEST12',
    });
    res.status(200).json({ success: true, message: 'Test email sent' });
  } catch (error) {
    next(error);
  }
}

