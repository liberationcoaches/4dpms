import { Router } from 'express';
import {
  createBoss,
  getBosses,
  getOrganization,
  getOrganizationUsers,
  addBossFunctionalKRA,
  addBossOrganizationalKRA,
  addBossSelfDevelopmentKRA,
  getBossKRAs,
} from '../controllers/clientAdminController';

const router = Router();

// Client Admin routes
router.post('/bosses', createBoss);
router.get('/bosses', getBosses);
router.get('/organization', getOrganization);
router.get('/users', getOrganizationUsers);
router.post('/bosses/:bossId/kras/functional', addBossFunctionalKRA);
router.post('/bosses/:bossId/kras/organizational', addBossOrganizationalKRA);
router.post('/bosses/:bossId/kras/self-development', addBossSelfDevelopmentKRA);
router.get('/bosses/:bossId/kras', getBossKRAs);

export default router;

