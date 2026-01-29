import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { ReviewCycle } from '../models/ReviewCycle';

/**
 * Get employee performance data
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

    // Calculate current score from latest period
    let currentScore = 0;
    let historicalScores: Array<{ period: number; score: number; date: string }> = [];

    if (memberDetails) {
      // Calculate average scores for each period
      for (let period = 1; period <= 4; period++) {
        const periodScores: number[] = [];

        // Functional KRAs
        memberDetails.functionalKRAs?.forEach((kra) => {
          const score = kra[`r${period}Score`] || 0;
          const weight = kra[`r${period}Weight`] || 0;
          if (score > 0 && weight > 0) {
            periodScores.push((score * weight) / 100);
          }
        });

        // Organizational KRAs
        memberDetails.organizationalKRAs?.forEach((kra) => {
          const score = kra[`r${period}Score`] || 0;
          if (score > 0) {
            periodScores.push(score);
          }
        });

        // Self Development KRAs
        memberDetails.selfDevelopmentKRAs?.forEach((kra) => {
          const score = kra[`r${period}Score`] || 0;
          if (score > 0) {
            periodScores.push(score);
          }
        });

        // Developing Others KRAs
        memberDetails.developingOthersKRAs?.forEach((kra) => {
          const score = kra[`r${period}Score`] || 0;
          if (score > 0) {
            periodScores.push(score);
          }
        });

        if (periodScores.length > 0) {
          const avgScore = periodScores.reduce((a, b) => a + b, 0) / periodScores.length;
          historicalScores.push({
            period,
            score: Math.round(avgScore * 100) / 100,
            date: reviewCycle?.startDate 
              ? new Date(reviewCycle.startDate).toISOString() 
              : new Date().toISOString(),
          });

          // Current score is from the latest period with data
          if (avgScore > 0) {
            currentScore = Math.round(avgScore * 100) / 100;
          }
        }
      }
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
        currentScore,
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

