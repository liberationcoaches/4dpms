import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { z } from 'zod';
import { getPersonalExportData, generatePDFFile } from '../services/exportService';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  mobile: z.string().regex(/^[0-9]{10}$/).trim().optional(),
});

/**
 * Get user profile
 * GET /api/user/profile
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // TODO: Get userId from auth token/session
    // For now, using query param for testing
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const user = await User.findById(userId).select('-accessCode');

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        companyName: user.companyName,
        industry: user.industry,
        role: user.role || 'employee',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user by email (for demo/testing purposes)
 * GET /api/user?email=xxx
 */
export async function getUserByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = req.query.email as string;

    if (!email) {
      res.status(400).json({
        status: 'error',
        message: 'Email is required',
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('-accessCode');

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Fix user roles based on accessCode and team membership
 * POST /api/user/fix-roles
 */
export async function fixUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Team } = await import('../models/Team');
    
    // Get all users with accessCode
    const allUsers = await User.find({}).select('+accessCode');
    
    let managersFixed = 0;
    let employeesFixed = 0;
    let unchanged = 0;
    const changes: string[] = [];

    for (const user of allUsers) {
      const originalRole = user.role;
      let newRole: string | null = null;

      // Migrate old roles to new roles
      if (user.role === 'admin') {
        newRole = 'manager';
      } else if (user.role === 'member') {
        newRole = 'employee';
      }

      // If role needs migration, update it
      if (newRole && user.role !== newRole) {
        user.role = newRole as any;
        await user.save();
        changes.push(`${user.name} (${user.email}) -> ${newRole.toUpperCase()} (migrated from ${originalRole})`);
        if (newRole === 'manager') {
          managersFixed++;
        } else if (newRole === 'employee') {
          employeesFixed++;
        }
      } else {
        unchanged++;
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'User roles migrated successfully',
      data: {
        managersFixed,
        employeesFixed,
        unchanged,
        totalUsers: allUsers.length,
        changes,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all users by role
 * GET /api/user/list
 */
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.query.role as string | undefined;

    let query: any = {};
    if (role && ['platform_admin', 'reviewer', 'boss', 'manager', 'employee'].includes(role)) {
      query.role = role;
    }

    const users = await User.find(query).select('-accessCode').sort({ createdAt: -1 });

    const managers = users.filter(u => u.role === 'manager');
    const employees = users.filter(u => u.role === 'employee');
    const bosses = users.filter(u => u.role === 'boss');
    const reviewers = users.filter(u => u.role === 'reviewer');
    const platformAdmins = users.filter(u => u.role === 'platform_admin');

    const mapUser = (u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      companyName: u.companyName,
      industry: u.industry,
      role: u.role,
      createdAt: u.createdAt,
    });

    res.status(200).json({
      status: 'success',
      data: {
        managers: managers.map(mapUser),
        employees: employees.map(mapUser),
        bosses: bosses.map(mapUser),
        reviewers: reviewers.map(mapUser),
        platformAdmins: platformAdmins.map(mapUser),
        summary: {
          totalManagers: managers.length,
          totalEmployees: employees.length,
          totalBosses: bosses.length,
          totalReviewers: reviewers.length,
          totalPlatformAdmins: platformAdmins.length,
          total: users.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 * PUT /api/user/profile
 */
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // TODO: Get userId from auth token/session
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const validatedData = updateProfileSchema.parse(req.body);

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Check if email/mobile already exists (if changing)
    if (validatedData.email && validatedData.email !== user.email) {
      const existingUser = await User.findOne({ email: validatedData.email });
      if (existingUser) {
        res.status(400).json({
          status: 'error',
          message: 'Email already in use',
        });
        return;
      }
    }

    if (validatedData.mobile && validatedData.mobile !== user.mobile) {
      const existingUser = await User.findOne({ mobile: validatedData.mobile });
      if (existingUser) {
        res.status(400).json({
          status: 'error',
          message: 'Mobile number already in use',
        });
        return;
      }
    }

    // Update fields
    if (validatedData.name) user.name = validatedData.name;
    if (validatedData.email) user.email = validatedData.email;
    if (validatedData.mobile) user.mobile = validatedData.mobile;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download personal performance report as PDF
 * GET /api/user/my-report
 */
export async function downloadPersonalReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Get personal export data
    const exportData = await getPersonalExportData(userId);
    if (!exportData) {
      res.status(404).json({
        status: 'error',
        message: 'No performance data found',
      });
      return;
    }

    // Generate PDF with single user data
    const buffer = await generatePDFFile([exportData]);

    // Set response headers
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `My_Performance_Report_${dateStr}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Send file
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

