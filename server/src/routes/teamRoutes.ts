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

const router = Router();

router.get('/code', getTeamCode);
router.get('/members', getTeamMembers);
router.post('/members', addTeamMember);
router.put('/members/:memberIndex', updateTeamMember);
router.delete('/members/:memberIndex', deleteTeamMember);

// Dimension Weights
router.get('/dimension-weights', getDimensionWeights);
router.put('/dimension-weights', updateDimensionWeights);

// Functional Dimension (KRA)
router.post('/members/:memberIndex/kras', addKRA);
router.put('/members/:memberIndex/kras/:kraIndex', updateKRA);
router.delete('/members/:memberIndex/kras/:kraIndex', deleteKRA);
router.post('/members/:memberIndex/kras/:kraIndex/lock', lockKRAScores); // Finalize/lock scores

// Organizational Dimension
router.post('/members/:memberIndex/organizational', addOrganizational);
router.put('/members/:memberIndex/organizational/:dimensionIndex', updateOrganizational);
router.post('/members/:memberIndex/organizational/:dimensionIndex/lock', lockOrganizationalScores);

// Self Development
router.post('/members/:memberIndex/self-development', addSelfDevelopment);
router.put('/members/:memberIndex/self-development/:developmentIndex', updateSelfDevelopment);
router.post('/members/:memberIndex/self-development/:developmentIndex/lock', lockSelfDevelopmentScores);

// Developing Others
router.post('/members/:memberIndex/developing-others', addDevelopingOthers);
router.put('/members/:memberIndex/developing-others/:developingIndex', updateDevelopingOthers);
router.post('/members/:memberIndex/developing-others/:developingIndex/lock', lockDevelopingOthersScores);

export default router;

