import { Router } from 'express';
import {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  assignReviewer,
  createClientAdmin,
  getClientAdmins,
  getAdminAnalytics,
} from '../controllers/organizationController';

const router = Router();

// Platform Admin routes
router.post('/', createOrganization);
router.get('/', getAllOrganizations);
router.get('/analytics', getAdminAnalytics);
// Specific routes must come before parameterized routes
router.post('/client-admins', createClientAdmin);
router.get('/client-admins', getClientAdmins);
router.get('/:id', getOrganizationById);
router.put('/:id', updateOrganization);
router.post('/:id/assign-reviewer', assignReviewer);

export default router;

