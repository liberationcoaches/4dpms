import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

