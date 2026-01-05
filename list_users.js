const mongoose = require('mongoose');
require('dotenv').config();

// User Schema (simplified for this script)
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  companyName: String,
  industry: String,
  isEmailVerified: Boolean,
  isMobileVerified: Boolean,
  isActive: Boolean,
  accessCode: String,
  useFingerprint: Boolean,
  teamId: mongoose.Schema.Types.ObjectId,
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'admin',
  },
}, {
  timestamps: true,
});

const User = mongoose.model('User', UserSchema);

async function listUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/performance-management';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get all admins
    const admins = await User.find({ role: 'admin' }).select('-accessCode').lean();
    console.log('='.repeat(80));
    console.log('ADMINS:');
    console.log('='.repeat(80));
    if (admins.length === 0) {
      console.log('No admins found.');
    } else {
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Mobile: ${admin.mobile}`);
        console.log(`   Company: ${admin.companyName || 'N/A'}`);
        console.log(`   Industry: ${admin.industry || 'N/A'}`);
        console.log(`   User ID: ${admin._id}`);
        console.log(`   Created: ${admin.createdAt}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('MEMBERS:');
    console.log('='.repeat(80));
    
    // Get all members
    const members = await User.find({ role: 'member' }).select('-accessCode').lean();
    if (members.length === 0) {
      console.log('No members found.');
    } else {
      members.forEach((member, index) => {
        console.log(`\n${index + 1}. ${member.name}`);
        console.log(`   Email: ${member.email}`);
        console.log(`   Mobile: ${member.mobile}`);
        console.log(`   Company: ${member.companyName || 'N/A'}`);
        console.log(`   Industry: ${member.industry || 'N/A'}`);
        console.log(`   User ID: ${member._id}`);
        console.log(`   Created: ${member.createdAt}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`SUMMARY: ${admins.length} Admin(s), ${members.length} Member(s)`);
    console.log('='.repeat(80));

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();

