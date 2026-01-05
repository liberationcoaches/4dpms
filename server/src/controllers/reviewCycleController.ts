import { Request, Response, NextFunction } from 'express';
import { ReviewCycle, IReviewCycle } from '../models/ReviewCycle';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { sendReviewPeriodNotifications } from './notificationController';
import mongoose from 'mongoose';

/**
 * Calculate next review date based on frequency
 */
function calculateNextReviewDate(startDate: Date, frequency: string, currentPeriod: number): Date {
  const nextDate = new Date(startDate);
  
  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + currentPeriod);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + (currentPeriod * 3));
      break;
    case 'biannual':
      nextDate.setMonth(nextDate.getMonth() + (currentPeriod * 6));
      break;
    case 'annual':
      nextDate.setFullYear(nextDate.getFullYear() + currentPeriod);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + currentPeriod);
  }
  
  return nextDate;
}

/**
 * Create or update review cycle (Boss only)
 */
export async function configureReviewCycle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { frequency, startDate } = req.body;
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
        message: 'Only bosses can configure review cycles',
      });
      return;
    }

    if (!boss.organizationId) {
      res.status(400).json({
        status: 'error',
        message: 'Boss must be associated with an organization',
      });
      return;
    }

    // Validation
    if (!frequency || !startDate) {
      res.status(400).json({
        status: 'error',
        message: 'Frequency and start date are required',
      });
      return;
    }

    if (!['monthly', 'quarterly', 'biannual', 'annual'].includes(frequency)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid frequency. Must be: monthly, quarterly, biannual, or annual',
      });
      return;
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid start date',
      });
      return;
    }

    // Check if review cycle already exists for this organization
    let reviewCycle = await ReviewCycle.findOne({
      organizationId: boss.organizationId,
      isActive: true,
    });

    const nextReviewDate = calculateNextReviewDate(start, frequency, 1);

    if (reviewCycle) {
      // Update existing review cycle
      reviewCycle.frequency = frequency;
      reviewCycle.startDate = start;
      reviewCycle.nextReviewDate = nextReviewDate;
      reviewCycle.currentReviewPeriod = 1;
      await reviewCycle.save();
    } else {
      // Create new review cycle
      reviewCycle = new ReviewCycle({
        organizationId: boss.organizationId,
        frequency,
        startDate: start,
        nextReviewDate,
        currentReviewPeriod: 1,
        isActive: true,
      });
      await reviewCycle.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Review cycle configured successfully',
      data: reviewCycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get review cycle for organization
 */
export async function getReviewCycle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orgId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate user has access to this organization
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    const organizationId = orgId || user.organizationId;

    if (!organizationId) {
      res.status(400).json({
        status: 'error',
        message: 'Organization ID is required',
      });
      return;
    }

    const reviewCycle = await ReviewCycle.findOne({
      organizationId,
      isActive: true,
    }).populate('organizationId', 'name');

    if (!reviewCycle) {
      res.status(404).json({
        status: 'error',
        message: 'No active review cycle found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: reviewCycle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Check if review period should start and trigger if needed
 */
export async function checkReviewPeriod(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const now = new Date();
    
    // Find all active review cycles where nextReviewDate has passed
    const reviewCycles = await ReviewCycle.find({
      isActive: true,
      nextReviewDate: { $lte: now },
    }).populate('organizationId');

    const triggered = [];

    for (const cycle of reviewCycles) {
      // Update to next period
      const nextPeriod = cycle.currentReviewPeriod < 4 
        ? cycle.currentReviewPeriod + 1 
        : 1; // Reset to 1 after period 4

      const nextReviewDate = calculateNextReviewDate(
        cycle.startDate,
        cycle.frequency,
        nextPeriod
      );

      cycle.currentReviewPeriod = nextPeriod;
      cycle.nextReviewDate = nextReviewDate;
      await cycle.save();

      // Send notifications to all users in the organization
      await sendReviewPeriodNotifications(cycle.organizationId, nextPeriod);

      triggered.push({
        organizationId: cycle.organizationId,
        period: nextPeriod,
        nextReviewDate,
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Checked ${reviewCycles.length} review cycles`,
      data: {
        triggered: triggered.length,
        cycles: triggered,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manually trigger review period (for testing/admin)
 */
export async function triggerReviewPeriod(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { cycleId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Only allow boss or platform admin
    const user = await User.findById(userId);
    if (!user || (user.role !== 'boss' && user.role !== 'platform_admin')) {
      res.status(403).json({
        status: 'error',
        message: 'Only bosses or platform admins can trigger review periods',
      });
      return;
    }

    const reviewCycle = await ReviewCycle.findById(cycleId);
    if (!reviewCycle) {
      res.status(404).json({
        status: 'error',
        message: 'Review cycle not found',
      });
      return;
    }

    // Update to next period
    const nextPeriod = reviewCycle.currentReviewPeriod < 4 
      ? reviewCycle.currentReviewPeriod + 1 
      : 1;

    const nextReviewDate = calculateNextReviewDate(
      reviewCycle.startDate,
      reviewCycle.frequency,
      nextPeriod
    );

    reviewCycle.currentReviewPeriod = nextPeriod;
    reviewCycle.nextReviewDate = nextReviewDate;
    await reviewCycle.save();

    // Send notifications to all users in the organization
    await sendReviewPeriodNotifications(reviewCycle.organizationId, nextPeriod);

    res.status(200).json({
      status: 'success',
      message: 'Review period triggered successfully',
      data: reviewCycle,
    });
  } catch (error) {
    next(error);
  }
}

