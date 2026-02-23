import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { ReviewCycle } from '../models/ReviewCycle';
import { ActionPlan } from '../models/ActionPlan';
import {
  calculateMemberScores,
  calculateMemberScoresByPeriod,
  DEFAULT_DIMENSION_WEIGHTS,
} from '../utils/calculations';

/**
 * Get employee performance data
 * Uses proper dimension weights from organization for score calculation
 */
export async function getEmployeePerformance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const employeeId = req.query.userId as string;

    if (!employeeId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate employee
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      res.status(403).json({
        status: 'error',
        message: 'Only Members can access this',
      });
      return;
    }

    // Get organization dimension weights
    let dimensionWeights = DEFAULT_DIMENSION_WEIGHTS;
    if (employee.organizationId) {
      const organization = await Organization.findById(employee.organizationId);
      if (organization?.dimensionWeights) {
        dimensionWeights = organization.dimensionWeights;
      }
    }

    // Get team member details
    const team = await Team.findOne({
      'membersDetails.mobile': employee.mobile,
    });

    const memberDetails = team?.membersDetails.find(
      (m) => m.mobile === employee.mobile
    );

    // Get review cycle
    let reviewCycle = null;
    if (employee.organizationId) {
      reviewCycle = await ReviewCycle.findOne({
        organizationId: employee.organizationId,
        isActive: true,
      });
    }

    // Calculate scores using proper dimension weights
    let currentScore = 0;
    let dimensionScores = {
      functional: 0,
      organizational: 0,
      selfDevelopment: 0,
      developingOthers: 0,
    };
    let historicalScores: Array<{
      period: number;
      score: number;
      fourDIndex: number;
      dimensions: typeof dimensionScores;
      date: string;
    }> = [];

    if (memberDetails) {
      // Calculate overall average score (4D Index)
      const overallScores = calculateMemberScores(
        {
          functionalKRAs: memberDetails.functionalKRAs,
          organizationalKRAs: memberDetails.organizationalKRAs,
          selfDevelopmentKRAs: memberDetails.selfDevelopmentKRAs,
          developingOthersKRAs: memberDetails.developingOthersKRAs,
        },
        dimensionWeights,
        'average',
        true // Include pilot scores
      );

      currentScore = overallScores.fourDIndex;
      dimensionScores = {
        functional: overallScores.functional,
        organizational: overallScores.organizational,
        selfDevelopment: overallScores.selfDevelopment,
        developingOthers: overallScores.developingOthers,
      };

      // Calculate historical scores per period
      const periodScores = calculateMemberScoresByPeriod(
        {
          functionalKRAs: memberDetails.functionalKRAs,
          organizationalKRAs: memberDetails.organizationalKRAs,
          selfDevelopmentKRAs: memberDetails.selfDevelopmentKRAs,
          developingOthersKRAs: memberDetails.developingOthersKRAs,
        },
        dimensionWeights
      );

      historicalScores = periodScores.map(({ period, scores }) => ({
        period,
        score: scores.fourDIndex, // Legacy field for backward compatibility
        fourDIndex: scores.fourDIndex,
        dimensions: {
          functional: scores.functional,
          organizational: scores.organizational,
          selfDevelopment: scores.selfDevelopment,
          developingOthers: scores.developingOthers,
        },
        date: reviewCycle?.startDate
          ? new Date(reviewCycle.startDate).toISOString()
          : new Date().toISOString(),
      }));
    }

    // Get next review date
    const nextReviewDate = reviewCycle?.nextReviewDate || null;

    res.status(200).json({
      status: 'success',
      data: {
        employee: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
        },
        currentScore, // 4D Index (0-5 scale)
        dimensionScores, // Individual dimension scores
        dimensionWeights, // So employee knows how their score is weighted
        historicalScores,
        nextReviewDate,
        currentPeriod: reviewCycle?.currentReviewPeriod || 1,
        kras: memberDetails || {
          functionalKRAs: [],
          organizationalKRAs: [],
          selfDevelopmentKRAs: [],
          developingOthersKRAs: [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Acknowledge review and create action plan
 */
export async function acknowledgeReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { actionPlan, notes } = req.body;
    const employeeId = req.query.userId as string;

    if (!employeeId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate employee
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      res.status(403).json({
        status: 'error',
        message: 'Only Members can acknowledge reviews',
      });
      return;
    }

    // Get current review period
    let currentPeriod = 1;
    if (employee.organizationId) {
      const reviewCycle = await ReviewCycle.findOne({
        organizationId: employee.organizationId,
        isActive: true,
      }).select('currentReviewPeriod').lean();
      currentPeriod = reviewCycle?.currentReviewPeriod ?? 1;
    }

    // Parse action plan items
    let actionPlanItems: Array<{ description: string; targetDate?: Date; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }> = [];

    if (Array.isArray(actionPlan)) {
      // If actionPlan is an array of items
      actionPlanItems = actionPlan.map((item: any) => ({
        description: typeof item === 'string' ? item : (item.description || item.text || ''),
        targetDate: item.targetDate ? new Date(item.targetDate) : undefined,
        status: 'pending' as const,
      })).filter(item => item.description.trim() !== '');
    } else if (typeof actionPlan === 'string' && actionPlan.trim()) {
      // If actionPlan is a single string, split by newlines or create single item
      const items = actionPlan.split('\n').filter((line: string) => line.trim() !== '');
      actionPlanItems = items.map((item: string) => ({
        description: item.trim(),
        status: 'pending' as const,
      }));
    }

    // Store action plan in database
    const savedActionPlan = new ActionPlan({
      employeeId: employee._id,
      organizationId: employee.organizationId,
      reviewPeriod: currentPeriod,
      items: actionPlanItems,
      acknowledgedAt: new Date(),
      notes: notes || undefined,
    });

    await savedActionPlan.save();

    res.status(200).json({
      status: 'success',
      message: 'Review acknowledged and action plan saved',
      data: {
        _id: savedActionPlan._id,
        employeeId: employee._id,
        reviewPeriod: currentPeriod,
        actionPlan: savedActionPlan.items,
        acknowledgedAt: savedActionPlan.acknowledgedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get employee's current KRAs
 */
export async function getEmployeeKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const employeeId = req.query.userId as string;

    if (!employeeId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    // Find the team this employee belongs to
    const team = await Team.findOne({ 'membersDetails.mobile': employee.mobile });
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
      (m) => m.mobile === employee.mobile
    );

    res.status(200).json({
      status: 'success',
      data: {
        functionalKRAs: memberDetails?.functionalKRAs || [],
        organizationalKRAs: memberDetails?.organizationalKRAs || [],
        selfDevelopmentKRAs: memberDetails?.selfDevelopmentKRAs || [],
        developingOthersKRAs: memberDetails?.developingOthersKRAs || [],
        krasFinalized: memberDetails?.krasFinalized || false,
        krasFinalizedAt: memberDetails?.krasFinalizedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Save employee's own KRAs across all 4 dimensions
 * Notifies their supervisor when saved
 */
export async function saveEmployeeKRAs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const employeeId = req.query.userId as string;
    const { functionalKRAs, organizationalKRAs, selfDevelopmentKRAs, developingOthersKRAs } = req.body;

    if (!employeeId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    // Find the team this employee belongs to
    const team = await Team.findOne({ 'membersDetails.mobile': employee.mobile });
    if (!team) {
      res.status(404).json({ status: 'error', message: 'Employee is not part of any team' });
      return;
    }

    const memberIndex = team.membersDetails.findIndex(
      (m) => m.mobile === employee.mobile
    );
    if (memberIndex === -1) {
      res.status(404).json({ status: 'error', message: 'Employee not found in team details' });
      return;
    }

    // Check if KRAs are finalized (top-level check)
    const member = team.membersDetails[memberIndex];
    if (member.krasFinalized) {
      res.status(403).json({
        status: 'error',
        message: 'Your KRAs have been finalized by your supervisor and cannot be edited.',
      });
      return;
    }

    // Also check individual score-locked KRAs
    const hasLockedKRAs = member.functionalKRAs?.some(k => k.isScoreLocked) ||
      member.organizationalKRAs?.some(k => k.isScoreLocked) ||
      member.selfDevelopmentKRAs?.some(k => k.isScoreLocked) ||
      member.developingOthersKRAs?.some(k => k.isScoreLocked);

    if (hasLockedKRAs) {
      res.status(403).json({
        status: 'error',
        message: 'Some KRAs are finalized and cannot be edited',
      });
      return;
    }

    // Update KRAs — only update the KRA definition fields, preserve any existing scores
    if (Array.isArray(functionalKRAs)) {
      team.membersDetails[memberIndex].functionalKRAs = functionalKRAs.map((kra: any) => ({
        kra: kra.kra || '',
        kpis: Array.isArray(kra.kpis) ? kra.kpis.map((k: any) => ({ kpi: k.kpi || '', target: k.target || '' })) : [],
        editCount: 0,
        // Persist weights and pilot data
        r1Weight: kra.r1Weight || 0,
        r2Weight: kra.r2Weight || 0,
        r3Weight: kra.r3Weight || 0,
        r4Weight: kra.r4Weight || 0,
        pilotWeight: kra.pilotWeight || 0,
        pilotScore: kra.pilotScore || 0,
      }));
    }

    if (Array.isArray(organizationalKRAs)) {
      team.membersDetails[memberIndex].organizationalKRAs = organizationalKRAs.map((kra: any) => ({
        coreValues: kra.coreValues || '',
        editCount: 0,
      }));
    }

    if (Array.isArray(selfDevelopmentKRAs)) {
      team.membersDetails[memberIndex].selfDevelopmentKRAs = selfDevelopmentKRAs.map((kra: any) => ({
        areaOfConcern: kra.areaOfConcern || '',
        actionPlanInitiative: kra.actionPlanInitiative || '',
        editCount: 0,
      }));
    }

    if (Array.isArray(developingOthersKRAs)) {
      team.membersDetails[memberIndex].developingOthersKRAs = developingOthersKRAs.map((kra: any) => ({
        person: kra.person || '',
        areaOfDevelopment: kra.areaOfDevelopment || '',
        editCount: 0,
      }));
    }

    // Mark as ready for review
    team.membersDetails[memberIndex].krasReadyForReview = true;

    await team.save();

    // Notify the supervisor (team creator / manager)
    try {
      const { Notification } = await import('../models/Notification');
      const supervisor = await User.findById(team.createdBy);
      if (supervisor) {
        const notification = new Notification({
          userId: supervisor._id,
          type: 'info',
          title: 'KRAs submitted for review',
          message: `${employee.name} has submitted their KRAs for your review and finalization.`,
          isRead: false,
          metadata: {
            type: 'kra_submitted',
            employeeId: employee._id,
            employeeName: employee.name,
            teamId: team._id,
          },
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error('Failed to send KRA notification:', notifError);
    }

    res.status(200).json({
      status: 'success',
      message: 'KRAs saved successfully. Your supervisor has been notified.',
      data: {
        functionalKRAs: team.membersDetails[memberIndex].functionalKRAs,
        organizationalKRAs: team.membersDetails[memberIndex].organizationalKRAs,
        selfDevelopmentKRAs: team.membersDetails[memberIndex].selfDevelopmentKRAs,
        developingOthersKRAs: team.membersDetails[memberIndex].developingOthersKRAs,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get dimension weights for employee's team
 */
export async function getDimensionWeights(
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

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    // Get from organization first, then fall back to team, then defaults
    let weights = { functional: 40, organizational: 25, selfDevelopment: 20, developingOthers: 15 };

    if (user.organizationId) {
      const org = await Organization.findById(user.organizationId);
      if (org?.dimensionWeights) {
        weights = {
          functional: org.dimensionWeights.functional || 40,
          organizational: org.dimensionWeights.organizational || 25,
          selfDevelopment: org.dimensionWeights.selfDevelopment || 20,
          developingOthers: org.dimensionWeights.developingOthers || 15,
        };
      }
    }

    // Override with team-level weights if set
    const team = await Team.findOne({ 'membersDetails.mobile': user.mobile });
    if (team?.dimensionWeights) {
      const tw = team.dimensionWeights;
      if (tw.functional || tw.organizational || tw.selfDevelopment || tw.developingOthers) {
        weights = {
          functional: tw.functional || weights.functional,
          organizational: tw.organizational || weights.organizational,
          selfDevelopment: tw.selfDevelopment || weights.selfDevelopment,
          developingOthers: tw.developingOthers || weights.developingOthers,
        };
      }
    }

    res.status(200).json({
      status: 'success',
      data: weights,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Save dimension weights for employee's organization
 * Only boss/client_admin can update org weights; others update team weights
 */
export async function saveDimensionWeights(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const { functional, organizational, selfDevelopment, developingOthers } = req.body;

    if (!userId) {
      res.status(400).json({ status: 'error', message: 'User ID is required' });
      return;
    }

    // Validate weights sum to 100
    const total = (functional || 0) + (organizational || 0) + (selfDevelopment || 0) + (developingOthers || 0);
    if (Math.abs(total - 100) > 0.01) {
      res.status(400).json({
        status: 'error',
        message: `Dimension weights must sum to 100. Current total: ${total}`,
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const weights = { functional, organizational, selfDevelopment, developingOthers };

    // Boss/client_admin: update organization-level weights
    if (['boss', 'client_admin'].includes(user.role) && user.organizationId) {
      await Organization.findByIdAndUpdate(user.organizationId, {
        dimensionWeights: weights,
      });
    }

    // Also update team-level weights
    const team = await Team.findOne({ 'membersDetails.mobile': user.mobile });
    if (team) {
      team.dimensionWeights = weights;
      await team.save();
    } else if (user.role === 'boss' || user.role === 'manager') {
      // Boss/manager may have created a team
      const ownedTeam = await Team.findOne({ createdBy: user._id });
      if (ownedTeam) {
        ownedTeam.dimensionWeights = weights;
        await ownedTeam.save();
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Dimension weights saved successfully',
      data: weights,
    });
  } catch (error) {
    next(error);
  }
}


