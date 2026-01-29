import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { sendInvitationNotification, sendKRANotification } from './notificationController';
import { IFunctionalKRA, IOrganizationalKRA, ISelfDevelopmentKRA } from '../models/Team';
import { updateFunctionalKRAAverageScore, validateFunctionalKRA } from '../utils/kraCalculations';
import { z } from 'zod';
import { getOrganizationExportData, generateExcelFile, generatePDFFile } from '../services/exportService';

const createBossSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  mobile: z.string().regex(/^[0-9]{10}$/),
});

const proofSchema = z.object({
  type: z.enum(['drive_link', 'file_upload']),
  value: z.string().min(1),
  fileName: z.string().optional(),
  uploadedAt: z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    if (val instanceof Date) return val;
    if (typeof val === 'string') return new Date(val);
    return val;
  }, z.date().optional()),
});

const kpiSchema = z.object({
  kpi: z.string().min(1),
  target: z.string().optional(),
});

const functionalKRASchema = z.object({
  kra: z.string().min(1),
  kpis: z.array(kpiSchema).optional(), // New format
  kpiTarget: z.string().optional(), // Legacy format
  reportsGenerated: z.array(proofSchema).optional(),
  pilotWeight: z.number().optional(),
  pilotScore: z.number().optional(),
  pilotActualPerf: z.string().optional(),
  r1Weight: z.number().optional(),
  r1Score: z.number().optional(),
  r2Weight: z.number().optional(),
  r2Score: z.number().optional(),
  r3Weight: z.number().optional(),
  r3Score: z.number().optional(),
  r4Weight: z.number().optional(),
  r4Score: z.number().optional(),
  r1ActualPerf: z.string().optional(),
  r2ActualPerf: z.string().optional(),
  r3ActualPerf: z.string().optional(),
  r4ActualPerf: z.string().optional(),
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
 * Create a boss account (Client Admin only)
 */
export async function createBoss(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const validatedData = createBossSchema.parse(req.body);

    if (!clientAdminId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can create Admins',
      });
      return;
    }

    if (!clientAdmin.organizationId) {
      res.status(400).json({
        status: 'error',
        message: 'Client admin must be associated with an organization',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: validatedData.email.toLowerCase() },
        { mobile: validatedData.mobile.trim() },
      ],
    });

    if (existingUser) {
      res.status(400).json({
        status: 'error',
        message: 'User with this email or mobile already exists',
      });
      return;
    }

    // Create boss user
    const boss = new User({
      name: validatedData.name.trim(),
      email: validatedData.email.toLowerCase().trim(),
      mobile: validatedData.mobile.trim(),
      role: 'boss',
      hierarchyLevel: 1,
      organizationId: clientAdmin.organizationId,
      isMobileVerified: false,
      isActive: true,
    });

    await boss.save();

    // Update organization's bossId if not set
    const organization = await Organization.findById(clientAdmin.organizationId);
    if (organization && !organization.bossId) {
      organization.bossId = boss._id;
      await organization.save();
    }

    // Send invitation notification
    await sendInvitationNotification(boss, clientAdmin.name);

    res.status(201).json({
      status: 'success',
      message: 'Boss created successfully. They can now set their password via the invitation flow.',
      data: {
        _id: boss._id,
        name: boss.name,
        email: boss.email,
        mobile: boss.mobile,
        role: boss.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all bosses in the organization (Client Admin only)
 */
export async function getBosses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;

    if (!clientAdminId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can view Admins',
      });
      return;
    }

    if (!clientAdmin.organizationId) {
      res.status(400).json({
        status: 'error',
        message: 'Client admin must be associated with an organization',
      });
      return;
    }

    // Get all bosses in the organization
    const bosses = await User.find({
      organizationId: clientAdmin.organizationId,
      role: 'boss',
    }).select('name email mobile role createdAt');

    res.status(200).json({
      status: 'success',
      data: bosses,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get organization details (Client Admin only)
 */
export async function getOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;

    if (!clientAdminId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can access this',
      });
      return;
    }

    if (!clientAdmin.organizationId) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found',
      });
      return;
    }

    const organization = await Organization.findById(clientAdmin.organizationId)
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
 * Get all users in organization (Client Admin only)
 */
export async function getOrganizationUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;

    if (!clientAdminId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can view organization users',
      });
      return;
    }

    if (!clientAdmin.organizationId) {
      res.status(400).json({
        status: 'error',
        message: 'Client admin must be associated with an organization',
      });
      return;
    }

    // Get all users in the organization
    const bosses = await User.find({
      organizationId: clientAdmin.organizationId,
      role: 'boss',
    }).select('name email mobile role createdAt');

    const managers = await User.find({
      organizationId: clientAdmin.organizationId,
      role: 'manager',
    }).select('name email mobile role createdAt');

    const employees = await User.find({
      organizationId: clientAdmin.organizationId,
      role: 'employee',
    }).select('name email mobile role createdAt');

    res.status(200).json({
      status: 'success',
      data: {
        bosses,
        managers,
        employees,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add Functional KRA to a boss (Client Admin only)
 */
export async function addBossFunctionalKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const bossId = req.params.bossId;

    if (!clientAdminId || !bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Boss ID are required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can add KRAs for Admins',
      });
      return;
    }

    // Validate boss belongs to same organization
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss' || boss.organizationId?.toString() !== clientAdmin.organizationId?.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Boss not found or does not belong to your organization',
      });
      return;
    }

    const validatedKRA = functionalKRASchema.parse(req.body) as any;
    const validation = validateFunctionalKRA(validatedKRA as Partial<IFunctionalKRA>);

    if (!validation.valid) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid KRA data',
        errors: validation.errors,
      });
      return;
    }

    // Convert old kpiTarget format to new kpis array format
    if (!validatedKRA.kpis || !Array.isArray(validatedKRA.kpis) || validatedKRA.kpis.length === 0) {
      validatedKRA.kpis = validatedKRA.kpiTarget
        ? [{ kpi: validatedKRA.kpiTarget, target: '' }]
        : [{ kpi: 'Default KPI', target: '' }];
    }

    // Find or create team for boss
    let team = await Team.findOne({ createdBy: boss._id });
    if (!team) {
      const code = `TEAM${Math.random().toString().slice(2, 6).toUpperCase()}`;
      team = new Team({
        name: `${boss.name}'s Team`,
        code,
        createdBy: boss._id,
        members: [boss._id],
        membersDetails: [],
      });
      await team.save();
      boss.teamId = team._id;
      await boss.save();
    }

    // Find boss in membersDetails or create entry
    let memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === boss.mobile
    );

    if (memberIndex === -1) {
      team.membersDetails.push({
        name: boss.name,
        role: 'Boss',
        mobile: boss.mobile,
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

    // Send notification to boss
    await sendKRANotification(boss._id, 'functional', clientAdmin.name);

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
 * Add Organizational KRA to a boss (Client Admin only)
 */
export async function addBossOrganizationalKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const bossId = req.params.bossId;

    if (!clientAdminId || !bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Boss ID are required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can add KRAs for Admins',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss' || boss.organizationId?.toString() !== clientAdmin.organizationId?.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Boss not found or does not belong to your organization',
      });
      return;
    }

    const validatedKRA = organizationalKRASchema.parse(req.body);

    // Find or create team for boss
    let team = await Team.findOne({ createdBy: boss._id });
    if (!team) {
      const code = `TEAM${Math.random().toString().slice(2, 6).toUpperCase()}`;
      team = new Team({
        name: `${boss.name}'s Team`,
        code,
        createdBy: boss._id,
        members: [boss._id],
        membersDetails: [],
      });
      await team.save();
      boss.teamId = team._id;
      await boss.save();
    }

    // Find boss in membersDetails or create entry
    let memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === boss.mobile
    );

    if (memberIndex === -1) {
      team.membersDetails.push({
        name: boss.name,
        role: 'Boss',
        mobile: boss.mobile,
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
 * Add Self Development KRA to a boss (Client Admin only)
 */
export async function addBossSelfDevelopmentKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const bossId = req.params.bossId;

    if (!clientAdminId || !bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Boss ID are required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can add KRAs for Admins',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss' || boss.organizationId?.toString() !== clientAdmin.organizationId?.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Boss not found or does not belong to your organization',
      });
      return;
    }

    const validatedKRA = selfDevelopmentKRASchema.parse(req.body);

    // Find or create team for boss
    let team = await Team.findOne({ createdBy: boss._id });
    if (!team) {
      const code = `TEAM${Math.random().toString().slice(2, 6).toUpperCase()}`;
      team = new Team({
        name: `${boss.name}'s Team`,
        code,
        createdBy: boss._id,
        members: [boss._id],
        membersDetails: [],
      });
      await team.save();
      boss.teamId = team._id;
      await boss.save();
    }

    // Find boss in membersDetails or create entry
    let memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === boss.mobile
    );

    if (memberIndex === -1) {
      team.membersDetails.push({
        name: boss.name,
        role: 'Boss',
        mobile: boss.mobile,
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

    // Send notification to boss
    await sendKRANotification(boss._id, 'self-development', clientAdmin.name);

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
 * Get boss KRAs (Client Admin only)
 */
export async function getBossKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const bossId = req.params.bossId;

    if (!clientAdminId || !bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Boss ID are required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can view Admin KRAs',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss' || boss.organizationId?.toString() !== clientAdmin.organizationId?.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Boss not found or does not belong to your organization',
      });
      return;
    }

    // Get team data
    const team = await Team.findOne({ createdBy: boss._id });
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

/**
 * Update Functional KRA for a boss (Client Admin only)
 * PUT /api/client-admin/bosses/:bossId/kras/functional/:kraIndex
 */
export async function updateBossFunctionalKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const bossId = req.params.bossId;
    const kraIndex = parseInt(req.params.kraIndex);

    if (!clientAdminId || !bossId || isNaN(kraIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID, Boss ID, and KRA index are required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can update Admin KRAs',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss' || boss.organizationId?.toString() !== clientAdmin.organizationId?.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Boss not found or does not belong to your organization',
      });
      return;
    }

    // Find boss's team
    let team = await Team.findOne({ createdBy: boss._id });
    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'Boss team not found',
      });
      return;
    }

    // Find boss in membersDetails
    let memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === boss.mobile
    );

    if (memberIndex === -1) {
      res.status(404).json({
        status: 'error',
        message: 'Boss not found in team members',
      });
      return;
    }

    const member = team.membersDetails[memberIndex];
    if (!member.functionalKRAs || kraIndex >= member.functionalKRAs.length) {
      res.status(404).json({
        status: 'error',
        message: 'KRA not found',
      });
      return;
    }

    const existingKRA = member.functionalKRAs[kraIndex] as any;

    // Check if scores are locked
    if (existingKRA.isScoreLocked) {
      res.status(403).json({
        status: 'error',
        message: 'This KRA has been finalized and cannot be modified',
      });
      return;
    }

    // Validate and parse KRA data
    const validatedKRA = functionalKRASchema.partial().parse(req.body);
    const validation = validateFunctionalKRA(validatedKRA as Partial<IFunctionalKRA>);

    if (!validation.valid) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid KRA data',
        errors: validation.errors,
      });
      return;
    }

    // Convert old format to new if needed
    if (!validatedKRA.kpis && validatedKRA.kpiTarget) {
      validatedKRA.kpis = [{ kpi: validatedKRA.kpiTarget, target: '' }];
    }

    // Check if trying to edit KRA details (kra, kpis) - only allowed once
    const isEditingKRADetails = validatedKRA.kra || validatedKRA.kpis;
    if (isEditingKRADetails && (existingKRA.editCount || 0) >= 1) {
      res.status(403).json({
        status: 'error',
        message: 'KRA details can only be edited once. This KRA has already been edited.',
      });
      return;
    }

    // Update KRA
    const updatedKRA = {
      ...existingKRA,
      ...validatedKRA,
      kra: validatedKRA.kra || existingKRA.kra,
      editCount: isEditingKRADetails ? (existingKRA.editCount || 0) + 1 : (existingKRA.editCount || 0),
    };

    const kraWithAverage = updateFunctionalKRAAverageScore(updatedKRA as IFunctionalKRA);
    member.functionalKRAs[kraIndex] = kraWithAverage;

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'KRA updated successfully',
      data: kraWithAverage,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete Functional KRA for a boss (Client Admin only)
 * DELETE /api/client-admin/bosses/:bossId/kras/functional/:kraIndex
 */
export async function deleteBossFunctionalKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const bossId = req.params.bossId;
    const kraIndex = parseInt(req.params.kraIndex);

    if (!clientAdminId || !bossId || isNaN(kraIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID, Boss ID, and KRA index are required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can delete Admin KRAs',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss' || boss.organizationId?.toString() !== clientAdmin.organizationId?.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Boss not found or does not belong to your organization',
      });
      return;
    }

    // Find boss's team
    const team = await Team.findOne({ createdBy: boss._id });
    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'Boss team not found',
      });
      return;
    }

    // Find boss in membersDetails
    const memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === boss.mobile
    );

    if (memberIndex === -1) {
      res.status(404).json({
        status: 'error',
        message: 'Boss not found in team members',
      });
      return;
    }

    const member = team.membersDetails[memberIndex];
    if (!member.functionalKRAs || kraIndex >= member.functionalKRAs.length) {
      res.status(404).json({
        status: 'error',
        message: 'KRA not found',
      });
      return;
    }

    const existingKRA = member.functionalKRAs[kraIndex] as any;

    // Check if KRA is locked
    if (existingKRA.isScoreLocked) {
      res.status(403).json({
        status: 'error',
        message: 'Cannot delete a finalized KRA',
      });
      return;
    }

    member.functionalKRAs.splice(kraIndex, 1);
    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'KRA deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lock/Finalize Functional KRA scores for a boss (Client Admin only)
 * POST /api/client-admin/bosses/:bossId/kras/functional/:kraIndex/lock
 */
export async function lockBossFunctionalKRAScores(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const bossId = req.params.bossId;
    const kraIndex = parseInt(req.params.kraIndex);

    if (!clientAdminId || !bossId || isNaN(kraIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID, Boss ID, and KRA index are required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can lock Admin KRA scores',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss' || boss.organizationId?.toString() !== clientAdmin.organizationId?.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Boss not found or does not belong to your organization',
      });
      return;
    }

    // Find boss's team
    const team = await Team.findOne({ createdBy: boss._id });
    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'Boss team not found',
      });
      return;
    }

    // Find boss in membersDetails
    const memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === boss.mobile
    );

    if (memberIndex === -1) {
      res.status(404).json({
        status: 'error',
        message: 'Boss not found in team members',
      });
      return;
    }

    const member = team.membersDetails[memberIndex];
    if (!member.functionalKRAs || kraIndex >= member.functionalKRAs.length) {
      res.status(404).json({
        status: 'error',
        message: 'KRA not found',
      });
      return;
    }

    const existingKRA = member.functionalKRAs[kraIndex] as any;

    if (existingKRA.isScoreLocked) {
      res.status(400).json({
        status: 'error',
        message: 'This KRA is already finalized',
      });
      return;
    }

    existingKRA.isScoreLocked = true;
    existingKRA.scoreLockedAt = new Date();
    existingKRA.scoreLockedBy = clientAdminId;

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'KRA scores have been finalized and locked',
      data: existingKRA,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get member index for a boss in their team
 * GET /api/client-admin/bosses/:bossId/team-member-index
 */
export async function getBossMemberIndex(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const bossId = req.params.bossId;

    if (!clientAdminId || !bossId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and Boss ID are required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can access this',
      });
      return;
    }

    // Validate boss
    const boss = await User.findById(bossId);
    if (!boss || boss.role !== 'boss' || boss.organizationId?.toString() !== clientAdmin.organizationId?.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'Boss not found or does not belong to your organization',
      });
      return;
    }

    // Find boss's team
    const team = await Team.findOne({ createdBy: boss._id });
    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'Boss team not found',
      });
      return;
    }

    // Find member index
    const memberIndex = team.membersDetails.findIndex(
      (m: any) => m.mobile === boss.mobile
    );

    if (memberIndex === -1) {
      res.status(404).json({
        status: 'error',
        message: 'Boss not found in team members',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        memberIndex,
        teamId: team._id.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get CSA analytics (organization-wide performance metrics)
 */
export async function getCSAAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;

    if (!clientAdminId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can access analytics',
      });
      return;
    }

    if (!clientAdmin.organizationId) {
      res.status(400).json({
        status: 'error',
        message: 'Client admin must be associated with an organization',
      });
      return;
    }

    // Get all users in organization
    const bosses = await User.find({
      organizationId: clientAdmin.organizationId,
      role: 'boss',
    });
    const managers = await User.find({
      organizationId: clientAdmin.organizationId,
      role: 'manager',
    });
    const employees = await User.find({
      organizationId: clientAdmin.organizationId,
      role: 'employee',
    });

    // Get all teams in organization
    const allUserIds = [...bosses, ...managers, ...employees].map(u => u._id);
    const teams = await Team.find({
      createdBy: { $in: allUserIds },
    });

    // Get dimension weights from first team (assuming all teams have same weights)
    const team = teams[0] || await Team.findOne({ createdBy: { $in: allUserIds } });
    const dimensionWeights = team?.dimensionWeights || {
      functional: 60,
      organizational: 20,
      selfDevelopment: 10,
      developingOthers: 10,
    };

    // Calculate performance for all users
    const userPerformances: Array<{
      userId: string;
      name: string;
      email: string;
      role: string;
      functionalScore: number;
      organizationalScore: number;
      selfDevelopmentScore: number;
      developingOthersScore: number;
      fourDIndex: number;
    }> = [];

    // Aggregate KRAs from all teams
    let allFunctionalKRAs: any[] = [];
    let allOrganizationalKRAs: any[] = [];
    let allSelfDevelopmentKRAs: any[] = [];
    let allDevelopingOthersKRAs: any[] = [];

    for (const user of [...bosses, ...managers, ...employees]) {
      const userTeam = teams.find(t => t.createdBy?.toString() === user._id.toString());
      if (!userTeam) continue;

      const memberDetails = userTeam.membersDetails.find(
        (m: any) => m.mobile === user.mobile
      );
      if (!memberDetails) continue;

      // Collect KRAs
      allFunctionalKRAs.push(...(memberDetails.functionalKRAs || []));
      allOrganizationalKRAs.push(...(memberDetails.organizationalKRAs || []));
      allSelfDevelopmentKRAs.push(...(memberDetails.selfDevelopmentKRAs || []));
      allDevelopingOthersKRAs.push(...(memberDetails.developingOthersKRAs || []));

      // Calculate dimension scores
      let functionalScore = 0;
      const functionalKRAs = memberDetails.functionalKRAs || [];
      if (functionalKRAs.length > 0) {
        const avgScores = functionalKRAs
          .map((kra: any) => kra.averageScore || 0)
          .filter((s: number) => s > 0);
        functionalScore = avgScores.length > 0
          ? avgScores.reduce((a: number, b: number) => a + b, 0) / avgScores.length
          : 0;
      }

      let organizationalScore = 0;
      const organizationalKRAs = memberDetails.organizationalKRAs || [];
      if (organizationalKRAs.length > 0) {
        const avgScores = organizationalKRAs
          .map((kra: any) => kra.averageScore || 0)
          .filter((s: number) => s > 0);
        organizationalScore = avgScores.length > 0
          ? avgScores.reduce((a: number, b: number) => a + b, 0) / avgScores.length
          : 0;
      }

      let selfDevelopmentScore = 0;
      const selfDevelopmentKRAs = memberDetails.selfDevelopmentKRAs || [];
      if (selfDevelopmentKRAs.length > 0) {
        const avgScores = selfDevelopmentKRAs
          .map((kra: any) => kra.averageScore || 0)
          .filter((s: number) => s > 0);
        selfDevelopmentScore = avgScores.length > 0
          ? avgScores.reduce((a: number, b: number) => a + b, 0) / avgScores.length
          : 0;
      }

      let developingOthersScore = 0;
      const developingOthersKRAs = memberDetails.developingOthersKRAs || [];
      if (developingOthersKRAs.length > 0) {
        const avgScores = developingOthersKRAs
          .map((kra: any) => kra.averageScore || 0)
          .filter((s: number) => s > 0);
        developingOthersScore = avgScores.length > 0
          ? avgScores.reduce((a: number, b: number) => a + b, 0) / avgScores.length
          : 0;
      }

      // Calculate 4D Index (weighted average)
      const fourDIndex = (
        (functionalScore * dimensionWeights.functional) +
        (organizationalScore * dimensionWeights.organizational) +
        (selfDevelopmentScore * dimensionWeights.selfDevelopment) +
        (developingOthersScore * dimensionWeights.developingOthers)
      ) / 100;

      userPerformances.push({
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        functionalScore: Math.round(functionalScore * 20), // Convert to percentage
        organizationalScore: Math.round(organizationalScore * 20),
        selfDevelopmentScore: Math.round(selfDevelopmentScore * 20),
        developingOthersScore: Math.round(developingOthersScore * 20),
        fourDIndex: Math.round(fourDIndex * 20),
      });
    }

    // Sort by 4D Index for leaderboard
    const sortedPerformances = [...userPerformances].sort((a, b) => b.fourDIndex - a.fourDIndex);
    const topPerformers = sortedPerformances.slice(0, 6);

    // Calculate organization averages
    const orgFunctional = userPerformances.length > 0
      ? Math.round(userPerformances.reduce((sum, u) => sum + u.functionalScore, 0) / userPerformances.length)
      : 0;
    const orgOrganizational = userPerformances.length > 0
      ? Math.round(userPerformances.reduce((sum, u) => sum + u.organizationalScore, 0) / userPerformances.length)
      : 0;
    const orgSelfDevelopment = userPerformances.length > 0
      ? Math.round(userPerformances.reduce((sum, u) => sum + u.selfDevelopmentScore, 0) / userPerformances.length)
      : 0;
    const orgDevelopingOthers = userPerformances.length > 0
      ? Math.round(userPerformances.reduce((sum, u) => sum + u.developingOthersScore, 0) / userPerformances.length)
      : 0;
    const orgFourDIndex = userPerformances.length > 0
      ? Math.round(userPerformances.reduce((sum, u) => sum + u.fourDIndex, 0) / userPerformances.length)
      : 0;

    // Generate trend data (last 5 periods - simulated)
    const trendData = Array.from({ length: 5 }, (_, i) => ({
      period: i,
      functional: Math.max(0, orgFunctional + (Math.random() * 10 - 5)),
      organizational: Math.max(0, orgOrganizational + (Math.random() * 10 - 5)),
      selfDevelopment: Math.max(0, orgSelfDevelopment + (Math.random() * 10 - 5)),
      developingOthers: Math.max(0, orgDevelopingOthers + (Math.random() * 10 - 5)),
    }));

    // Group users by department (bossId)
    const departmentMap = new Map<string, {
      bossId: string;
      bossName: string;
      users: typeof userPerformances;
    }>();

    // Initialize departments from bosses
    for (const boss of bosses) {
      departmentMap.set(boss._id.toString(), {
        bossId: boss._id.toString(),
        bossName: boss.name,
        users: [],
      });
    }

    // Group user performances by department
    for (const user of [...bosses, ...managers, ...employees]) {
      const deptId = user.bossId?.toString() || user._id.toString();
      if (departmentMap.has(deptId)) {
        const deptPerf = userPerformances.find(p => p.userId === user._id.toString());
        if (deptPerf) {
          departmentMap.get(deptId)!.users.push(deptPerf);
        }
      }
    }

    // Calculate department-level metrics
    const departmentComparisons = Array.from(departmentMap.values()).map(dept => {
      const deptUsers = dept.users;
      const deptFunctional = deptUsers.length > 0
        ? Math.round(deptUsers.reduce((sum, u) => sum + u.functionalScore, 0) / deptUsers.length)
        : 0;
      const deptOrganizational = deptUsers.length > 0
        ? Math.round(deptUsers.reduce((sum, u) => sum + u.organizationalScore, 0) / deptUsers.length)
        : 0;
      const deptSelfDevelopment = deptUsers.length > 0
        ? Math.round(deptUsers.reduce((sum, u) => sum + u.selfDevelopmentScore, 0) / deptUsers.length)
        : 0;
      const deptDevelopingOthers = deptUsers.length > 0
        ? Math.round(deptUsers.reduce((sum, u) => sum + u.developingOthersScore, 0) / deptUsers.length)
        : 0;
      const deptFourDIndex = deptUsers.length > 0
        ? Math.round(deptUsers.reduce((sum, u) => sum + u.fourDIndex, 0) / deptUsers.length)
        : 0;

      return {
        departmentName: dept.bossName,
        bossId: dept.bossId,
        userCount: deptUsers.length,
        fourDIndex: deptFourDIndex,
        dimensions: {
          functional: deptFunctional,
          organizational: deptOrganizational,
          selfDevelopment: deptSelfDevelopment,
          developingOthers: deptDevelopingOthers,
        },
      };
    });

    // Sort departments by 4D Index for comparison
    departmentComparisons.sort((a, b) => b.fourDIndex - a.fourDIndex);

    // Calculate average of department fourDIndex values (excluding departments with 0)
    const departmentsWithData = departmentComparisons.filter(dept => dept.fourDIndex > 0);
    const departmentAverage = departmentsWithData.length > 0
      ? Math.round(departmentsWithData.reduce((sum, dept) => sum + dept.fourDIndex, 0) / departmentsWithData.length)
      : orgFourDIndex;

    // Calculate change from previous period (simplified - you may want to store historical data)
    // For now, calculate based on trend data if available
    const previousPeriod = trendData && trendData.length > 1 ? trendData[trendData.length - 2] : null;
    const currentPeriod = trendData && trendData.length > 0 ? trendData[trendData.length - 1] : null;
    let change = 0;
    if (previousPeriod && currentPeriod) {
      // Calculate average of all dimensions for comparison
      const prevAvg = (previousPeriod.functional + previousPeriod.organizational + previousPeriod.selfDevelopment + previousPeriod.developingOthers) / 4;
      const currAvg = (currentPeriod.functional + currentPeriod.organizational + currentPeriod.selfDevelopment + currentPeriod.developingOthers) / 4;
      change = Math.round(currAvg - prevAvg);
    } else {
      // Fallback: use simulated change if no trend data
      change = 3;
    }

    // Get unique departments (using boss names as departments)
    const departments = new Set(bosses.map(b => b.name));
    const departmentCount = departments.size || 1;

    res.status(200).json({
      status: 'success',
      data: {
        fourDIndex: {
          overall: departmentAverage, // Use department average instead of org average
          change: change,
          dimensions: {
            functional: orgFunctional,
            organizational: orgOrganizational,
            selfDevelopment: orgSelfDevelopment,
            developingOthers: orgDevelopingOthers,
          },
        },
        summary: {
          managers: managers.length,
          employees: employees.length,
          departments: departmentCount,
        },
        topPerformers: topPerformers.map((p, idx) => ({
          rank: idx + 1,
          name: p.name,
          email: p.email,
          fourDIndex: p.fourDIndex,
          role: p.role,
        })),
        dimensions: {
          functional: {
            score: orgFunctional,
            items: allFunctionalKRAs.length > 0 ? allFunctionalKRAs.slice(0, 4).map((kra: any) => ({
              title: kra.kra || 'Key title goes here',
              score: Math.round((kra.averageScore || 0) * 20),
            })) : Array.from({ length: 4 }, () => ({ title: 'Key title goes here', score: 0 })),
          },
          organizational: {
            score: orgOrganizational,
            items: allOrganizationalKRAs.length > 0 ? allOrganizationalKRAs.slice(0, 4).map((kra: any) => ({
              title: kra.coreValues || 'Key title goes here',
              score: Math.round((kra.averageScore || 0) * 20),
            })) : Array.from({ length: 4 }, () => ({ title: 'Key title goes here', score: 0 })),
          },
          selfDevelopment: {
            score: orgSelfDevelopment,
            items: allSelfDevelopmentKRAs.length > 0 ? allSelfDevelopmentKRAs.slice(0, 4).map((kra: any) => ({
              title: kra.areaOfConcern || 'Key title goes here',
              score: Math.round((kra.averageScore || 0) * 20),
            })) : Array.from({ length: 4 }, () => ({ title: 'Key title goes here', score: 0 })),
          },
          developingOthers: {
            score: orgDevelopingOthers,
            items: allDevelopingOthersKRAs.length > 0 ? allDevelopingOthersKRAs.slice(0, 4).map((kra: any) => ({
              title: kra.title || 'Key title goes here',
              score: Math.round((kra.averageScore || 0) * 20),
            })) : Array.from({ length: 4}, () => ({ title: 'Key title goes here', score: 0 })),
          },
        },
        trends: trendData,
        departmentComparisons: departmentComparisons,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export performance data to Excel or PDF (Client Admin only)
 * GET /api/client-admin/export?format=excel|pdf
 */
export async function exportPerformanceData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientAdminId = req.query.userId as string;
    const format = (req.query.format as string) || 'excel';

    if (!clientAdminId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate client admin
    const clientAdmin = await User.findById(clientAdminId);
    if (!clientAdmin || clientAdmin.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only client admins can export data',
      });
      return;
    }

    if (!clientAdmin.organizationId) {
      res.status(400).json({
        status: 'error',
        message: 'Client admin must be associated with an organization',
      });
      return;
    }

    // Get export data
    const exportData = await getOrganizationExportData(
      clientAdmin.organizationId.toString()
    );

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      // Generate PDF file
      const buffer = await generatePDFFile(exportData);

      // Set response headers
      const fileName = `Performance_Appraisal_${dateStr}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Send file
      res.send(buffer);
    } else {
      // Generate Excel file
      const buffer = generateExcelFile(exportData);

      // Set response headers
      const fileName = `Performance_Appraisal_${dateStr}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Send file
      res.send(buffer);
    }
  } catch (error) {
    next(error);
  }
}

