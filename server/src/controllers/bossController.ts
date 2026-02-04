import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { sendInvitationNotification, sendKRANotification, sendNewMemberNotificationToCSA } from './notificationController';
import { IFunctionalKRA, IOrganizationalKRA, ISelfDevelopmentKRA } from '../models/Team';
import { updateFunctionalKRAAverageScore, validateFunctionalKRA } from '../utils/kraCalculations';
import { calculateMemberScores, DEFAULT_DIMENSION_WEIGHTS } from '../utils/calculations';
import { z } from 'zod';

// KPI Schema
const kpiSchema = z.object({
  kpi: z.string().min(1),
  target: z.string().optional(),
});

// Proof/Report Schema
const proofSchema = z.object({
  type: z.enum(['drive_link', 'file_upload']),
  value: z.string().min(1),
  fileName: z.string().optional(),
  uploadedAt: z.string().optional(),
});

const functionalKRASchema = z.object({
  kra: z.string().min(1),
  kpis: z.array(kpiSchema).min(1, 'At least one KPI is required').optional(),
  reportsGenerated: z.array(proofSchema).optional(),
  pilotWeight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
  pilotScore: z.number().min(0).max(5).optional(),
  pilotActualPerf: z.string().optional(),
  r1Weight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
  r1Score: z.number().min(0).max(5).optional(),
  r1ActualPerf: z.string().optional(),
  r1ReviewedBy: z.string().optional(),
  r2Weight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
  r2Score: z.number().min(0).max(5).optional(),
  r2ActualPerf: z.string().optional(),
  r2ReviewedBy: z.string().optional(),
  r3Weight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
  r3Score: z.number().min(0).max(5).optional(),
  r3ActualPerf: z.string().optional(),
  r3ReviewedBy: z.string().optional(),
  r4Weight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
  r4Score: z.number().min(0).max(5).optional(),
  r4ActualPerf: z.string().optional(),
  r4ReviewedBy: z.string().optional(),
  // Legacy fields for backward compatibility
  kpiTarget: z.string().optional(),
});

const organizationalKRASchema = z.object({
  coreValues: z.string().min(1),
  pilotCriticalIncident: z.string().optional(),
  r1Score: z.number().optional(),
  r1CriticalIncident: z.string().optional(),
  r2Score: z.number().optional(),
  r2CriticalIncident: z.string().optional(),
  r3Score: z.number().optional(),
  r3CriticalIncident: z.string().optional(),
  r4Score: z.number().optional(),
  r4CriticalIncident: z.string().optional(),
});

const selfDevelopmentKRASchema = z.object({
  areaOfConcern: z.string().min(1),
  actionPlanInitiative: z.string().optional(),
  pilotScore: z.number().optional(),
  pilotReason: z.string().optional(),
  r1Score: z.number().optional(),
  r1Reason: z.string().optional(),
  r2Score: z.number().optional(),
  r2Reason: z.string().optional(),
  r3Score: z.number().optional(),
  r3Reason: z.string().optional(),
  r4Score: z.number().optional(),
  r4Reason: z.string().optional(),
});

/**
 * Create a manager account (Boss only)
 */
export async function createManager(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, mobile, designation } = req.body;
    const bossId = req.query.userId as string;

    if (!bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss') {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins can create Supervisors',
      });
      return;
    }

    // Validation
    if (!name || !email || !mobile) {
      res.status(400).json({
        status: 'error',
        message: 'Name, email, and mobile are required',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile: mobile.trim() }],
    });

    if (existingUser) {
      res.status(400).json({
        status: 'error',
        message: 'User with this email or mobile already exists',
      });
      return;
    }

    // Create manager user
    const manager = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      role: 'manager',
      hierarchyLevel: 2,
      organizationId: boss.organizationId,
      bossId: boss._id,
      isMobileVerified: false,
      isActive: true,
    });

    await manager.save();

    // Send invitation notification
    await sendInvitationNotification(manager, boss.name);
    if (boss.organizationId) {
      await sendNewMemberNotificationToCSA(boss.organizationId, manager.name, 'manager');
    }

    res.status(201).json({
      status: 'success',
      message: 'Manager created successfully. They can now set their password via the invitation flow.',
      data: {
        _id: manager._id,
        name: manager.name,
        email: manager.email,
        mobile: manager.mobile,
        role: manager.role,
        designation: designation || 'Manager',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all managers under a boss
 */
export async function getManagers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bossId = req.query.userId as string;

    if (!bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss') {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins can view Supervisors',
      });
      return;
    }

    // Get all managers under this boss
    const managers = await User.find({
      bossId: boss._id,
      role: 'manager',
    }).select('name email mobile role createdAt');

    res.status(200).json({
      status: 'success',
      data: managers,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get boss organization details
 */
export async function getBossOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bossId = req.query.userId as string;

    if (!bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId).populate('organizationId');
    if (!boss || boss.role !== 'boss') {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins can access this',
      });
      return;
    }

    if (!boss.organizationId) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found',
      });
      return;
    }

    const organization = await Organization.findById(boss.organizationId)
      .populate('reviewerId', 'name email')
      .populate('bossId', 'name email');

    res.status(200).json({
      status: 'success',
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get boss analytics (all managers and their teams)
 * Uses proper dimension weights from organization for score calculation
 */
export async function getBossAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bossId = req.query.userId as string;

    if (!bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss') {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins can access analytics',
      });
      return;
    }

    // Get organization dimension weights
    let dimensionWeights = DEFAULT_DIMENSION_WEIGHTS;
    if (boss.organizationId) {
      const organization = await Organization.findById(boss.organizationId);
      if (organization?.dimensionWeights) {
        dimensionWeights = organization.dimensionWeights;
      }
    }

    // Get all managers
    const managers = await User.find({
      bossId: boss._id,
      role: 'manager',
    });

    // Get all employees under these managers
    const managerIds = managers.map((m) => m._id);
    const employees = await User.find({
      managerId: { $in: managerIds },
      role: 'employee',
    });

    // Get all teams that have these employees
    const teams = await Team.find({
      $or: [
        { members: { $in: employees.map((e) => e._id) } },
        { 'membersDetails.mobile': { $in: employees.map((e) => e.mobile) } },
      ],
    });

    // Calculate department-wise performance using proper dimension weights
    const departmentStats = await Promise.all(
      managers.map(async (manager) => {
        const deptEmployees = await User.find({
          managerId: manager._id,
          role: 'employee',
        });

        let deptTotalScore = 0;
        let deptScoreCount = 0;

        for (const emp of deptEmployees) {
          // Find member details across all teams
          let memberDetails = null;
          for (const team of teams) {
            memberDetails = team.membersDetails.find(
              (m) => m.mobile === emp.mobile
            );
            if (memberDetails) break;
          }

          if (memberDetails) {
            // Calculate 4D Index using proper dimension weights
            const scores = calculateMemberScores(
              {
                functionalKRAs: memberDetails.functionalKRAs,
                organizationalKRAs: memberDetails.organizationalKRAs,
                selfDevelopmentKRAs: memberDetails.selfDevelopmentKRAs,
                developingOthersKRAs: memberDetails.developingOthersKRAs,
              },
              dimensionWeights,
              'average',
              true // Include pilot
            );

            if (scores.fourDIndex > 0) {
              deptTotalScore += scores.fourDIndex;
              deptScoreCount++;
            }
          }
        }

        const avgDeptScore = deptScoreCount > 0 
          ? Math.round((deptTotalScore / deptScoreCount) * 100) / 100 
          : 0;

        return {
          managerId: manager._id.toString(),
          managerName: manager.name,
          employeeCount: deptEmployees.length,
          averageScore: avgDeptScore, // Now this is the proper 4D Index
        };
      })
    );

    // Calculate org-wide average (weighted by employee count)
    let totalWeightedScore = 0;
    let totalEmployeesWithScores = 0;
    departmentStats.forEach((dept) => {
      if (dept.averageScore > 0) {
        totalWeightedScore += dept.averageScore * dept.employeeCount;
        totalEmployeesWithScores += dept.employeeCount;
      }
    });
    
    const orgAverageScore = totalEmployeesWithScores > 0
      ? Math.round((totalWeightedScore / totalEmployeesWithScores) * 100) / 100
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        managers: {
          total: managers.length,
          list: managers.map((m) => ({
            _id: m._id,
            name: m.name,
            email: m.email,
          })),
        },
        employees: {
          total: employees.length,
        },
        departments: managers.length,
        departmentStats,
        orgAverageScore,
        dimensionWeights, // Include so boss can see how scores are calculated
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add Functional KRA to a manager (Boss only)
 */
export async function addManagerFunctionalKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bossId = req.query.userId as string;
    const managerId = req.params.managerId;

    if (!bossId || !managerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Manager ID are required',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss') {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins can add KRAs for Supervisors',
      });
      return;
    }

    // Validate manager belongs to this boss
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager' || manager.bossId?.toString() !== boss._id.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Manager not found or does not belong to you',
      });
      return;
    }

    // Parse and validate KRA data
    let validatedKRA: any;
    try {
      validatedKRA = functionalKRASchema.parse(req.body);
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid KRA data',
        errors: error.errors || error.message,
      });
      return;
    }

    // Handle backward compatibility: convert old structure to new
    if (!validatedKRA.kpis || !Array.isArray(validatedKRA.kpis)) {
      // Convert old kpiTarget to new kpis array
      validatedKRA.kpis = validatedKRA.kpiTarget
        ? [{ kpi: validatedKRA.kpiTarget, target: '' }]
        : [{ kpi: '', target: '' }];
    }

    // Handle backward compatibility: convert old reportsGenerated string to array
    if (!validatedKRA.reportsGenerated || !Array.isArray(validatedKRA.reportsGenerated)) {
      if (typeof validatedKRA.reportsGenerated === 'string' && validatedKRA.reportsGenerated.trim()) {
        validatedKRA.reportsGenerated = [{
          type: 'drive_link',
          value: validatedKRA.reportsGenerated,
          uploadedAt: new Date().toISOString(),
        }];
      } else {
        validatedKRA.reportsGenerated = [];
      }
    }

    // Ensure pilotScore is set (default to 0 if not provided)
    if (validatedKRA.pilotScore === undefined) {
      validatedKRA.pilotScore = 0;
    }

    // Ensure pilotWeight is set and is a multiple of 10 (default to 10 if not provided)
    if (validatedKRA.pilotWeight === undefined) {
      validatedKRA.pilotWeight = 10;
    } else {
      // Round to nearest multiple of 10
      validatedKRA.pilotWeight = Math.round(validatedKRA.pilotWeight / 10) * 10;
      validatedKRA.pilotWeight = Math.max(10, Math.min(100, validatedKRA.pilotWeight));
    }

    // Find or create team for manager
    let team = await Team.findOne({ createdBy: manager._id });
    if (!team) {
      const code = `TEAM${Math.random().toString().slice(2, 6).toUpperCase()}`;
      team = new Team({
        name: `${manager.name}'s Team`,
        code,
        createdBy: manager._id,
        members: [manager._id],
        membersDetails: [],
      });
      await team.save();
      manager.teamId = team._id;
      await manager.save();
    }

    // Find manager in membersDetails or create entry
    let memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === manager.mobile
    );

    if (memberIndex === -1) {
      team.membersDetails.push({
        name: manager.name,
        role: 'Manager',
        mobile: manager.mobile,
        functionalKRAs: [],
        organizationalKRAs: [],
        selfDevelopmentKRAs: [],
        developingOthersKRAs: [],
      });
      memberIndex = team.membersDetails.length - 1;
    }

    // Add KRA
    const kraWithAverage = updateFunctionalKRAAverageScore(validatedKRA as IFunctionalKRA);
    if (!team.membersDetails[memberIndex].functionalKRAs) {
      team.membersDetails[memberIndex].functionalKRAs = [];
    }
    team.membersDetails[memberIndex].functionalKRAs!.push(kraWithAverage);

    await team.save();

    // Send notification to manager
    await sendKRANotification(manager._id, 'functional', boss.name);

    res.status(201).json({
      status: 'success',
      message: 'Functional KRA added successfully',
      data: kraWithAverage,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add Organizational KRA to a manager (Boss only)
 */
export async function addManagerOrganizationalKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bossId = req.query.userId as string;
    const managerId = req.params.managerId;

    if (!bossId || !managerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Manager ID are required',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss') {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins can add KRAs for Supervisors',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager' || manager.bossId?.toString() !== boss._id.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Manager not found or does not belong to you',
      });
      return;
    }

    const validatedKRA = organizationalKRASchema.parse(req.body);

    // Find or create team for manager
    let team = await Team.findOne({ createdBy: manager._id });
    if (!team) {
      const code = `TEAM${Math.random().toString().slice(2, 6).toUpperCase()}`;
      team = new Team({
        name: `${manager.name}'s Team`,
        code,
        createdBy: manager._id,
        members: [manager._id],
        membersDetails: [],
      });
      await team.save();
      manager.teamId = team._id;
      await manager.save();
    }

    // Find manager in membersDetails or create entry
    let memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === manager.mobile
    );

    if (memberIndex === -1) {
      team.membersDetails.push({
        name: manager.name,
        role: 'Manager',
        mobile: manager.mobile,
        functionalKRAs: [],
        organizationalKRAs: [],
        selfDevelopmentKRAs: [],
        developingOthersKRAs: [],
      });
      memberIndex = team.membersDetails.length - 1;
    }

    // Add KRA
    if (!team.membersDetails[memberIndex].organizationalKRAs) {
      team.membersDetails[memberIndex].organizationalKRAs = [];
    }
    team.membersDetails[memberIndex].organizationalKRAs!.push(validatedKRA as IOrganizationalKRA);

    await team.save();

    // Send notification to manager
    await sendKRANotification(manager._id, 'organizational', boss.name);

    res.status(201).json({
      status: 'success',
      message: 'Organizational KRA added successfully',
      data: validatedKRA,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add Self Development KRA to a manager (Boss only)
 */
export async function addManagerSelfDevelopmentKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bossId = req.query.userId as string;
    const managerId = req.params.managerId;

    if (!bossId || !managerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Manager ID are required',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss') {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins can add KRAs for Supervisors',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager' || manager.bossId?.toString() !== boss._id.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Manager not found or does not belong to you',
      });
      return;
    }

    const validatedKRA = selfDevelopmentKRASchema.parse(req.body);

    // Find or create team for manager
    let team = await Team.findOne({ createdBy: manager._id });
    if (!team) {
      const code = `TEAM${Math.random().toString().slice(2, 6).toUpperCase()}`;
      team = new Team({
        name: `${manager.name}'s Team`,
        code,
        createdBy: manager._id,
        members: [manager._id],
        membersDetails: [],
      });
      await team.save();
      manager.teamId = team._id;
      await manager.save();
    }

    // Find manager in membersDetails or create entry
    let memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === manager.mobile
    );

    if (memberIndex === -1) {
      team.membersDetails.push({
        name: manager.name,
        role: 'Manager',
        mobile: manager.mobile,
        functionalKRAs: [],
        organizationalKRAs: [],
        selfDevelopmentKRAs: [],
        developingOthersKRAs: [],
      });
      memberIndex = team.membersDetails.length - 1;
    }

    // Add KRA
    if (!team.membersDetails[memberIndex].selfDevelopmentKRAs) {
      team.membersDetails[memberIndex].selfDevelopmentKRAs = [];
    }
    team.membersDetails[memberIndex].selfDevelopmentKRAs!.push(validatedKRA as ISelfDevelopmentKRA);

    await team.save();

    // Send notification to manager
    await sendKRANotification(manager._id, 'self-development', boss.name);

    res.status(201).json({
      status: 'success',
      message: 'Self Development KRA added successfully',
      data: validatedKRA,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get manager KRAs (Boss only)
 */
export async function getManagerKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bossId = req.query.userId as string;
    const managerId = req.params.managerId;

    if (!bossId || !managerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Manager ID are required',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss') {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins can view Supervisor KRAs',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager' || manager.bossId?.toString() !== boss._id.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Manager not found or does not belong to you',
      });
      return;
    }

    // Get team data
    const team = await Team.findOne({ createdBy: manager._id });
    if (!team) {
      res.status(200).json({
        status: 'success',
        data: {
          functionalKRAs: [],
          organizationalKRAs: [],
          selfDevelopmentKRAs: [],
          developingOthersKRAs: [],
        },
      });
      return;
    }

    const memberDetails = team.membersDetails.find(
      (m: any) => m.mobile === manager.mobile
    );

    res.status(200).json({
      status: 'success',
      data: {
        functionalKRAs: memberDetails?.functionalKRAs || [],
        organizationalKRAs: memberDetails?.organizationalKRAs || [],
        selfDevelopmentKRAs: memberDetails?.selfDevelopmentKRAs || [],
        developingOthersKRAs: memberDetails?.developingOthersKRAs || [],
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get boss's own KRAs
 * GET /api/boss/my-kras
 */
export async function getMyKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bossId = req.query.userId as string;

    if (!bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss') {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins can view their own KRAs',
      });
      return;
    }

    // Get team data - try boss.teamId first (team created by/for boss), then fallback to organization team
    let team;
    if (boss.teamId) {
      team = await Team.findById(boss.teamId);
    }
    
    // Fallback to organization team if boss.teamId doesn't exist or team not found
    if (!team) {
      team = await Team.findOne({ organizationId: boss.organizationId });
    }
    
    // If still no team, try finding team by createdBy
    if (!team) {
      team = await Team.findOne({ createdBy: boss._id });
    }

    if (!team) {
      res.status(200).json({
        status: 'success',
        data: {
          functionalKRAs: [],
          organizationalKRAs: [],
          selfDevelopmentKRAs: [],
          developingOthersKRAs: [],
        },
      });
      return;
    }

    const memberDetails = team.membersDetails.find(
      (m: any) => m.mobile === boss.mobile
    );

    res.status(200).json({
      status: 'success',
      data: {
        functionalKRAs: memberDetails?.functionalKRAs || [],
        organizationalKRAs: memberDetails?.organizationalKRAs || [],
        selfDevelopmentKRAs: memberDetails?.selfDevelopmentKRAs || [],
        developingOthersKRAs: memberDetails?.developingOthersKRAs || [],
      },
    });
  } catch (error) {
    next(error);
  }
}

