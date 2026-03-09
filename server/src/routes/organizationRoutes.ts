import { Router } from 'express';
import {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  assignReviewer,
  createClientAdmin,
  getClientAdmins,
  getAdminAnalytics,
  getOrganizationDimensionWeights,
  updateOrganizationDimensionWeights,
  resolveOrgCode,
  getMyOrganization,
} from '../controllers/organizationController';

const router = Router();

// Platform Admin routes
router.post('/', createOrganization);
router.get('/', getAllOrganizations);
router.get('/analytics', getAdminAnalytics);
// Specific routes must come before parameterized routes
router.get('/resolve', resolveOrgCode);
router.get('/me', getMyOrganization);
router.post('/client-admins', createClientAdmin);
router.get('/client-admins', getClientAdmins);
// Dimension weights routes (must come before /:id)
router.get('/dimension-weights', getOrganizationDimensionWeights);
router.put('/dimension-weights', updateOrganizationDimensionWeights);
router.get('/:id', getOrganizationById);
router.put('/:id', updateOrganization);
router.delete('/:id', deleteOrganization);
router.post('/:id/assign-reviewer', assignReviewer);

export default router;

