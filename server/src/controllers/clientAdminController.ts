import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { sendInvitationNotification, sendKRANotification } from './notificationController';
import { IFunctionalKRA, IOrganizationalKRA, ISelfDevelopmentKRA } from '../models/Team';
import { updateFunctionalKRAAverageScore, validateFunctionalKRA } from '../utils/kraCalculations';
import { z } from 'zod';

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

const functionalKRASchema = z.object({
  kra: z.string().min(1),
  kpiTarget: z.string().optional(),
  reportsGenerated: z.array(proofSchema).optional(),
  pilotWeight: z.number().optional(),
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
        message: 'Only client admins can create bosses',
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
        message: 'Only client admins can view bosses',
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
        message: 'Only client admins can add KRAs for bosses',
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

    const validatedKRA = functionalKRASchema.parse(req.body);
    const validation = validateFunctionalKRA(validatedKRA as Partial<IFunctionalKRA>);

    if (!validation.valid) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid KRA data',
        errors: validation.errors,
      });
      return;
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
        message: 'Only client admins can add KRAs for bosses',
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
        message: 'Only client admins can add KRAs for bosses',
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
        message: 'Only client admins can view boss KRAs',
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

    // Get unique departments (using boss names as departments for now)
    const departments = new Set(bosses.map(b => b.name));
    const departmentCount = departments.size || 1;

    res.status(200).json({
      status: 'success',
      data: {
        fourDIndex: {
          overall: orgFourDIndex,
          change: 3, // Simulated change percentage
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
            items: allFunctionalKRAs.length > 0 ? allFunctionalKRAs.slice(0, 5).map((kra: any) => ({
              title: kra.kra || 'Key title goes here',
              score: Math.round((kra.averageScore || 0) * 20),
            })) : Array.from({ length: 5 }, () => ({ title: 'Key title goes here', score: 0 })),
          },
          organizational: {
            score: orgOrganizational,
            items: allOrganizationalKRAs.length > 0 ? allOrganizationalKRAs.slice(0, 5).map((kra: any) => ({
              title: kra.coreValues || 'Key title goes here',
              score: Math.round((kra.averageScore || 0) * 20),
            })) : Array.from({ length: 5 }, () => ({ title: 'Key title goes here', score: 0 })),
          },
          selfDevelopment: {
            score: orgSelfDevelopment,
            items: allSelfDevelopmentKRAs.length > 0 ? allSelfDevelopmentKRAs.slice(0, 5).map((kra: any) => ({
              title: kra.areaOfConcern || 'Key title goes here',
              score: Math.round((kra.averageScore || 0) * 20),
            })) : Array.from({ length: 5 }, () => ({ title: 'Key title goes here', score: 0 })),
          },
          developingOthers: {
            score: orgDevelopingOthers,
            items: allDevelopingOthersKRAs.length > 0 ? allDevelopingOthersKRAs.slice(0, 5).map((kra: any) => ({
              title: kra.title || 'Key title goes here',
              score: Math.round((kra.averageScore || 0) * 20),
            })) : Array.from({ length: 5 }, () => ({ title: 'Key title goes here', score: 0 })),
          },
        },
        trends: trendData,
      },
    });
  } catch (error) {
    next(error);
  }
}

