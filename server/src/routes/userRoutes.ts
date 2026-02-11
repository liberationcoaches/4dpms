import { Router } from 'express';
import { getProfile, updateProfile, listUsers, fixUserRoles, getUserByEmail, downloadPersonalReport } from '../controllers/userController';

const router = Router();

router.get('/profile', getProfile);
router.get('/', getUserByEmail); // Get user by email query param
router.get('/list', listUsers);
router.get('/my-report', downloadPersonalReport); // Personal PDF report download
router.post('/fix-roles', fixUserRoles);
router.put('/profile', updateProfile);

export default router;

