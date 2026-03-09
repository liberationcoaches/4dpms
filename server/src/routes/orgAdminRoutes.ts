import { Router } from 'express';
import {
  getMembers,
  addMember,
  updateMember,
  deleteMember,
  getStats,
  getActivity,
  getTree,
  getCoreValues,
  addCoreValue,
  updateCoreValue,
  deleteCoreValue,
} from '../controllers/orgAdminController';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

router.get('/stats', checkSubscription, getStats);
router.get('/activity', checkSubscription, getActivity);
router.get('/tree', checkSubscription, getTree);
router.get('/members', checkSubscription, getMembers);
router.post('/members', checkSubscription, addMember);
router.put('/members/:id', checkSubscription, updateMember);
router.delete('/members/:id', checkSubscription, deleteMember);
router.get('/core-values', checkSubscription, getCoreValues);
router.post('/core-values', checkSubscription, addCoreValue);
router.put('/core-values/:id', checkSubscription, updateCoreValue);
router.delete('/core-values/:id', checkSubscription, deleteCoreValue);

export default router;
