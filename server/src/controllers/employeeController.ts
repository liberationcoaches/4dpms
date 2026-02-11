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

