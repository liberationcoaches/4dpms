import { Router } from 'express';
import {
  createEmployee,
  getEmployees,
  getTeamPerformance,
  addEmployeeFunctionalKRA,
  getEmployeeKRAs,
  getMyKRAs,
  finalizeEmployeeKRAs,
} from '../controllers/managerController';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

// Manager routes
router.post('/employees', checkSubscription, createEmployee);
router.get('/employees', checkSubscription, getEmployees);
router.get('/team-performance', checkSubscription, getTeamPerformance);
router.post('/employees/:employeeId/kras/functional', checkSubscription, addEmployeeFunctionalKRA);
router.get('/employees/:employeeId/kras', checkSubscription, getEmployeeKRAs);
router.put('/employees/:employeeId/kras/finalize', checkSubscription, finalizeEmployeeKRAs);
router.get('/my-kras', checkSubscription, getMyKRAs);

export default router;
