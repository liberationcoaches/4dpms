import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Team } from '../models/Team';

dotenv.config({ path: '.env' });

async function fixUserRoles() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/performance-management';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get all users
    const allUsers = await User.find({}).select('+accessCode').lean();
    console.log(`Found ${allUsers.length} total users\n`);

    let adminsFixed = 0;
    let membersFixed = 0;
    let unchanged = 0;

    for (const user of allUsers) {
      const userObj = await User.findById(user._id);
      if (!userObj) continue;

      // Check if user has accessCode (signed up) - should be platform_admin
      if (userObj.accessCode) {
        if (userObj.role !== 'platform_admin') {
          userObj.role = 'platform_admin';
          await userObj.save();
          console.log(`✓ Fixed: ${userObj.name} (${userObj.email}) -> PLATFORM_ADMIN (has accessCode)`);
          adminsFixed++;
        } else {
          unchanged++;
        }
      } else {
        // User doesn't have accessCode - check if they're a team member
        if (userObj.teamId) {
          const team = await Team.findById(userObj.teamId);
          if (team) {
            // Check if user is the team creator
            if (team.createdBy && team.createdBy.toString() === userObj._id.toString()) {
            // Team creator should be platform_admin (they might not have set accessCode yet)
            if (userObj.role !== 'platform_admin') {
              userObj.role = 'platform_admin';
                await userObj.save();
                console.log(`✓ Fixed: ${userObj.name} (${userObj.email}) -> PLATFORM_ADMIN (team creator)`);
                adminsFixed++;
              } else {
                unchanged++;
              }
            } else {
              // User is in a team but not the creator - should be employee
              if (userObj.role !== 'employee') {
                userObj.role = 'employee';
                await userObj.save();
                console.log(`✓ Fixed: ${userObj.name} (${userObj.email}) -> EMPLOYEE (team member)`);
                membersFixed++;
              } else {
                unchanged++;
              }
            }
          } else {
            // Has teamId but team doesn't exist - set to employee
            if (userObj.role !== 'employee') {
              userObj.role = 'employee';
              await userObj.save();
              console.log(`✓ Fixed: ${userObj.name} (${userObj.email}) -> EMPLOYEE (orphaned teamId)`);
              membersFixed++;
            } else {
              unchanged++;
            }
          }
        } else {
          // No accessCode and no teamId - check if they're in any team's membersDetails
          const teams = await Team.find({ 'membersDetails.mobile': userObj.mobile });
          if (teams.length > 0) {
            // User is in membersDetails - should be employee
            if (userObj.role !== 'employee') {
              userObj.role = 'employee';
              await userObj.save();
              console.log(`✓ Fixed: ${userObj.name} (${userObj.email}) -> EMPLOYEE (in membersDetails)`);
              membersFixed++;
            } else {
              unchanged++;
            }
          } else {
            // No accessCode, no teamId, not in membersDetails - default to platform_admin (might be old user)
            if (userObj.role !== 'platform_admin') {
              userObj.role = 'platform_admin';
              await userObj.save();
              console.log(`✓ Fixed: ${userObj.name} (${userObj.email}) -> PLATFORM_ADMIN (default)`);
              adminsFixed++;
            } else {
              unchanged++;
            }
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Admins fixed: ${adminsFixed}`);
    console.log(`Members fixed: ${membersFixed}`);
    console.log(`Unchanged: ${unchanged}`);
    console.log('='.repeat(80));

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserRoles();

