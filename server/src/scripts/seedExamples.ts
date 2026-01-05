
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { ReviewCycle } from '../models/ReviewCycle';
import { Notification } from '../models/Notification';

dotenv.config();

/**
 * Seed script to populate database with example data
 * This creates the complete example scenario from SYSTEM_EXAMPLES.md
 */

async function seedExamples() {
  try {
    await connectDatabase();
    console.log('Connected to database');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing example data...');
    
    // Delete by email OR mobile to catch all cases
    const exampleEmails = [
      'admin@platform.com',
      'sarah.johnson@reviewer.com',
      'john.smith@techcorp.com',
      'maria.garcia@techcorp.com',
      'alex.chen@techcorp.com',
      'emily.r@techcorp.com',
      'david.kim@techcorp.com',
    ];
    const exampleMobiles = [
      '9999999999',
      '8888888888',
      '7777777777',
      '9876543210',
      '9876543211',
      '9876543212',
      '9876543213',
    ];
    
    await User.deleteMany({
      $or: [
        { email: { $in: exampleEmails } },
        { mobile: { $in: exampleMobiles } },
      ],
    });
    
    // Get user IDs before deletion for notification cleanup
    const usersToDelete = await User.find({
      $or: [
        { email: { $in: exampleEmails } },
        { mobile: { $in: exampleMobiles } },
      ],
    });
    const userIdsToDelete = usersToDelete.map(u => u._id);
    
    // Delete organizations and related data
    const orgs = await Organization.find({ name: 'TechCorp Solutions' });
    const orgIds = orgs.map(org => org._id);
    
    await Organization.deleteMany({ name: 'TechCorp Solutions' });
    if (orgIds.length > 0) {
      await ReviewCycle.deleteMany({ organizationId: { $in: orgIds } });
    }
    await Team.deleteMany({ code: 'TEAM1234' });
    
    // Delete notifications for users being deleted
    if (userIdsToDelete.length > 0) {
      await Notification.deleteMany({ userId: { $in: userIdsToDelete } });
    }

    console.log('Creating example users...');

    // 1. Create Platform Admin
    const platformAdmin = new User({
      name: 'Platform Admin',
      email: 'admin@platform.com',
      mobile: '9999999999',
      role: 'platform_admin',
      hierarchyLevel: 0,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    await platformAdmin.save();
    console.log('✓ Created Platform Admin');

    // 2. Create Reviewer
    const reviewer = new User({
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@reviewer.com',
      mobile: '8888888888',
      role: 'reviewer',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    await reviewer.save();
    console.log('✓ Created Reviewer: Dr. Sarah Johnson');

    // 3. Create Boss
    const boss = new User({
      name: 'John Smith',
      email: 'john.smith@techcorp.com',
      mobile: '7777777777',
      role: 'boss',
      hierarchyLevel: 1,
      companyName: 'TechCorp Solutions',
      industry: 'Technology',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    await boss.save();
    console.log('✓ Created Boss: John Smith');

    // 4. Create Organization
    const organization = new Organization({
      name: 'TechCorp Solutions',
      industry: 'Technology',
      size: 150,
      contact: 'admin@techcorp.com',
      subscriptionStatus: 'trial',
      reviewerId: reviewer._id,
      bossId: boss._id,
    });
    await organization.save();

    // Update boss with organization ID
    boss.organizationId = organization._id;
    await boss.save();
    console.log('✓ Created Organization: TechCorp Solutions');

    // 5. Create Manager
    const manager = new User({
      name: 'Maria Garcia',
      email: 'maria.garcia@techcorp.com',
      mobile: '9876543210',
      role: 'manager',
      hierarchyLevel: 2,
      organizationId: organization._id,
      bossId: boss._id,
      reviewerId: reviewer._id,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    await manager.save();
    console.log('✓ Created Manager: Maria Garcia');

    // 6. Create Employees
    const employees = [
      {
        name: 'Alex Chen',
        email: 'alex.chen@techcorp.com',
        mobile: '9876543211',
        designation: 'Software Developer',
      },
      {
        name: 'Emily Rodriguez',
        email: 'emily.r@techcorp.com',
        mobile: '9876543212',
        designation: 'Senior Developer',
      },
      {
        name: 'David Kim',
        email: 'david.kim@techcorp.com',
        mobile: '9876543213',
        designation: 'Frontend Developer',
      },
    ];

    const createdEmployees = [];
    for (const empData of employees) {
      const employee = new User({
        name: empData.name,
        email: empData.email,
        mobile: empData.mobile,
        role: 'employee',
        hierarchyLevel: 3,
        organizationId: organization._id,
        managerId: manager._id,
        bossId: boss._id,
        reviewerId: reviewer._id,
        isEmailVerified: true,
        isMobileVerified: true,
        isActive: true,
      });
      await employee.save();
      createdEmployees.push({ ...empData, user: employee });
      console.log(`✓ Created Employee: ${empData.name}`);
    }

    // 7. Create Review Cycle
    const reviewCycle = new ReviewCycle({
      organizationId: organization._id,
      frequency: 'quarterly',
      startDate: new Date('2024-01-01'),
      nextReviewDate: new Date('2024-04-01'),
      currentReviewPeriod: 1,
      isActive: true,
    });
    await reviewCycle.save();
    console.log('✓ Created Review Cycle (Quarterly)');

    // 8. Create Team with member details and scores
    const team = new Team({
      name: 'Engineering Team',
      code: 'TEAM1234',
      members: createdEmployees.map((e) => e.user._id),
      createdBy: manager._id,
      membersDetails: [
        {
          name: 'Alex Chen',
          role: 'Software Developer',
          mobile: '9876543211',
          functionalKRAs: [
            {
              kra: 'Feature Development',
              kpiTarget: 'Deliver 5 features per quarter',
              reportsGenerated: '4 features completed',
              r1Weight: 40,
              r1Score: 95,
              r1ActualPerf: 'Excellent work on the new authentication feature. Completed on time with high quality. Showed strong problem-solving skills.',
              averageScore: 95,
            },
            {
              kra: 'Code Quality',
              kpiTarget: 'Maintain 95% code review pass rate',
              reportsGenerated: '98% pass rate achieved',
              r1Weight: 30,
              r1Score: 90,
              r1ActualPerf: 'Code reviews show improvement. Maintains high standards. Fewer review comments compared to previous period.',
              averageScore: 90,
            },
            {
              kra: 'Bug Fixes',
              kpiTarget: 'Fix critical bugs within 24 hours',
              reportsGenerated: 'All bugs fixed within SLA',
              r1Weight: 30,
              r1Score: 92,
              r1ActualPerf: 'Quick response to bug reports. Effective debugging. Good documentation of fixes.',
              averageScore: 92,
            },
          ],
          organizationalKRAs: [
            {
              coreValue: 'Team Collaboration',
              r1Score: 88,
              r1CriticalIncident: 'Actively helped junior developers. Participated well in team meetings.',
              averageScore: 88,
            },
            {
              coreValue: 'Innovation',
              r1Score: 90,
              r1CriticalIncident: 'Proposed new testing framework that improved team productivity.',
              averageScore: 90,
            },
          ],
          selfDevelopmentKRAs: [
            {
              areaOfConcern: 'Advanced React Skills',
              actionPlanInitiative: 'Complete advanced React course',
              r1Score: 85,
              r1Reason: 'Shows initiative in learning. Enrolled in advanced course.',
              averageScore: 85,
            },
          ],
          developingOthersKRAs: [
            {
              person: 'Junior Developer - Mike',
              areaOfDevelopment: 'Code Review Best Practices',
              r1Score: 87,
              r1Reason: 'Provided guidance on code review best practices. Helpful mentor.',
              averageScore: 87,
            },
          ],
        },
        {
          name: 'Emily Rodriguez',
          role: 'Senior Developer',
          mobile: '9876543212',
          functionalKRAs: [
            {
              kra: 'Feature Development',
              r1Weight: 40,
              r1Score: 89,
              r1ActualPerf: 'Delivered high-quality features. Good leadership in code reviews.',
              averageScore: 89,
            },
            {
              kra: 'Code Quality',
              r1Weight: 30,
              r1Score: 92,
              r1ActualPerf: 'Excellent code quality. Sets good examples for team.',
              averageScore: 92,
            },
            {
              kra: 'Architecture',
              r1Weight: 30,
              r1Score: 88,
              r1ActualPerf: 'Good architectural decisions. Helpful in system design.',
              averageScore: 88,
            },
          ],
          organizationalKRAs: [
            {
              coreValue: 'Leadership',
              r1Score: 91,
              r1CriticalIncident: 'Led sprint planning effectively. Good team coordination.',
              averageScore: 91,
            },
          ],
          selfDevelopmentKRAs: [
            {
              areaOfConcern: 'System Design',
              r1Score: 87,
              r1Reason: 'Attending system design workshops. Making good progress.',
              averageScore: 87,
            },
          ],
          developingOthersKRAs: [
            {
              person: 'Alex Chen',
              r1Score: 90,
              r1Reason: 'Mentored junior developers effectively.',
              averageScore: 90,
            },
          ],
        },
        {
          name: 'David Kim',
          role: 'Frontend Developer',
          mobile: '9876543213',
          functionalKRAs: [
            {
              kra: 'UI Development',
              r1Weight: 50,
              r1Score: 87,
              r1ActualPerf: 'Good UI implementations. Responsive designs work well.',
              averageScore: 87,
            },
            {
              kra: 'Performance Optimization',
              r1Weight: 50,
              r1Score: 85,
              r1ActualPerf: 'Improved page load times. Good optimization work.',
              averageScore: 85,
            },
          ],
          organizationalKRAs: [
            {
              coreValue: 'Quality',
              r1Score: 86,
              r1CriticalIncident: 'Maintains high quality standards in UI work.',
              averageScore: 86,
            },
          ],
          selfDevelopmentKRAs: [
            {
              areaOfConcern: 'Advanced CSS',
              r1Score: 84,
              r1Reason: 'Learning new CSS techniques. Good progress.',
              averageScore: 84,
            },
          ],
        },
      ],
    });
    await team.save();
    console.log('✓ Created Team with member details and scores');

    // 9. Create Sample Notifications
    const notifications = [
      {
        userId: boss._id,
        type: 'review_period_start',
        title: 'Review Period 1 Started',
        message: 'A new review period (Period 1) has started. Please check your dashboard for details.',
        metadata: {
          reviewPeriod: 1,
          organizationId: organization._id.toString(),
        },
        isRead: false,
      },
      {
        userId: manager._id,
        type: 'review_period_start',
        title: 'Review Period 1 Started',
        message: 'A new review period (Period 1) has started. Please check your dashboard for details.',
        metadata: {
          reviewPeriod: 1,
          organizationId: organization._id.toString(),
        },
        isRead: false,
      },
      {
        userId: createdEmployees[0].user._id,
        type: 'review_period_start',
        title: 'Review Period 1 Started',
        message: 'A new review period (Period 1) has started. Please check your dashboard for details.',
        metadata: {
          reviewPeriod: 1,
          organizationId: organization._id.toString(),
        },
        isRead: false,
      },
      {
        userId: createdEmployees[0].user._id,
        type: 'success',
        title: 'Review Completed',
        message: 'Your review for Period 1 has been completed and locked. Check your dashboard to view scores.',
        isRead: false,
      },
    ];

    for (const notifData of notifications) {
      const notification = new Notification(notifData);
      await notification.save();
    }
    console.log('✓ Created Sample Notifications');

    console.log('\n✅ Seed data created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Platform Admin: admin@platform.com`);
    console.log(`   - Reviewer: sarah.johnson@reviewer.com`);
    console.log(`   - Organization: TechCorp Solutions`);
    console.log(`   - Boss: john.smith@techcorp.com`);
    console.log(`   - Manager: maria.garcia@techcorp.com`);
    console.log(`   - Employees: 3 employees created`);
    console.log(`   - Review Cycle: Quarterly (Period 1)`);
    console.log(`   - Team: Engineering Team with scores`);
    console.log(`   - Notifications: 4 notifications created`);

    console.log('\n🔑 User IDs for testing:');
    console.log(`   Platform Admin ID: ${platformAdmin._id}`);
    console.log(`   Reviewer ID: ${reviewer._id}`);
    console.log(`   Boss ID: ${boss._id}`);
    console.log(`   Manager ID: ${manager._id}`);
    console.log(`   Employee IDs: ${createdEmployees.map(e => e.user._id).join(', ')}`);

    console.log('\n📝 To test the system:');
    console.log('   1. Set userId in browser localStorage:');
    console.log(`      localStorage.setItem('userId', '${boss._id}') // For boss view`);
    console.log(`      localStorage.setItem('userId', '${manager._id}') // For manager view`);
    console.log(`      localStorage.setItem('userId', '${createdEmployees[0].user._id}') // For employee view`);
    console.log(`      localStorage.setItem('userId', '${reviewer._id}') // For reviewer view`);
    console.log('   2. Visit /admin/dashboard (use platform admin userId)');
    console.log('   3. Visit /dashboard/boss (use boss userId)');
    console.log('   4. Visit /dashboard/manager (use manager userId)');
    console.log('   5. Visit /dashboard/employee (use employee userId)');
    console.log('   6. Visit /reviewer/dashboard (use reviewer userId)');

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

seedExamples();

