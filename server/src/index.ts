import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: Allow frontend URL when set (e.g. FRONTEND_URL on Railway); otherwise allow all
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  "https://4dpms-production.up.railway.app"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

// Body parsing middleware (MUST be before routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import authRoutes from './routes/authRoutes';
import inviteRoutes from './routes/inviteRoutes';
import userRoutes from './routes/userRoutes';
import teamRoutes from './routes/teamRoutes';
import notificationRoutes from './routes/notificationRoutes';
import organizationRoutes from './routes/organizationRoutes';
import clientAdminRoutes from './routes/clientAdminRoutes';
import bossRoutes from './routes/bossRoutes';
import managerRoutes from './routes/managerRoutes';
import reviewCycleRoutes from './routes/reviewCycleRoutes';
import reviewerRoutes from './routes/reviewerRoutes';
import employeeRoutes from './routes/employeeRoutes';
import memberRoutes from './routes/memberRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import enquiryRoutes from './routes/enquiryRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import orgAdminRoutes from './routes/orgAdminRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/user', userRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/client-admin', clientAdminRoutes);
app.use('/api/boss', bossRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/review-cycles', reviewCycleRoutes);
app.use('/api/reviewer', reviewerRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/enquiry', enquiryRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/org-admin', orgAdminRoutes);

// Error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

