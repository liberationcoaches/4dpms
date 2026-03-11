import { Router } from 'express';
import {
  getMembers,
  addMember,
  inviteMember,
  bulkInviteMembers,
  sendInviteLink,
  getInviteCode,
  regenerateInviteCode,
  resendInvite,
  updateMember,
  updateMemberReportsTo,
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
router.post('/members/invite', checkSubscription, inviteMember);
router.post('/members/bulk-invite', checkSubscription, bulkInviteMembers);
router.post('/members/:memberId/resend-invite', checkSubscription, resendInvite);
router.post('/members/invite-link', checkSubscription, sendInviteLink);
router.get('/invite-code', checkSubscription, getInviteCode);
router.post('/invite-code/regenerate', checkSubscription, regenerateInviteCode);
router.put('/members/:id', checkSubscription, updateMember);
router.patch('/members/:memberId/reports-to', checkSubscription, updateMemberReportsTo);
router.delete('/members/:id', checkSubscription, deleteMember);
router.get('/core-values', checkSubscription, getCoreValues);
router.post('/core-values', checkSubscription, addCoreValue);
router.put('/core-values/:id', checkSubscription, updateCoreValue);
router.delete('/core-values/:id', checkSubscription, deleteCoreValue);

export default router;
