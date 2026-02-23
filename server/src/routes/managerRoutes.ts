import { Router } from 'express';
import {
  createEmployee,
  getEmployees,
  getTeamPerformance,
  addEmployeeFunctionalKRA,
  addEmployeeOrganizationalKRA,
  addEmployeeSelfDevelopmentKRA,
  getEmployeeKRAs,
  getMyKRAs,
  finalizeEmployeeKRAs,
} from '../controllers/managerController';

const router = Router();

// Manager routes
router.post('/employees', createEmployee);
router.get('/employees', getEmployees);
router.get('/team-performance', getTeamPerformance);
router.post('/employees/:employeeId/kras/functional', addEmployeeFunctionalKRA);
router.post('/employees/:employeeId/kras/organizational', addEmployeeOrganizationalKRA);
router.post('/employees/:employeeId/kras/self-development', addEmployeeSelfDevelopmentKRA);
router.get('/employees/:employeeId/kras', getEmployeeKRAs);
router.put('/employees/:employeeId/kras/finalize', finalizeEmployeeKRAs);
router.get('/my-kras', getMyKRAs);

export default router;

