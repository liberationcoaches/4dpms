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
  checkUser,
  getInviteInfo,
  acceptInvite,
  joinWithCode,
  testEmail,
  verifyEmail,
  resendVerification,
} from '../controllers/authController';
import { setAccessCode } from '../controllers/accessCodeController';
import { joinTeamByCode } from '../controllers/teamController';

const router = Router();

router.post('/signup', signUp);
router.post('/signup-with-invite', signupWithInvite);
router.post('/signup-with-org', signupWithOrg);
router.get('/check-user', checkUser);
router.get('/invite-info', getInviteInfo);
router.post('/accept-invite', acceptInvite);
router.post('/join-with-code', joinWithCode);
router.post('/login', login);
router.post('/set-password', setPassword);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/verify-otp', verifyOTP);
router.post('/verify-otp/mobile', verifySingleOTPEndpoint);
router.post('/resend-otp/mobile', resendOTP);
router.post('/access-code', setAccessCode);
router.post('/team-code', joinTeamByCode);
router.get('/test-email', testEmail);

export default router;

