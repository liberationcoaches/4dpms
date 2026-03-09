import { Router } from 'express';
import {
  createManager,
  getManagers,
  getBossOrganization,
  getBossAnalytics,
  addManagerFunctionalKRA,
  getManagerKRAs,
  getMyKRAs,
  finalizeManagerKRAs,
} from '../controllers/bossController';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

// Boss routes
router.post('/managers', checkSubscription, createManager);
router.get('/managers', checkSubscription, getManagers);
router.get('/organization', checkSubscription, getBossOrganization);
router.get('/analytics', checkSubscription, getBossAnalytics);
router.post('/managers/:managerId/kras/functional', checkSubscription, addManagerFunctionalKRA);
router.get('/managers/:managerId/kras', checkSubscription, getManagerKRAs);
router.put('/managers/:managerId/kras/finalize', checkSubscription, finalizeManagerKRAs);
router.get('/my-kras', checkSubscription, getMyKRAs);

export default router;
