/**
 * Review Period Scheduler
 * This utility can be used with a cron job or scheduled task
 * to automatically check and trigger review periods
 */

import { ReviewCycle } from '../models/ReviewCycle';
import { sendReviewPeriodNotifications } from '../controllers/notificationController';

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
 * Check and trigger review periods that are due
 * This should be called periodically (e.g., via cron job)
 */
export async function checkAndTriggerReviewPeriods(): Promise<void> {
  try {
    const now = new Date();
    
    // Find all active review cycles where nextReviewDate has passed
    const reviewCycles = await ReviewCycle.find({
      isActive: true,
      nextReviewDate: { $lte: now },
    }).populate('organizationId');

    console.log(`Checking ${reviewCycles.length} review cycles...`);

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

      console.log(`Triggered review period ${nextPeriod} for organization ${cycle.organizationId}`);
    }

    console.log(`Completed review period check. Triggered ${reviewCycles.length} periods.`);
  } catch (error) {
    console.error('Error in review period scheduler:', error);
  }
}

/**
 * Example cron job setup (uncomment and configure as needed):
 * 
 * import cron from 'node-cron';
 * 
 * // Run every hour
 * cron.schedule('0 * * * *', async () => {
 *   await checkAndTriggerReviewPeriods();
 * });
 */

