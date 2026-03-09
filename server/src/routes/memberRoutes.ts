import { Router } from 'express';
import {
  getMemberDashboard,
  getDirectReports,
  getMemberKRAs,
  addFunctionalKRA,
  addSelfDevelopmentKRA,
  addDevelopingOthersKRA,
  updateKRAStatus,
  getMyTeam,
  getSubtree,
  approveKRAs,
  rejectKRAs,
} from '../controllers/memberController';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

router.get('/dashboard', checkSubscription, getMemberDashboard);
router.get('/direct-reports', checkSubscription, getDirectReports);
router.get('/kras', checkSubscription, getMemberKRAs);
router.post('/kras/functional', checkSubscription, addFunctionalKRA);
router.post('/kras/self-development', checkSubscription, addSelfDevelopmentKRA);
router.post('/kras/developing-others', checkSubscription, addDevelopingOthersKRA);
router.patch('/kra-status', checkSubscription, updateKRAStatus);
router.get('/team', checkSubscription, getMyTeam);
router.get('/subtree', checkSubscription, getSubtree);
router.post('/team/:memberId/approve', checkSubscription, approveKRAs);
router.post('/team/:memberId/reject', checkSubscription, rejectKRAs);

export default router;
