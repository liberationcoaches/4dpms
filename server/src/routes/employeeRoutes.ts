import { Router } from 'express';
import {
  getEmployeePerformance,
  acknowledgeReview,
  getEmployeeKRAs,
  saveEmployeeKRAs,
  getDimensionWeights,
  saveDimensionWeights,
} from '../controllers/employeeController';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

// Employee routes
router.get('/performance', checkSubscription, getEmployeePerformance);
router.post('/acknowledge', checkSubscription, acknowledgeReview);

// Self-service KRA management
router.get('/kras', checkSubscription, getEmployeeKRAs);
router.put('/kras', checkSubscription, saveEmployeeKRAs);

// Dimension weights
router.get('/dimension-weights', checkSubscription, getDimensionWeights);
router.put('/dimension-weights', checkSubscription, saveDimensionWeights);

export default router;
