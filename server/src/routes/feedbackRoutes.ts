import { Router } from 'express';
import {
  addMidCycleNote,
  getEmployeeFeedback,
  addFeedback,
} from '../controllers/feedbackController';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

// Feedback routes
router.post('/mid-cycle-note', checkSubscription, addMidCycleNote);
router.get('/employee/:employeeId', checkSubscription, getEmployeeFeedback);
router.post('/add', checkSubscription, addFeedback);

export default router;
