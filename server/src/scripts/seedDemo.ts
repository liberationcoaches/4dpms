/**
 * LCPL Demo Seed Script
 * Creates a clean demo org with realistic data for presentation
 *
 * Run with: npm run seed:demo (from server/) or npx tsx src/scripts/seedDemo.ts
 *
 * WARNING: Clears ALL existing data before seeding
 */

import crypto from 'crypto';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { Feedback } from '../models/Feedback';
import { Notification } from '../models/Notification';
import { ReviewCycle } from '../models/ReviewCycle';
import dotenv from 'dotenv';

dotenv.config();

async function seedDemo() {
  try {
    await connectDatabase();

    // Hash access code (matches authController: SHA-256)
    const hashedCode = crypto.createHash('sha256').update('1234').digest('hex');

    // ─────────────────────────────────────────
    // STEP 1 — CLEAR EVERYTHING
    // ─────────────────────────────────────────
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Team.deleteMany({});
    await Feedback.deleteMany({});
    await Notification.deleteMany({});
    await ReviewCycle.deleteMany({});

    // ─────────────────────────────────────────
    // STEP 2 — CREATE PLATFORM ADMIN (LCPL)
    // ─────────────────────────────────────────
    await User.create({
      name: 'LCPL Admin',
      email: 'admin@lcpl.com',
      mobile: '9000000001',
      role: 'platform_admin',
      hierarchyLevel: 0,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
      accessCode: hashedCode,
      designation: 'Platform Administrator',
    });

    // ─────────────────────────────────────────
    // STEP 3 — CREATE ORGANIZATION
    // ─────────────────────────────────────────
    const org = await Organization.create({
      name: 'Acme Technologies',
      code: 'ACME01',
      type: 'Private',
      employeeSize: '50-200',
      subscriptionStatus: 'active',
      dimensionWeights: {
        functional: 60,
        organizational: 20,
        selfDevelopment: 10,
        developingOthers: 10,
      },
    });

    console.log(`✅ Organization created: ${org.name} (${org.code})`);

    // ─────────────────────────────────────────
    // STEP 4 — CREATE ORG ADMIN
    // ─────────────────────────────────────────
    const orgAdmin = await User.create({
      name: 'Priya Sharma',
      email: 'priya@acme.com',
      mobile: '9000000002',
      role: 'org_admin',
      hierarchyLevel: 0.5,
      organizationId: org._id,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
      accessCode: hashedCode,
      designation: 'HR Director',
      aboutMe: 'Managing people operations at Acme Technologies',
    });

    // Update org with admin
    await Organization.findByIdAndUpdate(org._id, {
      clientAdminId: orgAdmin._id,
    });

    // ─────────────────────────────────────────
    // STEP 5 — CREATE EXECUTIVE (top of tree)
    // ─────────────────────────────────────────
    const executive = await User.create({
      name: 'Rahul Mehta',
      email: 'rahul@acme.com',
      mobile: '9000000003',
      role: 'boss',
      hierarchyLevel: 1,
      organizationId: org._id,
      reportsTo: null, // Top of the tree
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
      accessCode: hashedCode,
      designation: 'VP of Engineering',
      aboutMe: 'Leading engineering at Acme',
    });

    // ─────────────────────────────────────────
    // STEP 6 — CREATE 2 MANAGERS
    // ─────────────────────────────────────────
    const manager1 = await User.create({
      name: 'Sneha Patel',
      email: 'sneha@acme.com',
      mobile: '9000000004',
      role: 'manager',
      hierarchyLevel: 2,
      organizationId: org._id,
      reportsTo: executive._id,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
      accessCode: hashedCode,
      designation: 'Engineering Manager',
    });

    const manager2 = await User.create({
      name: 'Arjun Kapoor',
      email: 'arjun@acme.com',
      mobile: '9000000005',
      role: 'manager',
      hierarchyLevel: 2,
      organizationId: org._id,
      reportsTo: executive._id,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
      accessCode: hashedCode,
      designation: 'Product Manager',
    });

    // ─────────────────────────────────────────
    // STEP 7 — CREATE 4 EMPLOYEES
    // ─────────────────────────────────────────
    const emp1 = await User.create({
      name: 'Amit Singh',
      email: 'amit@acme.com',
      mobile: '9000000006',
      role: 'employee',
      hierarchyLevel: 3,
      organizationId: org._id,
      reportsTo: manager1._id,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
      accessCode: hashedCode,
      designation: 'Senior Developer',
    });

    const emp2 = await User.create({
      name: 'Kavya Reddy',
      email: 'kavya@acme.com',
      mobile: '9000000007',
      role: 'employee',
      hierarchyLevel: 3,
      organizationId: org._id,
      reportsTo: manager1._id,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
      accessCode: hashedCode,
      designation: 'Frontend Developer',
    });

    const emp3 = await User.create({
      name: 'Rohan Desai',
      email: 'rohan@acme.com',
      mobile: '9000000008',
      role: 'employee',
      hierarchyLevel: 3,
      organizationId: org._id,
      reportsTo: manager2._id,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
      accessCode: hashedCode,
      designation: 'Product Designer',
    });

    const emp4 = await User.create({
      name: 'Meera Nair',
      email: 'meera@acme.com',
      mobile: '9000000009',
      role: 'employee',
      hierarchyLevel: 3,
      organizationId: org._id,
      reportsTo: manager2._id,
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 4,
      accessCode: hashedCode,
      designation: 'Business Analyst',
    });

    console.log('✅ Users created');

    // ─────────────────────────────────────────
    // STEP 8 — CREATE TEAM WITH KRA DATA
    // ─────────────────────────────────────────
    await Team.create({
      name: 'Engineering Team',
      code: 'ENGR01',
      members: [
        manager1._id,
        manager2._id,
        emp1._id,
        emp2._id,
        emp3._id,
        emp4._id,
      ],
      createdBy: orgAdmin._id,
      dimensionWeights: {
        functional: 60,
        organizational: 20,
        selfDevelopment: 10,
        developingOthers: 10,
      },
      membersDetails: [
        // ── Sneha (Manager 1) ──
        {
          name: manager1.name,
          role: manager1.designation,
          mobile: manager1.mobile,
          kraStatus: 'active',
          kraStatusUpdatedAt: new Date(),
          empDepartment: 'Engineering',
          empReviewYear: '2024-25',
          dimensionWeights: {
            functional: 60,
            organizational: 20,
            selfDevelopment: 10,
            developingOthers: 10,
          },
          functionalKRAs: [
            {
              kra: 'Deliver Q3 backend infrastructure upgrade',
              kpis: [
                { kpi: 'Reduce API response time', target: 'Under 200ms' },
                { kpi: 'Zero downtime deployments', target: '100%' },
              ],
              pilotWeight: 100,
              pilotScore: 3.5,
              r1Weight: 100,
              r1Score: 4.0,
              r1ActualPerf: 'Achieved 180ms avg response time',
              averageScore: 3.75,
              editCount: 1,
              isScoreLocked: false,
            },
            {
              kra: 'Mentor junior developers',
              kpis: [
                { kpi: 'Weekly 1-on-1 sessions', target: '4 per month' },
                { kpi: 'Code review turnaround', target: 'Within 24hrs' },
              ],
              pilotWeight: 100,
              pilotScore: 4.0,
              r1Weight: 100,
              r1Score: 4.5,
              averageScore: 4.25,
              editCount: 0,
              isScoreLocked: false,
            },
          ],
          organizationalKRAs: [
            {
              coreValues: 'Innovation',
              r1Score: 4.0,
              r1CriticalIncident: 'Proposed new CI/CD pipeline that saved 2hrs per deploy',
              averageScore: 4.0,
            },
            {
              coreValues: 'Collaboration',
              r1Score: 4.5,
              r1CriticalIncident: 'Led cross-team knowledge sharing sessions',
              averageScore: 4.5,
            },
          ],
          selfDevelopmentKRAs: [
            {
              areaOfConcern: 'System Design Skills',
              actionPlanInitiative: 'Complete system design course + apply in projects',
              pilotScore: 3.0,
              pilotReason: 'Started the course',
              r1Score: 4.0,
              r1Reason: 'Completed course, applied in 2 real projects',
              averageScore: 3.5,
            },
          ],
          developingOthersKRAs: [
            {
              person: 'Amit Singh',
              areaOfDevelopment: 'Backend performance optimization',
              pilotScore: 3.0,
              pilotReason: 'Needs guidance on query optimization',
              r1Score: 3.5,
              r1Reason: 'Showing improvement after pair programming sessions',
              averageScore: 3.25,
            },
          ],
        },
        // ── Amit (Employee 1) — KRAs in draft ──
        {
          name: emp1.name,
          role: emp1.designation,
          mobile: emp1.mobile,
          kraStatus: 'pending_approval',
          kraStatusUpdatedAt: new Date(),
          empDepartment: 'Engineering',
          empReviewYear: '2024-25',
          dimensionWeights: {
            functional: 70,
            organizational: 15,
            selfDevelopment: 15,
            developingOthers: 0,
          },
          functionalKRAs: [
            {
              kra: 'Refactor authentication module',
              kpis: [
                { kpi: 'Test coverage', target: '90%+' },
                { kpi: 'Bug reduction', target: '50% fewer auth bugs' },
              ],
              pilotWeight: 60,
              pilotScore: 3.0,
              averageScore: 3.0,
              editCount: 0,
              isScoreLocked: false,
            },
            {
              kra: 'Build real-time notification system',
              kpis: [
                { kpi: 'Delivery latency', target: 'Under 1 second' },
                { kpi: 'System uptime', target: '99.9%' },
              ],
              pilotWeight: 40,
              pilotScore: 2.5,
              averageScore: 2.5,
              editCount: 0,
              isScoreLocked: false,
            },
          ],
          selfDevelopmentKRAs: [
            {
              areaOfConcern: 'Cloud Architecture',
              actionPlanInitiative: 'Get AWS Solutions Architect certification',
              pilotScore: 2.5,
              pilotReason: 'Just started studying',
              averageScore: 2.5,
            },
          ],
        },
        // ── Kavya (Employee 2) — active KRAs ──
        {
          name: emp2.name,
          role: emp2.designation,
          mobile: emp2.mobile,
          kraStatus: 'active',
          kraStatusUpdatedAt: new Date(),
          empDepartment: 'Engineering',
          empReviewYear: '2024-25',
          dimensionWeights: {
            functional: 70,
            organizational: 15,
            selfDevelopment: 15,
            developingOthers: 0,
          },
          functionalKRAs: [
            {
              kra: 'Redesign component library',
              kpis: [
                { kpi: 'Components delivered', target: '20 reusable components' },
                { kpi: 'Load time improvement', target: '30% faster' },
              ],
              pilotWeight: 100,
              pilotScore: 4.2,
              r1Weight: 100,
              r1Score: 4.5,
              averageScore: 4.35,
              editCount: 1,
              isScoreLocked: false,
            },
          ],
          selfDevelopmentKRAs: [
            {
              areaOfConcern: 'React Performance Optimization',
              actionPlanInitiative: 'Study and apply React profiling tools',
              pilotScore: 4.0,
              pilotReason: 'Already familiar, deepening knowledge',
              r1Score: 4.5,
              r1Reason: 'Applied memo and lazy loading across 5 components',
              averageScore: 4.25,
            },
          ],
        },
      ],
    });

    console.log('✅ Team created with KRA data');

    // ─────────────────────────────────────────
    // STEP 9 — CREATE REVIEW CYCLE
    // ─────────────────────────────────────────
    await ReviewCycle.create({
      organizationId: org._id,
      frequency: 'quarterly',
      startDate: new Date('2024-04-01'),
      nextReviewDate: new Date('2024-10-01'),
      currentReviewPeriod: 1,
      isActive: true,
      r1Date: new Date('2024-07-01'),
      r2Date: new Date('2024-10-01'),
      r3Date: new Date('2025-01-01'),
      r4Date: new Date('2025-04-01'),
    });

    console.log('✅ Review cycle created');

    // ─────────────────────────────────────────
    // STEP 10 — CREATE SAMPLE FEEDBACK
    // ─────────────────────────────────────────
    await Feedback.create([
      {
        employeeId: emp1._id,
        addedBy: manager1._id,
        type: 'mid_cycle_note',
        content: 'Amit is showing great progress on the auth refactor. The code quality has improved significantly this quarter.',
        reviewPeriod: 1,
        isPrivate: false,
      },
      {
        employeeId: emp1._id,
        addedBy: executive._id,
        type: 'positive',
        content: 'Great initiative in proposing the new notification architecture. Keep pushing the technical boundaries.',
        reviewPeriod: 1,
        isPrivate: false,
      },
      {
        employeeId: emp2._id,
        addedBy: manager1._id,
        type: 'positive',
        content: "Kavya's component library work is exceptional. The team productivity has visibly improved.",
        reviewPeriod: 1,
        isPrivate: false,
      },
    ]);

    console.log('✅ Feedback created');

    // ─────────────────────────────────────────
    // STEP 11 — CREATE SAMPLE NOTIFICATIONS
    // ─────────────────────────────────────────
    await Notification.create([
      {
        userId: emp1._id,
        type: 'info',
        title: 'KRA Review Pending',
        message: 'Your KRAs are pending approval from Sneha Patel.',
        isRead: false,
      },
      {
        userId: manager1._id,
        type: 'review_period_start',
        title: 'R1 Review Period Started',
        message: 'Q1 review period is now active. Please score your team members.',
        isRead: false,
      },
      {
        userId: emp2._id,
        type: 'success',
        title: 'KRAs Approved',
        message: 'Your KRAs have been approved by Sneha Patel. Good luck this quarter!',
        isRead: true,
      },
    ]);

    console.log('✅ Notifications created');

    // ─────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────
    console.log('\n═══════════════════════════════════════');
    console.log('✅ DEMO SEED COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log('\n📋 LOGIN CREDENTIALS (all use accessCode: 1234)');
    console.log('─────────────────────────────────────────');
    console.log('PLATFORM ADMIN');
    console.log('  Email:  admin@lcpl.com');
    console.log('  Mobile: 9000000001');
    console.log('\nORG ADMIN');
    console.log('  Email:  priya@acme.com');
    console.log('  Mobile: 9000000002');
    console.log('\nEXECUTIVE (Boss — sees full tree)');
    console.log('  Email:  rahul@acme.com');
    console.log('  Mobile: 9000000003');
    console.log('\nMANAGER 1 (Sneha — 2 direct reports)');
    console.log('  Email:  sneha@acme.com');
    console.log('  Mobile: 9000000004');
    console.log('\nMANAGER 2 (Arjun — 2 direct reports)');
    console.log('  Email:  arjun@acme.com');
    console.log('  Mobile: 9000000005');
    console.log('\nEMPLOYEE 1 (Amit — KRAs pending approval)');
    console.log('  Email:  amit@acme.com');
    console.log('  Mobile: 9000000006');
    console.log('\nEMPLOYEE 2 (Kavya — KRAs active)');
    console.log('  Email:  kavya@acme.com');
    console.log('  Mobile: 9000000007');
    console.log('\nEMPLOYEE 3 (Rohan — under Arjun)');
    console.log('  Email:  rohan@acme.com');
    console.log('  Mobile: 9000000008');
    console.log('\nEMPLOYEE 4 (Meera — under Arjun)');
    console.log('  Email:  meera@acme.com');
    console.log('  Mobile: 9000000009');
    console.log('\n🏢 ORG STRUCTURE');
    console.log('─────────────────────────────────────────');
    console.log('Rahul (Executive/VP)');
    console.log('  ├── Sneha (Manager)');
    console.log('  │     ├── Amit (Developer) ← KRAs pending approval');
    console.log('  │     └── Kavya (Developer) ← KRAs active');
    console.log('  └── Arjun (Manager)');
    console.log('        ├── Rohan (Designer)');
    console.log('        └── Meera (Analyst)');
    console.log('\n🎯 DEMO SCENARIOS');
    console.log('─────────────────────────────────────────');
    console.log("1. Login as Amit → see KRAs in pending_approval state");
    console.log("2. Login as Sneha → approve Amit's KRAs in My Team tab");
    console.log('3. Login as Rahul → see full org tree with all scores');
    console.log('4. Login as Priya (Org Admin) → manage org, add new person');
    console.log('5. Login as admin@lcpl.com → platform admin view');
    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

seedDemo();
