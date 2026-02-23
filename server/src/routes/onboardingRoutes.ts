import { Router } from 'express';
import {
    getOnboardingStatus,
    updateOnboardingStep,
    completeOnboarding,
    savePlanYourGoals,
    getPlanYourGoals,
} from '../controllers/onboardingController';

const router = Router();

router.get('/status', getOnboardingStatus);
router.put('/step', updateOnboardingStep);
router.put('/complete', completeOnboarding);
router.post('/pyg', savePlanYourGoals);
router.get('/pyg', getPlanYourGoals);

export default router;
