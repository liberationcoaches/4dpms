import { Request, Response, NextFunction } from 'express';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { sendInvitationNotification } from './notificationController';
import { generateOrgCode } from '../utils/codeGenerator';
import mongoose from 'mongoose';

/**
 * Create a new organization (Platform Admin only)
 */
export async function createOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, industry, size, bossEmail } = req.body;

    // Validation
    if (!name || !industry || !size) {
      res.status(400).json({
        status: 'error',
        message: 'Name, industry, and size are required',
      });
      return;
    }

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ name: name.trim() });
    if (existingOrg) {
      res.status(400).json({
        status: 'error',
        message: 'Organization with this name already exists',
      });
      return;
    }

    // Generate unique organization code
    const orgCode = await generateOrgCode();

    // Create organization (bossId will be set below)
    const organization = new Organization({
      name: name.trim(),
      code: orgCode,
      type: industry,
      employeeSize: size.toString(),
      bossId: null as any, // Will be set if bossEmail is provided or placeholder created
    });

    // If boss email is provided, find or create boss
    if (bossEmail) {
      let boss = await User.findOne({ email: bossEmail.toLowerCase().trim() });
      if (!boss) {
        // Generate a unique placeholder mobile number
        // Use timestamp + random to ensure uniqueness
        let placeholderMobile = '';
        let exists = true;
        while (exists) {
          // Generate a 10-digit number: 9 + timestamp last 8 digits + random 1 digit
          const timestamp = Date.now().toString().slice(-8);
          const random = Math.floor(Math.random() * 10);
          placeholderMobile = `9${timestamp}${random}`;
          const existingUser = await User.findOne({ mobile: placeholderMobile });
          exists = !!existingUser;
        }

        // Create a placeholder boss user
        boss = new User({
          name: 'Pending Boss Name', // Will be updated during first login/set-password
          email: bossEmail.toLowerCase().trim(),
          mobile: placeholderMobile, // Unique placeholder, will be updated when boss signs up
          role: 'boss',
          hierarchyLevel: 1,
          organizationId: organization._id,
          isMobileVerified: false,
          isActive: false, // Inactive until password is set
        });
        await boss.save();
        // Send invitation notification
        await sendInvitationNotification(boss, 'Platform Admin');
      } else {
        organization.bossId = boss._id;
        // Update boss user if they already exist
        boss.role = 'boss';
        boss.hierarchyLevel = 1;
        boss.organizationId = organization._id;
        await boss.save();
      }
      organization.bossId = boss._id;
    }

    // If no boss email provided, we still need to set a placeholder bossId
    // But the model requires bossId, so we need to handle this
    // For now, if no bossEmail, we'll create a temporary placeholder
    if (!bossEmail) {
      // Create a temporary placeholder boss user if none provided
      let placeholderMobile = '';
      let exists = true;
      while (exists) {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 10);
        placeholderMobile = `9${timestamp}${random}`;
        const existingUser = await User.findOne({ mobile: placeholderMobile });
        exists = !!existingUser;
      }
      
      const placeholderBoss = new User({
        name: 'Pending Boss Assignment',
        email: `placeholder-${Date.now()}@temp.org`,
        mobile: placeholderMobile,
        role: 'boss',
        hierarchyLevel: 1,
        organizationId: organization._id,
        isEmailVerified: false,
        isMobileVerified: false,
        isActive: false,
      });
      await placeholderBoss.save();
      organization.bossId = placeholderBoss._id;
    }

    await organization.save();

    res.status(201).json({
      status: 'success',
      message: 'Organization created successfully',
      data: {
        ...organization.toObject(),
        orgCode: organization.code, // Include org code in response
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all organizations (Platform Admin only)
 */
export async function getAllOrganizations(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const organizations = await Organization.find()
      .populate('reviewerId', 'name email')
      .populate('bossId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid organization ID',
      });
      return;
    }

    const organization = await Organization.findById(id)
      .populate('reviewerId', 'name email mobile')
      .populate('bossId', 'name email mobile')
      .populate('managers', 'name email');

    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found',
      });
      return;
    }

    // Get client admin for this organization
    const clientAdmin = await User.findOne({
      organizationId: organization._id,
      role: 'client_admin',
    }).select('name email mobile');

    const orgData = organization.toObject();
    if (clientAdmin) {
      (orgData as any).clientAdminId = {
        _id: clientAdmin._id,
        name: clientAdmin.name,
        email: clientAdmin.email,
        mobile: clientAdmin.mobile,
      };
    }

    res.status(200).json({
      status: 'success',
      data: orgData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update organization
 */
export async function updateOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, industry, size, reviewerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid organization ID',
      });
      return;
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found',
      });
      return;
    }

    // Update fields (only update fields that exist in the model)
    if (name) organization.name = name.trim();
    if (industry) organization.type = industry;
    if (size) organization.employeeSize = size.toString();
    if (reviewerId === null || reviewerId === undefined) {
      organization.reviewerId = undefined;
    }

    await organization.save();

    res.status(200).json({
      status: 'success',
      message: 'Organization updated successfully',
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Assign reviewer to organization
 */
export async function assignReviewer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { reviewerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid organization ID',
      });
      return;
    }

    if (!reviewerId || !mongoose.Types.ObjectId.isValid(reviewerId)) {
      res.status(400).json({
        status: 'error',
        message: 'Valid reviewer ID is required',
      });
      return;
    }

    // Check if reviewer exists and has reviewer role
    const reviewer = await User.findById(reviewerId);
    if (!reviewer) {
      res.status(404).json({
        status: 'error',
        message: 'Reviewer not found',
      });
      return;
    }

    if (reviewer.role !== 'reviewer') {
      res.status(400).json({
        status: 'error',
        message: 'User is not a reviewer',
      });
      return;
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found',
      });
      return;
    }

    // Assign reviewer
    organization.reviewerId = reviewer._id;
    await organization.save();

    // Send notification to reviewer
    try {
      const { Notification } = await import('../models/Notification');
      const notification = new Notification({
        userId: reviewer._id,
        type: 'system',
        title: 'Assigned to Organization',
        message: `You have been assigned as a reviewer for ${organization.name}. You can now review employees in this organization.`,
        isRead: false,
        metadata: {
          type: 'reviewer_assignment',
          organizationId: organization._id.toString(),
          organizationName: organization.name,
        },
      });
      await notification.save();
    } catch (notificationError) {
      console.error('Failed to send notification to reviewer:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Reviewer assigned successfully',
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a client admin for an organization (Platform Admin only)
 */
export async function createClientAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, mobile, organizationId } = req.body;

    // Validation
    if (!name || !email || !mobile || !organizationId) {
      res.status(400).json({
        status: 'error',
        message: 'Name, email, mobile, and organization ID are required',
      });
      return;
    }

    // Validate organization exists
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid organization ID',
      });
      return;
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { mobile: mobile.trim() },
      ],
    });

    if (existingUser) {
      res.status(400).json({
        status: 'error',
        message: 'User with this email or mobile already exists',
      });
      return;
    }

    // Check if organization already has a client admin
    const existingClientAdmin = await User.findOne({
      organizationId: organization._id,
      role: 'client_admin',
    });

    if (existingClientAdmin) {
      res.status(400).json({
        status: 'error',
        message: 'This organization already has a client admin',
      });
      return;
    }

    // Create client admin user
    const clientAdmin = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      role: 'client_admin',
      hierarchyLevel: 0.5,
      organizationId: organization._id,
      isMobileVerified: false,
      isActive: true,
    });

    await clientAdmin.save();

    // Send invitation notification
    await sendInvitationNotification(clientAdmin, 'Platform Admin');

    res.status(201).json({
      status: 'success',
      message: 'Client admin created successfully. They can now set their password via the invitation flow.',
      data: {
        _id: clientAdmin._id,
        name: clientAdmin.name,
        email: clientAdmin.email,
        mobile: clientAdmin.mobile,
        role: clientAdmin.role,
        organizationId: clientAdmin.organizationId,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all client admins (Platform Admin only)
 */
export async function getClientAdmins(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdmins = await User.find({ role: 'client_admin' })
      .populate('organizationId', 'name code')
      .select('name email mobile organizationId createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: clientAdmins,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get platform admin analytics
 */
export async function getAdminAnalytics(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const totalOrganizations = await Organization.countDocuments();
    const activeOrganizations = await Organization.countDocuments({ subscriptionStatus: 'active' });
    const trialOrganizations = await Organization.countDocuments({ subscriptionStatus: 'trial' });
    const expiredOrganizations = await Organization.countDocuments({ subscriptionStatus: 'expired' });
    
    const organizationsWithReviewers = await Organization.countDocuments({
      reviewerId: { $exists: true, $ne: null },
    });

    const totalReviewers = await User.countDocuments({ role: 'reviewer' });
    const totalClientAdmins = await User.countDocuments({ role: 'client_admin' });
    const totalBosses = await User.countDocuments({ role: 'boss' });
    const totalManagers = await User.countDocuments({ role: 'manager' });
    const totalEmployees = await User.countDocuments({ role: 'employee' });

    res.status(200).json({
      status: 'success',
      data: {
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          trial: trialOrganizations,
          expired: expiredOrganizations,
          withReviewers: organizationsWithReviewers,
        },
        users: {
          reviewers: totalReviewers,
          clientAdmins: totalClientAdmins,
          bosses: totalBosses,
          managers: totalManagers,
          employees: totalEmployees,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

