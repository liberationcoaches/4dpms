import { Request, Response, NextFunction } from 'express';
import { ReviewCycle } from '../models/ReviewCycle';
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
    const {
      frequency,
      startDate,
      r1Date,
      r2Date,
      r3Date,
      r4Date,
      r1Facilitator,
      r2Facilitator,
      r3Facilitator,
      r4Facilitator,
    } = req.body;
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
        message: 'Only Admins can configure review cycles',
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

    const quarterDates = [
      r1Date ? new Date(r1Date) : undefined,
      r2Date ? new Date(r2Date) : undefined,
      r3Date ? new Date(r3Date) : undefined,
      r4Date ? new Date(r4Date) : undefined,
    ].map((d) => (d && !isNaN(d.getTime()) ? d : undefined));

    if (reviewCycle) {
      // Update existing review cycle
      reviewCycle.frequency = frequency;
      reviewCycle.startDate = start;
      reviewCycle.nextReviewDate = nextReviewDate;
      reviewCycle.currentReviewPeriod = 1;
      if (quarterDates[0] !== undefined) reviewCycle.r1Date = quarterDates[0];
      if (quarterDates[1] !== undefined) reviewCycle.r2Date = quarterDates[1];
      if (quarterDates[2] !== undefined) reviewCycle.r3Date = quarterDates[2];
      if (quarterDates[3] !== undefined) reviewCycle.r4Date = quarterDates[3];
      if (r1Facilitator !== undefined) reviewCycle.r1Facilitator = String(r1Facilitator).trim() || undefined;
      if (r2Facilitator !== undefined) reviewCycle.r2Facilitator = String(r2Facilitator).trim() || undefined;
      if (r3Facilitator !== undefined) reviewCycle.r3Facilitator = String(r3Facilitator).trim() || undefined;
      if (r4Facilitator !== undefined) reviewCycle.r4Facilitator = String(r4Facilitator).trim() || undefined;
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
        r1Date: quarterDates[0],
        r2Date: quarterDates[1],
        r3Date: quarterDates[2],
        r4Date: quarterDates[3],
        r1Facilitator: r1Facilitator ? String(r1Facilitator).trim() : undefined,
        r2Facilitator: r2Facilitator ? String(r2Facilitator).trim() : undefined,
        r3Facilitator: r3Facilitator ? String(r3Facilitator).trim() : undefined,
        r4Facilitator: r4Facilitator ? String(r4Facilitator).trim() : undefined,
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

    const organizationId = (orgId && orgId !== 'me' ? orgId : user.organizationId) as mongoose.Types.ObjectId | undefined;

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
  _req: Request,
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
        message: 'Only Admins or platform admins can trigger review periods',
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

/**
 * Update review cycle quarterly dates and facilitators (Boss only)
 * PUT /api/review-cycles/:cycleId
 */
export async function updateReviewCycle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { cycleId } = req.params;
    const userId = req.query.userId as string;
    const {
      r1Date,
      r2Date,
      r3Date,
      r4Date,
      r1Facilitator,
      r2Facilitator,
      r3Facilitator,
      r4Facilitator,
    } = req.body;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user || (user.role !== 'boss' && user.role !== 'platform_admin')) {
      res.status(403).json({
        status: 'error',
        message: 'Only Admins or platform admins can update review cycle',
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

    // Boss can only update their org's cycle
    if (user.role === 'boss' && user.organizationId?.toString() !== reviewCycle.organizationId?.toString()) {
      res.status(403).json({
        status: 'error',
        message: 'You can only update your organization\'s review cycle',
      });
      return;
    }

    const quarterDates = [r1Date, r2Date, r3Date, r4Date].map((d: string | undefined) => {
      if (!d) return undefined;
      const x = new Date(d);
      return !isNaN(x.getTime()) ? x : undefined;
    });
    if (quarterDates[0] !== undefined) reviewCycle.r1Date = quarterDates[0];
    if (quarterDates[1] !== undefined) reviewCycle.r2Date = quarterDates[1];
    if (quarterDates[2] !== undefined) reviewCycle.r3Date = quarterDates[2];
    if (quarterDates[3] !== undefined) reviewCycle.r4Date = quarterDates[3];
    if (r1Facilitator !== undefined) reviewCycle.r1Facilitator = String(r1Facilitator).trim() || undefined;
    if (r2Facilitator !== undefined) reviewCycle.r2Facilitator = String(r2Facilitator).trim() || undefined;
    if (r3Facilitator !== undefined) reviewCycle.r3Facilitator = String(r3Facilitator).trim() || undefined;
    if (r4Facilitator !== undefined) reviewCycle.r4Facilitator = String(r4Facilitator).trim() || undefined;

    await reviewCycle.save();

    res.status(200).json({
      status: 'success',
      message: 'Review cycle updated successfully',
      data: reviewCycle,
    });
  } catch (error) {
    next(error);
  }
}

