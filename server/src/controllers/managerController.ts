import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { sendInvitationNotification, sendKRANotification, sendNewMemberNotificationToCSA, sendNewMemberNotificationToSupervisor } from './notificationController';
import { IFunctionalKRA } from '../models/Team';
import { updateFunctionalKRAAverageScore, validateFunctionalKRA } from '../utils/kraCalculations';
import { calculateMemberScores, DEFAULT_DIMENSION_WEIGHTS } from '../utils/calculations';
import { z } from 'zod';

const kpiSchema = z.object({
  kpi: z.string().min(1),
  target: z.string().optional(),
});

const proofSchema = z.object({
  type: z.enum(['drive_link', 'file_upload']),
  value: z.string().min(1),
  fileName: z.string().optional(),
  uploadedAt: z.string().optional(),
});

const functionalKRASchema = z.object({
  kra: z.string().min(1),
  kpis: z.array(kpiSchema).min(1, 'At least one KPI is required'),
  reportsGenerated: z.array(proofSchema).optional(),
  pilotWeight: z.number().int().min(10).max(100).multipleOf(10).optional(),
  pilotScore: z.number().min(0).max(5).optional(),
  pilotActualPerf: z.string().optional(),
  r1Weight: z.number().int().min(10).max(100).multipleOf(10).optional(),
  r1Score: z.number().min(0).max(5).optional(),
  r1ActualPerf: z.string().optional(),
  r2Weight: z.number().int().min(10).max(100).multipleOf(10).optional(),
  r2Score: z.number().min(0).max(5).optional(),
  r2ActualPerf: z.string().optional(),
  r3Weight: z.number().int().min(10).max(100).multipleOf(10).optional(),
  r3Score: z.number().min(0).max(5).optional(),
  r3ActualPerf: z.string().optional(),
  r4Weight: z.number().int().min(10).max(100).multipleOf(10).optional(),
  r4Score: z.number().min(0).max(5).optional(),
  r4ActualPerf: z.string().optional(),
});

/**
 * Create an employee account (Manager only)
 */
export async function createEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, mobile, designation } = req.body;
    const managerId = req.query.userId as string;

    if (!managerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can create Members',
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

    // Create employee user
    const employee = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      role: 'employee',
      hierarchyLevel: 3,
      organizationId: manager.organizationId,
      reportsTo: manager._id, // Employee reports directly to their manager
      reviewerId: manager.reviewerId, // Inherit reviewer from organization
      isMobileVerified: false,
      isActive: false, // Users start as Pending, activated on first login
      createdBy: manager._id, // Track who created this user
    });

    await employee.save();

    // Find or create manager's team
    let team;
    if (manager.teamId) {
      team = await Team.findById(manager.teamId);
    } else {
      // Create a new team for the manager if it doesn't exist
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

    if (team) {
      // Add employee to team's members array if not already there
      if (!team.members.includes(employee._id)) {
        team.members.push(employee._id);
      }

      // Initialize membersDetails if it doesn't exist
      team.membersDetails = team.membersDetails || [];

      // Check if employee already exists in membersDetails (by mobile)
      const existingMemberIndex = team.membersDetails.findIndex(
        (m: any) => m.mobile === employee.mobile
      );

      if (existingMemberIndex === -1) {
        // Add employee to membersDetails
        team.membersDetails.push({
          name: employee.name,
          role: designation || 'Employee',
          mobile: employee.mobile,
          functionalKRAs: [],
          organizationalKRAs: [],
          selfDevelopmentKRAs: [],
          developingOthersKRAs: [],
        });
        await team.save();
      }

      // Update employee's teamId
      employee.teamId = team._id;
      await employee.save();
    }

    // Send invitation notification
    await sendInvitationNotification(employee, manager.name);
    if (manager.organizationId) {
      await sendNewMemberNotificationToCSA(manager.organizationId, employee.name, 'employee');
    }
    await sendNewMemberNotificationToSupervisor(manager._id, employee.name);

    res.status(201).json({
      status: 'success',
      message: 'Employee created successfully. They can now set their password via the invitation flow.',
      data: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        mobile: employee.mobile,
        role: employee.role,
        designation: designation || 'Employee',
        reportsTo: manager._id,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all employees under a manager
 */
export async function getEmployees(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const managerId = req.query.userId as string;

    if (!managerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can view Members',
      });
      return;
    }

    // Get all direct reports (employees) under this manager
    const employees = await User.find({
      reportsTo: manager._id,
      role: 'employee',
    }).select('name email mobile role createdAt');

    res.status(200).json({
      status: 'success',
      data: employees,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get team performance summary (Manager view)
 * Uses proper dimension weights from organization for score calculation
 */
export async function getTeamPerformance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const managerId = req.query.userId as string;

    if (!managerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can view team performance',
      });
      return;
    }

    // Get organization dimension weights
    let dimensionWeights = DEFAULT_DIMENSION_WEIGHTS;
    if (manager.organizationId) {
      const organization = await Organization.findById(manager.organizationId);
      if (organization?.dimensionWeights) {
        dimensionWeights = organization.dimensionWeights;
      }
    }

    // Get all direct reports (employees) under this manager
    const employees = await User.find({
      reportsTo: manager._id,
      role: 'employee',
    }).select('name email mobile role');

    // Get team data for performance scores
    const team = await Team.findOne({
      members: { $in: employees.map((e) => e._id) },
    });

    // Calculate performance metrics using proper dimension weights
    const employeeScores: Array<{
      _id: string;
      name: string;
      score: number;  // 4D Index
      dimensions: {
        functional: number;
        organizational: number;
        selfDevelopment: number;
        developingOthers: number;
      };
    }> = [];
    let totalScore = 0;
    let scoreCount = 0;

    for (const emp of employees) {
      const memberDetails = team?.membersDetails.find(
        (m) => m.mobile === emp.mobile
      );

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
          employeeScores.push({
            _id: emp._id.toString(),
            name: emp.name,
            score: scores.fourDIndex,
            dimensions: {
              functional: scores.functional,
              organizational: scores.organizational,
              selfDevelopment: scores.selfDevelopment,
              developingOthers: scores.developingOthers,
            },
          });
          totalScore += scores.fourDIndex;
          scoreCount++;
        }
      }
    }

    const averageScore = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) / 100 : 0;

    // Sort by score (4D Index)
    const sortedScores = [...employeeScores].sort((a, b) => b.score - a.score);
    const topPerformers = sortedScores.slice(0, 3).map(s => ({
      _id: s._id,
      name: s.name,
      score: s.score,
    }));
    const needsImprovement = sortedScores.slice(-3).reverse().map(s => ({
      _id: s._id,
      name: s.name,
      score: s.score,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        teamSize: employees.length,
        dimensionWeights, // So manager knows how scores are weighted
        employees: employees.map((emp) => {
          const empScore = employeeScores.find((s) => s._id === emp._id.toString());
          return {
            _id: emp._id,
            name: emp.name,
            email: emp.email,
            mobile: emp.mobile,
            score: empScore?.score || 0,
            dimensions: empScore?.dimensions || {
              functional: 0,
              organizational: 0,
              selfDevelopment: 0,
              developingOthers: 0,
            },
          };
        }),
        performanceMetrics: {
          averageScore,
          topPerformers,
          needsImprovement,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add Functional KRA to an employee (Manager only)
 */
export async function addEmployeeFunctionalKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const managerId = req.query.userId as string;
    const employeeId = req.params.employeeId;

    if (!managerId || !employeeId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Employee ID are required',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can add KRAs for Members',
      });
      return;
    }

    // Validate employee reports to this manager
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee' || employee.reportsTo?.toString() !== manager._id.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Employee not found or does not belong to you',
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

    // Ensure default values
    if (!validatedKRA.pilotWeight) {
      validatedKRA.pilotWeight = 10;
    }
    if (validatedKRA.pilotScore === undefined) {
      validatedKRA.pilotScore = 0;
    }

    const validation = validateFunctionalKRA(validatedKRA);

    if (!validation.valid) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid KRA data',
        errors: validation.errors,
      });
      return;
    }

    // Get manager's team
    let team = await Team.findById(manager.teamId);
    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'Team not found',
      });
      return;
    }

    // Find employee in membersDetails or create entry
    let memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === employee.mobile
    );

    if (memberIndex === -1) {
      team.membersDetails.push({
        name: employee.name,
        role: 'Employee',
        mobile: employee.mobile,
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

    // Send notification to employee
    await sendKRANotification(employee._id, 'functional', manager.name);

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
 * Get employee KRAs (Manager only)
 */
export async function getEmployeeKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const managerId = req.query.userId as string;
    const employeeId = req.params.employeeId;

    if (!managerId || !employeeId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Employee ID are required',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can view Member KRAs',
      });
      return;
    }

    // Validate employee reports to this manager
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee' || employee.reportsTo?.toString() !== manager._id.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Employee not found or does not belong to you',
      });
      return;
    }

    // Get team data
    const team = await Team.findById(manager.teamId);
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
      (m: any) => m.mobile === employee.mobile
    );

    res.status(200).json({
      status: 'success',
      data: {
        functionalKRAs: memberDetails?.functionalKRAs || [],
        organizationalKRAs: memberDetails?.organizationalKRAs || [],
        selfDevelopmentKRAs: memberDetails?.selfDevelopmentKRAs || [],
        developingOthersKRAs: memberDetails?.developingOthersKRAs || [],
        krasFinalized: memberDetails?.krasFinalized || false,
        krasReadyForReview: memberDetails?.krasReadyForReview || false,
        krasFinalizedAt: memberDetails?.krasFinalizedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get manager's own KRAs
 * GET /api/manager/my-kras
 */
export async function getMyKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const managerId = req.query.userId as string;

    if (!managerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can view their own KRAs',
      });
      return;
    }

    // Get team data
    const team = await Team.findById(manager.teamId);
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
 * Finalize employee KRAs (Manager only)
 * Locks all KRAs so the employee can no longer edit them
 */
export async function finalizeEmployeeKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const managerId = req.query.userId as string;
    const employeeId = req.params.employeeId;

    if (!managerId || !employeeId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Employee ID are required',
      });
      return;
    }

    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can finalize Member KRAs',
      });
      return;
    }

    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee' || employee.reportsTo?.toString() !== manager._id.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Employee not found or does not belong to you',
      });
      return;
    }

    const team = await Team.findById(manager.teamId);
    if (!team) {
      res.status(404).json({ status: 'error', message: 'Team not found' });
      return;
    }

    const memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === employee.mobile
    );
    if (memberIndex === -1) {
      res.status(404).json({ status: 'error', message: 'Employee not found in team' });
      return;
    }

    if (team.membersDetails[memberIndex].krasFinalized) {
      res.status(400).json({
        status: 'error',
        message: 'KRAs are already finalized for this employee',
      });
      return;
    }

    // Set top-level finalization
    team.membersDetails[memberIndex].krasFinalized = true;
    team.membersDetails[memberIndex].krasFinalizedAt = new Date();
    team.membersDetails[memberIndex].krasFinalizedBy = manager._id as any;
    team.membersDetails[memberIndex].krasReadyForReview = false;

    // Lock all individual KRAs across all dimensions
    const member = team.membersDetails[memberIndex];
    member.functionalKRAs?.forEach(kra => {
      kra.isScoreLocked = true;
      kra.scoreLockedAt = new Date();
      kra.scoreLockedBy = manager._id as any;
    });
    member.organizationalKRAs?.forEach(kra => {
      kra.isScoreLocked = true;
      kra.scoreLockedAt = new Date();
      kra.scoreLockedBy = manager._id as any;
    });
    member.selfDevelopmentKRAs?.forEach(kra => {
      kra.isScoreLocked = true;
      kra.scoreLockedAt = new Date();
      kra.scoreLockedBy = manager._id as any;
    });
    member.developingOthersKRAs?.forEach(kra => {
      kra.isScoreLocked = true;
      kra.scoreLockedAt = new Date();
      kra.scoreLockedBy = manager._id as any;
    });

    await team.save();

    // Notify the employee
    try {
      const { Notification } = await import('../models/Notification');
      const notification = new Notification({
        userId: employee._id,
        type: 'success',
        title: 'KRAs Finalized',
        message: `Your KRAs have been reviewed and finalized by ${manager.name}. They are now locked.`,
        isRead: false,
        metadata: {
          type: 'kra_finalized',
          managerId: manager._id,
          managerName: manager.name,
          teamId: team._id,
        },
      });
      await notification.save();
    } catch (notifError) {
      console.error('Failed to send finalization notification:', notifError);
    }

    res.status(200).json({
      status: 'success',
      message: `KRAs for ${employee.name} have been finalized successfully.`,
    });
  } catch (error) {
    next(error);
  }
}
