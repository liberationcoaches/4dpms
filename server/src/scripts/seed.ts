import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { OTP } from '../models/OTP';
import usersFixture from '../fixtures/users.fixture.json';
import { generateOTP, calculateOTPExpiry } from '../utils/otpService';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  try {
    await connectDatabase();

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await OTP.deleteMany({});

    console.log('Seeding users...');
    const users = await User.insertMany(usersFixture);

    console.log('Generating OTPs for unverified users...');
    const otps = [];
    for (const user of users) {
      if (!user.isEmailVerified) {
        const emailOTP = generateOTP();
        otps.push({
          identifier: user.email,
          type: 'email' as const,
          otp: emailOTP,
          expiresAt: calculateOTPExpiry(),
          attempts: 0,
          isUsed: false,
        });
      }
      if (!user.isMobileVerified) {
        const mobileOTP = generateOTP();
        otps.push({
          identifier: user.mobile,
          type: 'mobile' as const,
          otp: mobileOTP,
          expiresAt: calculateOTPExpiry(),
          attempts: 0,
          isUsed: false,
        });
      }
    }

    if (otps.length > 0) {
      await OTP.insertMany(otps);
    }

    console.log(`✅ Seeded ${users.length} users`);
    console.log(`✅ Generated ${otps.length} OTPs`);
    console.log('\nSample login credentials:');
    console.log('Email: john.doe@example.com');
    console.log('Mobile: 9876543210');
    console.log('\n✅ Seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

seed();
