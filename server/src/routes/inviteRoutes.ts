import { Router } from 'express';
import { createInvite, resolveInvite } from '../controllers/inviteController';

const router = Router();

router.post('/', createInvite);
router.get('/resolve', resolveInvite);

export default router;
