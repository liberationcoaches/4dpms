import { Router } from 'express';
import {
  signUp,
  verifyOTP,
  verifySingleOTPEndpoint,
  resendOTP,
  login,
  setPassword,
} from '../controllers/authController';
import { setAccessCode } from '../controllers/accessCodeController';
import { joinTeamByCode } from '../controllers/teamController';

const router = Router();

router.post('/signup', signUp);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/verify-otp/mobile', verifySingleOTPEndpoint);
router.post('/resend-otp/mobile', resendOTP);
router.post('/access-code', setAccessCode);
router.post('/team-code', joinTeamByCode);
router.post('/set-password', setPassword);

export default router;

