import { Request, Response, NextFunction } from 'express';
import { createUser, generateAndSaveOTP, verifyUserOTPs, verifySingleOTP } from '../services/authService';
import { createUserFromInvite } from '../services/inviteService';
import {
  signUpSchema,
  signupWithInviteSchema,
  otpVerificationSchema,
  singleOTPVerificationSchema,
  resendOTPSchema,
} from '../utils/validation';

/**
 * Sign up new user
 * POST /api/auth/signup
 */
export async function signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = signUpSchema.parse(req.body);

    const { user, orgCode, teamCode } = await createUser(validatedData);

    // Generate OTP for mobile only
    const mobileOTP = await generateAndSaveOTP(user.mobile, 'mobile');

    // In production, send OTP via SMS service
    // For now, return in response (remove in production)
    res.status(201).json({
      status: 'success',
      message: 'User created successfully. OTP sent to mobile.',
      data: {
        userId: user._id.toString(),
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        orgCode: orgCode || undefined,
        teamCode: teamCode || undefined,
        // Remove this in production:
        mobileOTP: process.env.NODE_ENV === 'development' ? mobileOTP : undefined,
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
    const { user, teamCode } = await createUserFromInvite(validatedData);
    const mobileOTP = await generateAndSaveOTP(user.mobile, 'mobile');

    res.status(201).json({
      status: 'success',
      message: 'User created. OTP sent to mobile.',
      data: {
        userId: user._id.toString(),
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        teamCode: teamCode || undefined,
        mobileOTP: process.env.NODE_ENV === 'development' ? mobileOTP : undefined,
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
 * Login with mobile and access code
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile, accessCode } = req.body;

    if (!mobile) {
      res.status(400).json({
        status: 'error',
        message: 'Mobile is required',
      });
      return;
    }

    // Normalize mobile
    const normalizedMobile = mobile.trim().replace(/\D/g, '');

    if (!/^[0-9]{10}$/.test(normalizedMobile)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid mobile number format',
      });
      return;
    }

    // Access code is optional for platform_admin, or if user doesn't have one set yet
    if (!accessCode) {
      const { User } = await import('../models/User');
      const user = await User.findOne({ mobile: normalizedMobile }).select('+accessCode');

      if (!user) {
        res.status(404).json({
          status: 'error',
          message: 'User not found. Please sign up first.',
        });
        return;
      }

      if (user.role === 'platform_admin') {
        // Platform admin can login without access code
        // Activate on first login
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
            role: user.role || 'platform_admin',
          },
        });
        return;
      } else if (!user.accessCode) {
        // User exists but doesn't have access code - redirect to setup
        res.status(200).json({
          status: 'success',
          message: 'Access code not set. Please set up your access code.',
          data: {
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role || 'employee',
            needsAccessCode: true,
          },
        });
        return;
      } else {
        // User has access code but didn't provide it
        res.status(400).json({
          status: 'error',
          message: 'Access code is required',
        });
        return;
      }
    }

    // Access code was provided - verify it
    // Find user by mobile
    const { User } = await import('../models/User');
    const user = await User.findOne({ mobile: normalizedMobile }).select('+accessCode');

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found. Please sign up first.',
      });
      return;
    }

    // Platform admin doesn't need access code - skip verification
    if (user.role !== 'platform_admin') {
      if (!user.accessCode) {
        // User exists but doesn't have access code - redirect to setup
        res.status(200).json({
          status: 'success',
          message: 'Access code not set. Please set up your access code.',
          data: {
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role || 'employee',
            needsAccessCode: true,
          },
        });
        return;
      }

      // Verify access code (hash the input and compare)
      const crypto = await import('crypto');
      const hashedInput = crypto.createHash('sha256').update(accessCode).digest('hex');

      if (hashedInput !== user.accessCode) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid access code',
        });
        return;
      }
    }

    // Activate user on first successful login (Pending -> Active)
    if (!user.isActive) {
      user.isActive = true;
      await user.save();
    }

    // Login successful
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
 * Set initial access code / password for invited users
 * POST /api/auth/set-password
 */
export async function setPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile, accessCode, otp, name } = req.body;

    if (!mobile || !accessCode || !otp) {
      res.status(400).json({
        status: 'error',
        message: 'Mobile, access code, and OTP are required',
      });
      return;
    }

    // Verify OTP first
    const { verifySingleOTP } = await import('../services/authService');
    const normalizedMobile = mobile.trim().replace(/\D/g, '');
    const isValid = await verifySingleOTP(normalizedMobile, 'mobile', otp, true);

    if (!isValid) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP',
      });
      return;
    }

    // Find user
    const { User } = await import('../models/User');
    const user = await User.findOne({
      mobile: normalizedMobile
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found with provided mobile number',
      });
      return;
    }

    // Hash access code
    const crypto = await import('crypto');
    const hashedAccessCode = crypto.createHash('sha256').update(accessCode).digest('hex');

    // Update user
    user.accessCode = hashedAccessCode;
    if (name) {
      user.name = name.trim();
    } else if (user.name === 'Pending Boss Name') {
      res.status(400).json({
        status: 'error',
        message: 'Name is required to complete registration',
      });
      return;
    }
    user.isMobileVerified = true;
    user.isActive = true;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password set successfully. You can now login.',
      data: {
        userId: user._id.toString(),
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

