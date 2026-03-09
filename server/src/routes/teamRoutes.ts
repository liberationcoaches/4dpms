import { Router } from 'express';
import { getTeamCode, getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember, getDimensionWeights, updateDimensionWeights } from '../controllers/teamController';
import { addKRA, updateKRA, deleteKRA, lockKRAScores } from '../controllers/kraController';
import {
  addOrganizational,
  updateOrganizational,
  lockOrganizationalScores,
  addSelfDevelopment,
  updateSelfDevelopment,
  lockSelfDevelopmentScores,
  addDevelopingOthers,
  updateDevelopingOthers,
  lockDevelopingOthersScores,
} from '../controllers/dimensionController';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

router.get('/code', checkSubscription, getTeamCode);
router.get('/members', checkSubscription, getTeamMembers);
router.post('/members', checkSubscription, addTeamMember);
router.put('/members/:memberIndex', checkSubscription, updateTeamMember);
router.delete('/members/:memberIndex', checkSubscription, deleteTeamMember);

// Dimension Weights
router.get('/dimension-weights', checkSubscription, getDimensionWeights);
router.put('/dimension-weights', checkSubscription, updateDimensionWeights);

// Functional Dimension (KRA)
router.post('/members/:memberIndex/kras', checkSubscription, addKRA);
router.put('/members/:memberIndex/kras/:kraIndex', checkSubscription, updateKRA);
router.delete('/members/:memberIndex/kras/:kraIndex', checkSubscription, deleteKRA);
router.post('/members/:memberIndex/kras/:kraIndex/lock', checkSubscription, lockKRAScores);

// Organizational Dimension
router.post('/members/:memberIndex/organizational', checkSubscription, addOrganizational);
router.put('/members/:memberIndex/organizational/:dimensionIndex', checkSubscription, updateOrganizational);
router.post('/members/:memberIndex/organizational/:dimensionIndex/lock', checkSubscription, lockOrganizationalScores);

// Self Development
router.post('/members/:memberIndex/self-development', checkSubscription, addSelfDevelopment);
router.put('/members/:memberIndex/self-development/:developmentIndex', checkSubscription, updateSelfDevelopment);
router.post('/members/:memberIndex/self-development/:developmentIndex/lock', checkSubscription, lockSelfDevelopmentScores);

// Developing Others
router.post('/members/:memberIndex/developing-others', checkSubscription, addDevelopingOthers);
router.put('/members/:memberIndex/developing-others/:developingIndex', checkSubscription, updateDevelopingOthers);
router.post('/members/:memberIndex/developing-others/:developingIndex/lock', checkSubscription, lockDevelopingOthersScores);

export default router;
