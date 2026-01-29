import { Router } from 'express';
import {
  configureReviewCycle,
  getReviewCycle,
  checkReviewPeriod,
  triggerReviewPeriod,
  updateReviewCycle,
} from '../controllers/reviewCycleController';

const router = Router();

// Review cycle routes
router.post('/', configureReviewCycle);
router.get('/organization/:orgId', getReviewCycle);
router.put('/:cycleId', updateReviewCycle);
router.get('/check', checkReviewPeriod); // Check and trigger if needed
router.post('/:cycleId/trigger', triggerReviewPeriod);

export default router;

