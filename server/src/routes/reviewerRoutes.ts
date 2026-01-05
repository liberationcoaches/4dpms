import { Router } from 'express';
import {
  getAssignedOrganizations,
  getOrgEmployees,
  getEmployeesToReview,
  getEmployeeForScoring,
  submitScores,
  lockReview,
} from '../controllers/reviewerController';

const router = Router();

// Reviewer routes
router.get('/organizations', getAssignedOrganizations);
router.get('/organizations/:orgId/employees', getOrgEmployees);
router.get('/employees', getEmployeesToReview);
router.get('/employees/:employeeId', getEmployeeForScoring);
router.post('/employees/:employeeId/scores', submitScores);
router.post('/employees/:employeeId/lock', lockReview);

export default router;

