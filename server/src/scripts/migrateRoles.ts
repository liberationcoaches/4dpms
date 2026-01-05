/**
 * Migration script to update user roles from old system to new system:
 * - 'admin' -> 'manager'
 * - 'member' -> 'employee'
 * 
 * Run with: npx ts-node server/src/scripts/migrateRoles.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';

dotenv.config();

async function migrateRoles() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lcpl';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all users with old roles
    const adminUsers = await User.find({ role: 'admin' });
    const memberUsers = await User.find({ role: 'member' });

    console.log(`Found ${adminUsers.length} users with 'admin' role`);
    console.log(`Found ${memberUsers.length} users with 'member' role`);

    let adminsMigrated = 0;
    let membersMigrated = 0;
    let errors: string[] = [];

    // Migrate admin to manager
    for (const user of adminUsers) {
      try {
        user.role = 'manager';
        await user.save();
        adminsMigrated++;
        console.log(`Migrated user ${user.name} (${user.email}) from 'admin' to 'manager'`);
      } catch (error: any) {
        errors.push(`Failed to migrate admin user ${user.name} (${user.email}): ${error.message}`);
        console.error(`Error migrating admin user ${user.name}:`, error);
      }
    }

    // Migrate member to employee
    for (const user of memberUsers) {
      try {
        user.role = 'employee';
        await user.save();
        membersMigrated++;
        console.log(`Migrated user ${user.name} (${user.email}) from 'member' to 'employee'`);
      } catch (error: any) {
        errors.push(`Failed to migrate member user ${user.name} (${user.email}): ${error.message}`);
        console.error(`Error migrating member user ${user.name}:`, error);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Admins migrated to managers: ${adminsMigrated}/${adminUsers.length}`);
    console.log(`Members migrated to employees: ${membersMigrated}/${memberUsers.length}`);
    
    if (errors.length > 0) {
      console.log(`\nErrors encountered: ${errors.length}`);
      errors.forEach((error) => console.error(error));
    }

    // Verify migration
    const remainingAdmins = await User.countDocuments({ role: 'admin' });
    const remainingMembers = await User.countDocuments({ role: 'member' });
    
    if (remainingAdmins > 0 || remainingMembers > 0) {
      console.log(`\n⚠️  Warning: ${remainingAdmins} users still have 'admin' role, ${remainingMembers} users still have 'member' role`);
    } else {
      console.log('\n✅ Migration completed successfully! All old roles have been migrated.');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateRoles();

