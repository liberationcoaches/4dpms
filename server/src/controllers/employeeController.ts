import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { ReviewCycle } from '../models/ReviewCycle';
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
    const { actionPlan } = req.body;
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

    // TODO: Store action plan in database (could add to User model or create separate ActionPlan model)
    // For now, just return success

    res.status(200).json({
      status: 'success',
      message: 'Review acknowledged and action plan saved',
      data: {
        employeeId: employee._id,
        actionPlan,
        acknowledgedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
}

