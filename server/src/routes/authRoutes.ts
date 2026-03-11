import { Router } from 'express';
import {
  signUp,
  signupWithInvite,
  signupWithOrg,
  verifyOTP,
  verifySingleOTPEndpoint,
  resendOTP,
  login,
  setPassword,
  testEmail,
} from '../controllers/authController';
import { setAccessCode } from '../controllers/accessCodeController';
import { joinTeamByCode } from '../controllers/teamController';

const router = Router();

router.post('/signup', signUp);
router.post('/signup-with-invite', signupWithInvite);
router.post('/signup-with-org', signupWithOrg);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/verify-otp/mobile', verifySingleOTPEndpoint);
router.post('/resend-otp/mobile', resendOTP);
router.post('/access-code', setAccessCode);
router.post('/team-code', joinTeamByCode);
router.post('/set-password', setPassword);
router.get('/test-email', testEmail);

export default router;

