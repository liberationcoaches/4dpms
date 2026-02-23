import { Router } from 'express';
import {
  getEmployeePerformance,
  acknowledgeReview,
  getEmployeeKRAs,
  saveEmployeeKRAs,
  getDimensionWeights,
  saveDimensionWeights,
} from '../controllers/employeeController';

const router = Router();

// Employee routes
router.get('/performance', getEmployeePerformance);
router.post('/acknowledge', acknowledgeReview);

// Self-service KRA management
router.get('/kras', getEmployeeKRAs);
router.put('/kras', saveEmployeeKRAs);

// Dimension weights
router.get('/dimension-weights', getDimensionWeights);
router.put('/dimension-weights', saveDimensionWeights);

export default router;
