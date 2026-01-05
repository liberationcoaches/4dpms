import { Router } from 'express';
import { getTeamCode, getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember, getDimensionWeights, updateDimensionWeights } from '../controllers/teamController';
import { addKRA, updateKRA, deleteKRA } from '../controllers/kraController';
import {
  addOrganizational,
  updateOrganizational,
  addSelfDevelopment,
  updateSelfDevelopment,
  addDevelopingOthers,
  updateDevelopingOthers,
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

// Organizational Dimension
router.post('/members/:memberIndex/organizational', addOrganizational);
router.put('/members/:memberIndex/organizational/:dimensionIndex', updateOrganizational);

// Self Development
router.post('/members/:memberIndex/self-development', addSelfDevelopment);
router.put('/members/:memberIndex/self-development/:developmentIndex', updateSelfDevelopment);

// Developing Others
router.post('/members/:memberIndex/developing-others', addDevelopingOthers);
router.put('/members/:memberIndex/developing-others/:developingIndex', updateDevelopingOthers);

export default router;

