import request from 'supertest';
import express, { Express } from 'express';
import mongoose from 'mongoose';
import authRoutes from '../../routes/authRoutes';
import { errorHandler } from '../../middleware/errorHandler';
import { User } from '../../models/User';
import { OTP } from '../../models/OTP';
import { connectDatabase, disconnectDatabase } from '../../config/database';

let app: Express;

beforeAll(async () => {
  await connectDatabase();
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
});

afterAll(async () => {
  await User.deleteMany({});
  await OTP.deleteMany({});
  await disconnectDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
  await OTP.deleteMany({});
});

describe('POST /api/auth/signup', () => {
  it('should create a new user and generate OTPs', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        mobile: '1234567890',
        companyName: 'Test Company',
        industry: 'Technology',
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data.email).toBe('test@example.com');
    expect(response.body.data.mobile).toBe('1234567890');

    // Verify user was created
    const user = await User.findOne({ email: 'test@example.com' });
    expect(user).toBeTruthy();
    expect(user?.isEmailVerified).toBe(false);
    expect(user?.isMobileVerified).toBe(false);
  });

  it('should reject duplicate email', async () => {
    await User.create({
      name: 'Existing User',
      email: 'existing@example.com',
      mobile: '9876543210',
      companyName: 'Existing Company',
      industry: 'Technology',
    });

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'New User',
        email: 'existing@example.com',
        mobile: '1111111111',
        companyName: 'New Company',
        industry: 'Healthcare',
      });

    expect(response.status).toBe(500);
  });

  it('should validate required fields', async () => {
    const response = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      // Missing other fields
    });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('error');
  });
});

describe('POST /api/auth/verify-otp', () => {
  let testUser: any;
  let emailOTP: string;
  let mobileOTP: string;

  beforeEach(async () => {
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      mobile: '1234567890',
      companyName: 'Test Company',
      industry: 'Technology',
    });

    emailOTP = '123456';
    mobileOTP = '654321';

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.create({
      identifier: testUser.email,
      type: 'email',
      otp: emailOTP,
      expiresAt,
    });
    await OTP.create({
      identifier: testUser.mobile,
      type: 'mobile',
      otp: mobileOTP,
      expiresAt,
    });
  });

  it('should verify both OTPs and activate user', async () => {
    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: testUser.email,
        mobile: testUser.mobile,
        emailOTP,
        mobileOTP,
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');

    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser?.isEmailVerified).toBe(true);
    expect(updatedUser?.isMobileVerified).toBe(true);
  });

  it('should reject invalid OTP', async () => {
    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: testUser.email,
        mobile: testUser.mobile,
        emailOTP: '000000',
        mobileOTP: '000000',
      });

    expect(response.status).toBe(500);
  });
});

describe('POST /api/auth/resend-otp/:type', () => {
  beforeEach(async () => {
    await User.create({
      name: 'Test User',
      email: 'test@example.com',
      mobile: '1234567890',
      companyName: 'Test Company',
      industry: 'Technology',
    });
  });

  it('should resend email OTP', async () => {
    const response = await request(app)
      .post('/api/auth/resend-otp/email')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });

  it('should resend mobile OTP', async () => {
    const response = await request(app)
      .post('/api/auth/resend-otp/mobile')
      .send({ mobile: '1234567890' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });
});

