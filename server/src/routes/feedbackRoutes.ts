import { Router } from 'express';
import {
  addMidCycleNote,
  getEmployeeFeedback,
  addFeedback,
} from '../controllers/feedbackController';

const router = Router();

// Feedback routes
router.post('/mid-cycle-note', addMidCycleNote);
router.get('/employee/:employeeId', getEmployeeFeedback);
router.post('/add', addFeedback);

export default router;

