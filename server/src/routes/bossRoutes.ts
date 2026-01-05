import { Router } from 'express';
import {
  createManager,
  getManagers,
  getBossOrganization,
  getBossAnalytics,
  addManagerFunctionalKRA,
  addManagerOrganizationalKRA,
  addManagerSelfDevelopmentKRA,
  getManagerKRAs,
  getMyKRAs,
} from '../controllers/bossController';

const router = Router();

// Boss routes
router.post('/managers', createManager);
router.get('/managers', getManagers);
router.get('/organization', getBossOrganization);
router.get('/analytics', getBossAnalytics);
router.post('/managers/:managerId/kras/functional', addManagerFunctionalKRA);
router.post('/managers/:managerId/kras/organizational', addManagerOrganizationalKRA);
router.post('/managers/:managerId/kras/self-development', addManagerSelfDevelopmentKRA);
router.get('/managers/:managerId/kras', getManagerKRAs);
router.get('/my-kras', getMyKRAs);

export default router;

