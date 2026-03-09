import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { Feedback } from '../models/Feedback';
import { ReviewCycle } from '../models/ReviewCycle';
import { Organization } from '../models/Organization';
import {
  calculateMemberScores,
  DEFAULT_DIMENSION_WEIGHTS,
} from '../utils/calculations';
import { getUserSubtree } from '../utils/subtreeQuery';
import type {
  IDimensionWeights,
  ITeamMemberDetail,
  ISelfDevelopmentKRA,
  IDevelopingOthersKRA,
} from '../models/Team';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TeamDoc = { members: mongoose.Types.ObjectId[]; membersDetails?: ITeamMemberDetail[] };

async function findMemberDetails(
  team: TeamDoc | null,
  userId: string
): Promise<{ details: ITeamMemberDetail | null; index: number }> {
  if (!team?.membersDetails?.length) return { details: null, index: -1 };

  const user = await User.findById(userId).select('mobile').lean();
  if (!user?.mobile) return { details: null, index: -1 };

  const memberDetails = team.membersDetails.find((m) => m.mobile === user.mobile);
  if (!memberDetails) return { details: null, index: -1 };

  const index = team.membersDetails.indexOf(memberDetails);
  return { details: memberDetails, index };
}

async function getTeamForUser(userId: string, lean = false) {
  const user = await User.findById(userId).select('mobile').lean();
  if (!user?.mobile) return null;

  const team = lean
    ? await Team.findOne({ 'membersDetails.mobile': user.mobile }).lean()
    : await Team.findOne({ 'membersDetails.mobile': user.mobile });
  return team;
}

async function getTeamAndMemberDetails(userId: string) {
  const user = await User.findById(userId).select('mobile').lean();
  if (!user) return { user: null, team: null, memberDetails: null };

  const team = await getTeamForUser(userId, true);
  if (!team) return { user, team: null, memberDetails: null };

  const { details: memberDetails } = await findMemberDetails(team, userId);
  return { user, team, memberDetails };
}

function getDimensionWeightsFromOrgAndTeam(
  orgWeights?: IDimensionWeights | null,
  teamWeights?: IDimensionWeights | null
): IDimensionWeights {
  const base = orgWeights || DEFAULT_DIMENSION_WEIGHTS;
  if (!teamWeights) return base;
  return {
    functional: teamWeights.functional ?? base.functional,
    organizational: teamWeights.organizational ?? base.organizational,
    selfDevelopment: teamWeights.selfDevelopment ?? base.selfDevelopment,
    developingOthers: teamWeights.developingOthers ?? base.developingOthers,
  };
}

// ---------------------------------------------------------------------------
// getMemberDashboard
// ---------------------------------------------------------------------------

export async function getMemberDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const user = await User.findById(userId)
      .select('name designation role organizationId mobile')
      .lean();
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const { team, memberDetails } = await getTeamAndMemberDetails(userId);

    let kraStatus = 'draft';
    let functionalKRAs: ITeamMemberDetail['functionalKRAs'] = [];
    let selfDevelopmentKRAs: ITeamMemberDetail['selfDevelopmentKRAs'] = [];
    let dimensionWeights = DEFAULT_DIMENSION_WEIGHTS;

    if (memberDetails) {
      kraStatus = memberDetails.kraStatus ?? 'draft';
      functionalKRAs = memberDetails.functionalKRAs ?? [];
      selfDevelopmentKRAs = memberDetails.selfDevelopmentKRAs ?? [];
    }

    if (team) {
      const org = user.organizationId
        ? await Organization.findById(user.organizationId).select('dimensionWeights').lean()
        : null;
      dimensionWeights = getDimensionWeightsFromOrgAndTeam(
        org?.dimensionWeights,
        team.dimensionWeights
      );
    }

    // Recent feedback (last 2)
    const recentFeedback = await Feedback.find({ employeeId: userId })
      .sort({ createdAt: -1 })
      .limit(2)
      .populate('addedBy', 'name')
      .lean();

    // Review cycle
    let reviewCycle: Record<string, unknown> | null = null;
    if (user.organizationId) {
      const cycle = await ReviewCycle.findOne({
        organizationId: user.organizationId,
        isActive: true,
      }).lean();
      if (cycle) {
        reviewCycle = {
          currentReviewPeriod: cycle.currentReviewPeriod,
          startDate: cycle.startDate,
          nextReviewDate: cycle.nextReviewDate,
          frequency: cycle.frequency,
        };
      }
    }

    // Scores
    const memberKRAs = {
      functionalKRAs: memberDetails?.functionalKRAs,
      organizationalKRAs: memberDetails?.organizationalKRAs,
      selfDevelopmentKRAs: memberDetails?.selfDevelopmentKRAs,
      developingOthersKRAs: memberDetails?.developingOthersKRAs,
    };
    const currentResult = calculateMemberScores(
      memberKRAs,
      dimensionWeights,
      'average',
      false
    );
    const current4DIndex = currentResult.fourDIndex;

    const currentPeriod =
      (reviewCycle as { currentReviewPeriod?: number } | null)?.currentReviewPeriod ?? 1;
    const previousPeriod = currentPeriod > 1 ? (currentPeriod - 1) as 1 | 2 | 3 : 1;
    const previousResult = calculateMemberScores(
      memberKRAs,
      dimensionWeights,
      previousPeriod,
      false
    );
    const previousCycleIndex = previousResult.fourDIndex;
    const delta = Math.round((current4DIndex - previousCycleIndex) * 100) / 100;

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          name: user.name,
          designation: user.designation ?? '',
          role: user.role,
          organizationId: user.organizationId,
        },
        kraStatus,
        functionalKRAs: (functionalKRAs ?? []).slice(0, 4),
        selfDevelopmentKRAs: (selfDevelopmentKRAs ?? []).slice(0, 3),
        recentFeedback: recentFeedback.map((f) => ({
          _id: f._id,
          content: f.content,
          type: f.type,
          addedBy: (f.addedBy as { name?: string })?.name,
          createdAt: f.createdAt,
        })),
        reviewCycle,
        scores: {
          current4DIndex,
          previousCycleIndex,
          delta,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// getDirectReports
// ---------------------------------------------------------------------------

export async function getDirectReports(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const reports = await User.find({ reportsTo: userId })
      .select('_id name designation role')
      .lean();

    res.status(200).json({
      status: 'success',
      data: reports.map((r) => ({
        _id: r._id,
        name: r.name,
        designation: r.designation ?? '',
        role: r.role,
      })),
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// getMemberKRAs
// ---------------------------------------------------------------------------

export async function getMemberKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const team = await getTeamForUser(userId, true);
    if (!team) {
      res.status(200).json({
        status: 'success',
        data: {
          functionalKRAs: [],
          organizationalKRAs: [],
          selfDevelopmentKRAs: [],
          developingOthersKRAs: [],
          kraStatus: 'draft',
          dimensionWeights: DEFAULT_DIMENSION_WEIGHTS,
        },
      });
      return;
    }

    const { details: memberDetails } = await findMemberDetails(team, userId);

    const org = user.organizationId
      ? await Organization.findById(user.organizationId).select('dimensionWeights').lean()
      : null;
    const dimensionWeights = getDimensionWeightsFromOrgAndTeam(
      org?.dimensionWeights,
      team.dimensionWeights
    );

    res.status(200).json({
      status: 'success',
      data: {
        functionalKRAs: memberDetails?.functionalKRAs ?? [],
        organizationalKRAs: memberDetails?.organizationalKRAs ?? [],
        selfDevelopmentKRAs: memberDetails?.selfDevelopmentKRAs ?? [],
        developingOthersKRAs: memberDetails?.developingOthersKRAs ?? [],
        kraStatus: memberDetails?.kraStatus ?? 'draft',
        dimensionWeights,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// addFunctionalKRA
// ---------------------------------------------------------------------------

export async function addFunctionalKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const body = req.body as {
      kra?: string;
      kpis?: Array<{ kpi: string; target?: string }>;
      pilotWeight?: number;
    };

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const kra = typeof body.kra === 'string' ? body.kra.trim() : '';
    const kpis = Array.isArray(body.kpis)
      ? body.kpis
          .map((p) => ({
            kpi: typeof p.kpi === 'string' ? p.kpi.trim() : '',
            target: typeof p.target === 'string' ? p.target.trim() : undefined,
          }))
          .filter((p) => p.kpi.length > 0)
      : [];
    const pilotWeight = typeof body.pilotWeight === 'number' ? body.pilotWeight : 0;

    if (!kra) {
      res.status(400).json({ status: 'error', message: 'KRA title is required' });
      return;
    }

    if (kpis.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'At least one KPI with description is required',
      });
      return;
    }

    if (pilotWeight < 1 || pilotWeight > 100) {
      res.status(400).json({
        status: 'error',
        message: 'Pilot weight must be between 1 and 100',
      });
      return;
    }

    const team = await getTeamForUser(userId, false);
    if (!team) {
      res.status(404).json({ status: 'error', message: 'User is not in any team' });
      return;
    }

    const { details: member } = await findMemberDetails(team, userId);
    if (!member) {
      res.status(404).json({ status: 'error', message: 'Member not found in team' });
      return;
    }

    const kraStatus = member.kraStatus ?? 'draft';

    if (!['draft', 'pending_approval'].includes(kraStatus)) {
      res.status(403).json({
        status: 'error',
        message: 'KRAs can only be edited when status is draft or pending approval',
      });
      return;
    }

    const existingKRAs = member.functionalKRAs ?? [];
    const currentTotalWeight = existingKRAs.reduce(
      (sum, k) => sum + (k.pilotWeight ?? 0),
      0
    );

    if (currentTotalWeight + pilotWeight > 100) {
      res.status(400).json({
        status: 'error',
        message: 'Total KRA weights cannot exceed 100%',
        currentTotal: currentTotalWeight,
        remaining: 100 - currentTotalWeight,
      });
      return;
    }

    const newKRA = {
      kra,
      kpis,
      pilotWeight,
      pilotScore: 0,
      editCount: 0,
      isScoreLocked: false,
      averageScore: 0,
    };

    member.functionalKRAs = [...existingKRAs, newKRA];
    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'KRA added successfully',
      data: { functionalKRAs: member.functionalKRAs },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// addSelfDevelopmentKRA
// ---------------------------------------------------------------------------

export async function addSelfDevelopmentKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const body = req.body as {
      areaOfConcern?: string;
      actionPlanInitiative?: string;
    };

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const areaOfConcern =
      typeof body.areaOfConcern === 'string' ? body.areaOfConcern.trim() : '';
    const actionPlanInitiative =
      typeof body.actionPlanInitiative === 'string'
        ? body.actionPlanInitiative.trim()
        : '';

    if (!areaOfConcern) {
      res.status(400).json({
        status: 'error',
        message: 'Area of concern is required',
      });
      return;
    }

    const team = await getTeamForUser(userId, false);
    if (!team) {
      res.status(404).json({ status: 'error', message: 'User is not in any team' });
      return;
    }

    const { details: member } = await findMemberDetails(team, userId);
    if (!member) {
      res.status(404).json({ status: 'error', message: 'Member not found in team' });
      return;
    }

    const kraStatus = member.kraStatus ?? 'draft';

    if (!['draft', 'pending_approval'].includes(kraStatus)) {
      res.status(403).json({
        status: 'error',
        message: 'KRAs can only be edited when status is draft or pending approval',
      });
      return;
    }

    const existingAreas = member.selfDevelopmentKRAs ?? [];
    if (existingAreas.length >= 6) {
      res.status(400).json({
        status: 'error',
        message: 'Maximum 6 self development areas allowed',
      });
      return;
    }

    const newArea: ISelfDevelopmentKRA = {
      areaOfConcern,
      actionPlanInitiative: actionPlanInitiative || undefined,
      pilotScore: 0,
      averageScore: 0,
      editCount: 0,
      isScoreLocked: false,
    };

    member.selfDevelopmentKRAs = [...existingAreas, newArea];
    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Self development area added successfully',
      data: { selfDevelopmentKRAs: member.selfDevelopmentKRAs },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// addDevelopingOthersKRA
// ---------------------------------------------------------------------------

export async function addDevelopingOthersKRA(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const body = req.body as {
      personName?: string;
      areaOfDevelopment?: string;
    };

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const person =
      typeof body.personName === 'string' ? body.personName.trim() : '';
    const areaOfDevelopment =
      typeof body.areaOfDevelopment === 'string'
        ? body.areaOfDevelopment.trim()
        : '';

    if (!person) {
      res.status(400).json({
        status: 'error',
        message: 'Person name is required',
      });
      return;
    }

    const team = await getTeamForUser(userId, false);
    if (!team) {
      res.status(404).json({ status: 'error', message: 'User is not in any team' });
      return;
    }

    const { details: member } = await findMemberDetails(team, userId);
    if (!member) {
      res.status(404).json({ status: 'error', message: 'Member not found in team' });
      return;
    }

    const kraStatus = member.kraStatus ?? 'draft';

    if (!['draft', 'pending_approval'].includes(kraStatus)) {
      res.status(403).json({
        status: 'error',
        message: 'KRAs can only be edited when status is draft or pending approval',
      });
      return;
    }

    const existingEntries = member.developingOthersKRAs ?? [];
    const newEntry: IDevelopingOthersKRA = {
      person,
      areaOfDevelopment: areaOfDevelopment || undefined,
      pilotScore: 0,
      averageScore: 0,
      editCount: 0,
      isScoreLocked: false,
    };

    member.developingOthersKRAs = [...existingEntries, newEntry];
    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Person added successfully',
      data: { developingOthersKRAs: member.developingOthersKRAs },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// updateKRAStatus (with Task 4: Auto Developing Others when status → 'active')
// ---------------------------------------------------------------------------

export async function updateKRAStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const { status } = req.body as { status?: 'pending_approval' | 'draft' };

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    if (!status || !['pending_approval', 'draft'].includes(status)) {
      res.status(400).json({
        status: 'error',
        message: 'Valid status required: pending_approval or draft',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const team = await getTeamForUser(userId, false);
    if (!team) {
      res.status(404).json({ status: 'error', message: 'User is not in any team' });
      return;
    }

    const { details: member } = await findMemberDetails(team, userId);
    if (!member) {
      res.status(404).json({ status: 'error', message: 'Member not found in team' });
      return;
    }

    const currentStatus = member.kraStatus ?? 'draft';

    // Allow: draft → pending_approval (user self-submit)
    // Allow: pending_approval → draft (member can un-submit to keep editing)
    if (status === 'pending_approval') {
      if (currentStatus !== 'draft') {
        res.status(400).json({
          status: 'error',
          message: 'Can only submit for approval from draft status',
        });
        return;
      }
    } else if (status === 'draft') {
      if (currentStatus !== 'pending_approval') {
        res.status(400).json({
          status: 'error',
          message: 'Can only un-submit when status is pending approval',
        });
        return;
      }
    }

    member.kraStatus = status;
    member.kraStatusUpdatedAt = new Date();
    member.kraStatusUpdatedBy = new mongoose.Types.ObjectId(userId);
    member.kraStatusNote = undefined;
    await team.save();

    res.status(200).json({
      status: 'success',
      message: `KRA status updated to ${status}`,
      data: { kraStatus: status },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// getMyTeam
// ---------------------------------------------------------------------------

export async function getMyTeam(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const directReports = await User.find({ reportsTo: userId })
      .select('_id name designation role mobile')
      .lean();

    const org = await User.findById(userId)
      .select('organizationId')
      .lean()
      .then((u) => u?.organizationId);
    let dimensionWeights = DEFAULT_DIMENSION_WEIGHTS;
    if (org) {
      const organization = await Organization.findById(org).select('dimensionWeights').lean();
      dimensionWeights = organization?.dimensionWeights ?? dimensionWeights;
    }

    const teamMembers: Array<{
      _id: mongoose.Types.ObjectId;
      name: string;
      designation: string;
      role: string;
      kraStatus: string;
      functionalKRAs: ITeamMemberDetail['functionalKRAs'];
      organizationalKRAs: ITeamMemberDetail['organizationalKRAs'];
      selfDevelopmentKRAs: ITeamMemberDetail['selfDevelopmentKRAs'];
      developingOthersKRAs: ITeamMemberDetail['developingOthersKRAs'];
      scores: { fourDIndex: number };
    }> = [];

    for (const report of directReports) {
      const reportTeam = await getTeamForUser(report._id.toString(), true);
      const { details } = reportTeam
        ? await findMemberDetails(reportTeam, report._id.toString())
        : { details: null };

      const memberKRAs = {
        functionalKRAs: details?.functionalKRAs,
        organizationalKRAs: details?.organizationalKRAs,
        selfDevelopmentKRAs: details?.selfDevelopmentKRAs,
        developingOthersKRAs: details?.developingOthersKRAs,
      };
      const teamWeights = reportTeam?.dimensionWeights;
      const weights = getDimensionWeightsFromOrgAndTeam(
        org ? (await Organization.findById(org).select('dimensionWeights').lean())?.dimensionWeights : null,
        teamWeights
      );
      const scoresResult = calculateMemberScores(memberKRAs, weights, 'average', false);

      teamMembers.push({
        _id: report._id,
        name: report.name,
        designation: report.designation ?? '',
        role: report.role,
        kraStatus: details?.kraStatus ?? 'draft',
        functionalKRAs: details?.functionalKRAs ?? [],
        organizationalKRAs: details?.organizationalKRAs ?? [],
        selfDevelopmentKRAs: details?.selfDevelopmentKRAs ?? [],
        developingOthersKRAs: details?.developingOthersKRAs ?? [],
        scores: { fourDIndex: scoresResult.fourDIndex },
      });
    }

    res.status(200).json({
      status: 'success',
      data: teamMembers,
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// getSubtree
// ---------------------------------------------------------------------------

interface SubtreeNode {
  id: string;
  name: string;
  designation: string;
  score: number;
  kraStatus: string;
  children: SubtreeNode[];
}

async function buildSubtreeNode(
  nodeUserId: string,
  userMap: Map<string, { name: string; designation?: string }>,
  memberDetailsMap: Map<string, { kraStatus: string; memberKRAs: Parameters<typeof calculateMemberScores>[0] }>,
  dimensionWeights: IDimensionWeights
): Promise<SubtreeNode> {
  const user = userMap.get(nodeUserId);
  const memberData = memberDetailsMap.get(nodeUserId);
  const kraStatus = memberData?.kraStatus ?? 'draft';
  const scoresResult = memberData?.memberKRAs
    ? calculateMemberScores(memberData.memberKRAs, dimensionWeights, 'average', false)
    : null;
  const score = scoresResult?.fourDIndex ?? 0;

  const children = await User.find({ reportsTo: nodeUserId })
    .select('_id')
    .lean();
  const childNodes = await Promise.all(
    children.map((c) =>
      buildSubtreeNode(
        c._id.toString(),
        userMap,
        memberDetailsMap,
        dimensionWeights
      )
    )
  );

  return {
    id: nodeUserId,
    name: user?.name ?? 'Unknown',
    designation: user?.designation ?? '',
    score,
    kraStatus,
    children: childNodes,
  };
}

export async function getSubtree(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const rootUser = await User.findById(userId).lean();
    if (!rootUser) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const subtreeIds = await getUserSubtree(userId);
    const allIds = [userId, ...subtreeIds];

    const users = await User.find({ _id: { $in: allIds } })
      .select('_id name designation')
      .lean();
    const userMap = new Map(
      users.map((u) => [u._id.toString(), { name: u.name, designation: u.designation }])
    );

    const teamMobiles = (await User.find({ _id: { $in: allIds } }).select('mobile').lean())
      .map((u) => u.mobile)
      .filter(Boolean);
    const teams = await Team.find({
      $or: [
        { members: { $in: allIds } },
        ...(teamMobiles.length ? [{ 'membersDetails.mobile': { $in: teamMobiles } }] : []),
      ],
    }).lean();

    const memberDetailsMap = new Map<
      string,
      { kraStatus: string; memberKRAs: Parameters<typeof calculateMemberScores>[0] }
    >();

    for (const team of teams) {
      const membersDetails = team.membersDetails ?? [];
      for (const details of membersDetails) {
        if (!details?.mobile) continue;
        const u = await User.findOne({ mobile: details.mobile }).select('_id').lean();
        const userId = u?._id?.toString() ?? null;
        if (!userId || !allIds.includes(userId)) continue;
        memberDetailsMap.set(userId, {
          kraStatus: details.kraStatus ?? 'draft',
          memberKRAs: {
            functionalKRAs: details.functionalKRAs,
            organizationalKRAs: details.organizationalKRAs,
            selfDevelopmentKRAs: details.selfDevelopmentKRAs,
            developingOthersKRAs: details.developingOthersKRAs,
          },
        });
      }
    }

    // Get dimension weights for root user's org
    let dimensionWeights = DEFAULT_DIMENSION_WEIGHTS;
    if (rootUser.organizationId) {
      const org = await Organization.findById(rootUser.organizationId).select('dimensionWeights').lean();
      dimensionWeights = org?.dimensionWeights ?? dimensionWeights;
    }

    const tree = await buildSubtreeNode(
      userId,
      userMap,
      memberDetailsMap,
      dimensionWeights
    );

    res.status(200).json({
      status: 'success',
      data: tree,
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// approveKRAs (with Task 4: Auto Developing Others when status → 'active')
// ---------------------------------------------------------------------------

/**
 * When user's kraStatus changes to 'active': find their direct reports,
 * check each report's selfDevelopmentKRAs averageScore. If any < 3.0,
 * auto-add to THIS user's developingOthersKRAs (avoid duplicates by person name).
 */
async function addAutoDevelopingOthersKRAs(
  approvedUserId: string,
  team: InstanceType<typeof Team>,
  member: ITeamMemberDetail
): Promise<void> {
  const directReports = await User.find({ reportsTo: approvedUserId })
    .select('_id name')
    .lean();

  if (directReports.length === 0) return;
  const existingDeveloping = member.developingOthersKRAs ?? [];
  const existingPersons = new Set(
    existingDeveloping.map((d) => d.person?.toLowerCase().trim()).filter(Boolean)
  );

  for (const report of directReports) {
    const reportTeam = await getTeamForUser(report._id.toString(), true);
    const { details: reportDetails } = reportTeam
      ? await findMemberDetails(reportTeam, report._id.toString())
      : { details: null };
    const selfDevKRAs = (reportDetails?.selfDevelopmentKRAs ?? []) as ISelfDevelopmentKRA[];

    const lowScoreKra = selfDevKRAs.find((k) => (k.averageScore ?? 0) < 3.0);
    if (!lowScoreKra) continue;

    const personName = report.name ?? '';
    if (existingPersons.has(personName.toLowerCase().trim())) continue;

    const newEntry: IDevelopingOthersKRA = {
      person: personName,
      areaOfDevelopment: lowScoreKra.areaOfConcern ?? 'Auto-added from Self Development',
      pilotScore: 0,
      pilotReason: 'Auto-added from Self Development',
    };
    existingDeveloping.push(newEntry);
    existingPersons.add(personName.toLowerCase().trim());
  }

  if (existingDeveloping.length > (member.developingOthersKRAs?.length ?? 0)) {
    member.developingOthersKRAs = existingDeveloping;
    await team.save();
  }
}

export async function approveKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const memberId = req.params.memberId as string;

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }
    if (!memberId) {
      res.status(400).json({ status: 'error', message: 'Member ID is required' });
      return;
    }

    const targetUser = await User.findById(memberId).lean();
    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'Member not found' });
      return;
    }

    if (targetUser.reportsTo?.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'Only direct supervisor can approve KRAs',
      });
      return;
    }

    const team = await getTeamForUser(memberId, false);
    if (!team) {
      res.status(404).json({ status: 'error', message: 'Member is not in any team' });
      return;
    }

    const { details: member } = await findMemberDetails(team, memberId);
    if (!member) {
      res.status(404).json({ status: 'error', message: 'Member not found in team' });
      return;
    }

    const currentStatus = member.kraStatus ?? 'draft';

    if (currentStatus !== 'pending_approval') {
      res.status(400).json({
        status: 'error',
        message: 'Can only approve KRAs that are pending approval',
      });
      return;
    }

    member.kraStatus = 'active';
    member.kraStatusUpdatedAt = new Date();
    member.kraStatusUpdatedBy = new mongoose.Types.ObjectId(userId);
    member.kraStatusNote = undefined;
    await team.save();

    // Task 4: Auto Developing Others - add member's direct reports with selfDev avg < 3 to member's developingOthersKRAs
    await addAutoDevelopingOthersKRAs(memberId, team as InstanceType<typeof Team>, member);

    res.status(200).json({
      status: 'success',
      message: 'KRAs approved successfully',
      data: { kraStatus: 'active' },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// rejectKRAs
// ---------------------------------------------------------------------------

export async function rejectKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const memberId = req.params.memberId as string;
    const { note } = req.body as { note?: string };

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }
    if (!memberId) {
      res.status(400).json({ status: 'error', message: 'Member ID is required' });
      return;
    }

    const targetUser = await User.findById(memberId).lean();
    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'Member not found' });
      return;
    }

    if (targetUser.reportsTo?.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'Only direct supervisor can reject KRAs',
      });
      return;
    }

    const team = await getTeamForUser(memberId, false);
    if (!team) {
      res.status(404).json({ status: 'error', message: 'Member is not in any team' });
      return;
    }

    const { details: member } = await findMemberDetails(team, memberId);
    if (!member) {
      res.status(404).json({ status: 'error', message: 'Member not found in team' });
      return;
    }

    const currentStatus = member.kraStatus ?? 'draft';

    if (currentStatus !== 'pending_approval') {
      res.status(400).json({
        status: 'error',
        message: 'Can only reject KRAs that are pending approval',
      });
      return;
    }

    member.kraStatus = 'draft';
    member.kraStatusUpdatedAt = new Date();
    member.kraStatusUpdatedBy = new mongoose.Types.ObjectId(userId);
    member.kraStatusNote = typeof note === 'string' ? note.trim() : undefined;
    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'KRAs rejected',
      data: { kraStatus: 'draft', kraStatusNote: member.kraStatusNote },
    });
  } catch (error) {
    next(error);
  }
}