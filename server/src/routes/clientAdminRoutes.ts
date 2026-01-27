import { Router } from 'express';
import {
  createBoss,
  getBosses,
  getOrganization,
  getOrganizationUsers,
  addBossFunctionalKRA,
  updateBossFunctionalKRA,
  deleteBossFunctionalKRA,
  lockBossFunctionalKRAScores,
  addBossOrganizationalKRA,
  addBossSelfDevelopmentKRA,
  getBossKRAs,
  getBossMemberIndex,
  getCSAAnalytics,
  exportPerformanceData,
} from '../controllers/clientAdminController';

const router = Router();

// Client Admin routes
router.post('/bosses', createBoss);
router.get('/bosses', getBosses);
router.get('/organization', getOrganization);
router.get('/users', getOrganizationUsers);
router.post('/bosses/:bossId/kras/functional', addBossFunctionalKRA);
router.put('/bosses/:bossId/kras/functional/:kraIndex', updateBossFunctionalKRA);
router.delete('/bosses/:bossId/kras/functional/:kraIndex', deleteBossFunctionalKRA);
router.post('/bosses/:bossId/kras/functional/:kraIndex/lock', lockBossFunctionalKRAScores);
router.post('/bosses/:bossId/kras/organizational', addBossOrganizationalKRA);
router.post('/bosses/:bossId/kras/self-development', addBossSelfDevelopmentKRA);
router.get('/bosses/:bossId/kras', getBossKRAs);
router.get('/bosses/:bossId/team-member-index', getBossMemberIndex);
router.get('/analytics', getCSAAnalytics);
router.get('/export', exportPerformanceData);

export default router;

