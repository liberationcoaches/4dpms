import { Router } from 'express';
import {
  getEmployeePerformance,
  acknowledgeReview,
} from '../controllers/employeeController';

const router = Router();

// Employee routes
router.get('/performance', getEmployeePerformance);
router.post('/acknowledge', acknowledgeReview);

export default router;

