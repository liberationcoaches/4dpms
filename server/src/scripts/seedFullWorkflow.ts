import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { generateOrgCode, generateTeamCode } from '../utils/codeGenerator';
import {
  calculateFunctionalAverageScore,
  calculateOrganizationalAverageScore,
  calculateSelfDevelopmentAverageScore,
  calculateDevelopingOthersAverageScore,
} from '../utils/kraCalculations';
import dotenv from 'dotenv';

dotenv.config();

// Helper function to generate unique mobile numbers
let mobileCounter = 9000000000;
function getNextMobile(): string {
  return (mobileCounter++).toString().padStart(10, '0');
}

// Helper function to generate unique emails
function getEmail(name: string, _role: string, index?: number): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  const suffix = index !== undefined ? `${index}` : '';
  return `${cleanName}${suffix}@testworkflow.com`;
}

async function seedFullWorkflow() {
  try {
    await connectDatabase();

    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Team.deleteMany({});

    console.log('🏗️  Creating full workflow structure...\n');

    // ============================================
    // 1. CREATE PLATFORM ADMIN
    // ============================================
    console.log('🔐 Creating Platform Admin...');
    const platformAdmin = new User({
      name: 'Platform Admin',
      email: 'platform.admin@testworkflow.com',
      mobile: getNextMobile(),
      role: 'platform_admin',
      hierarchyLevel: 0,
      companyName: '',
      industry: 'Other',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    await platformAdmin.save();
    console.log(`   ✅ Created Platform Admin: ${platformAdmin.name} (${platformAdmin.email})`);

    // ============================================
    // 2. CREATE REVIEWER
    // ============================================
    console.log('\n📝 Creating Reviewer...');
    const reviewer = new User({
      name: 'Reviewer',
      email: 'reviewer@testworkflow.com',
      mobile: getNextMobile(),
      role: 'reviewer',
      hierarchyLevel: 0,
      companyName: '',
      industry: 'Other',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    await reviewer.save();
    console.log(`   ✅ Created Reviewer: ${reviewer.name} (${reviewer.email})`);

    // ============================================
    // 3. CREATE CSA (Client Side Admin)
    // ============================================
    console.log('\n📋 Creating CSA (Client Side Admin)...');
    const csa = new User({
      name: 'CSA Admin',
      email: 'csa.admin@testworkflow.com',
      mobile: getNextMobile(),
      role: 'client_admin',
      hierarchyLevel: 0.5,
      companyName: 'Test Organization',
      industry: 'Technology',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    await csa.save();
    console.log(`   ✅ Created CSA: ${csa.name} (${csa.email})`);

    // ============================================
    // 4. CREATE OWNER BOSS (The Owner)
    // ============================================
    console.log('\n👑 Creating Owner Boss...');
    const ownerBoss = new User({
      name: 'Owner Boss',
      email: 'owner.boss@testworkflow.com',
      mobile: getNextMobile(),
      role: 'boss',
      hierarchyLevel: 1,
      companyName: 'Test Organization',
      industry: 'Technology',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    await ownerBoss.save();

    const ownerOrg = new Organization({
      name: 'Test Organization',
      code: await generateOrgCode(),
      type: 'Technology',
      employeeSize: '50-100',
      bossId: ownerBoss._id,
      clientAdminId: csa._id,
      managers: [],
      subscriptionStatus: 'active',
      dimensionWeights: {
        functional: 50,
        organizational: 30,
        selfDevelopment: 15,
        developingOthers: 5,
      },
    });
    await ownerOrg.save();

    // Link CSA to organization
    csa.organizationId = ownerOrg._id;
    await csa.save();

    ownerBoss.organizationId = ownerOrg._id;
    await ownerBoss.save();

    // Create a team for Owner Boss to store their KRAs
    const ownerBossTeamCode = await generateTeamCode();
    const ownerBossTeam = new Team({
      name: `${ownerBoss.name}'s Team`,
      code: ownerBossTeamCode,
      createdBy: ownerBoss._id,
      members: [ownerBoss._id],
      membersDetails: [{
        name: ownerBoss.name,
        role: 'Boss',
        mobile: ownerBoss.mobile,
        functionalKRAs: [],
        organizationalKRAs: [],
        selfDevelopmentKRAs: [],
        developingOthersKRAs: [],
      }],
      dimensionWeights: {
        functional: 50,
        organizational: 30,
        selfDevelopment: 15,
        developingOthers: 5,
      },
    });
    await ownerBossTeam.save();
    
    // Add KRAs to Owner Boss
    const ownerBossMemberDetail = ownerBossTeam.membersDetails[0];
    // Add Functional KRAs (2-3)
    const ownerBossFuncCount = Math.floor(Math.random() * 2) + 2;
    for (let k = 0; k < ownerBossFuncCount; k++) {
      const kra = createFunctionalKRA(k + 1);
      (ownerBossMemberDetail.functionalKRAs as any[]).push(kra);
    }
    // Add Organizational KRAs (1-2)
    const ownerBossOrgCount = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < ownerBossOrgCount; k++) {
      const orgKRA = createOrganizationalKRA(k + 1);
      (ownerBossMemberDetail.organizationalKRAs as any[]).push(orgKRA);
    }
    // Add Self Development KRAs (1-2)
    const ownerBossSelfDevCount = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < ownerBossSelfDevCount; k++) {
      const selfDev = createSelfDevelopmentKRA(k + 1);
      (ownerBossMemberDetail.selfDevelopmentKRAs as any[]).push(selfDev);
    }
    // Add Developing Others KRAs (0-1)
    const ownerBossDevOthersCount = Math.random() > 0.5 ? 1 : 0;
    for (let k = 0; k < ownerBossDevOthersCount; k++) {
      const devOthers = createDevelopingOthersKRA(k + 1);
      (ownerBossMemberDetail.developingOthersKRAs as any[]).push(devOthers);
    }
    ownerBoss.teamId = ownerBossTeam._id;
    await ownerBoss.save();
    await ownerBossTeam.save();

    console.log(`   ✅ Created Owner Boss: ${ownerBoss.name} (${ownerBoss.email})`);
    console.log(`   ✅ Created Organization: ${ownerOrg.name} (Code: ${ownerOrg.code})`);
    console.log(`   ✅ Added KRAs to Owner Boss`);

    // ============================================
    // 5. CREATE BOSS 1 (3 Managers, 13 Employees)
    // ============================================
    console.log('\n👔 Creating Boss 1 with 3 Managers and 13 Employees...');
    const boss1 = new User({
      name: 'Boss One',
      email: 'boss1@testworkflow.com',
      mobile: getNextMobile(),
      role: 'boss',
      hierarchyLevel: 1,
      companyName: 'Test Organization',
      industry: 'Technology',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      organizationId: ownerOrg._id, // All bosses in main org
      bossId: ownerBoss._id,
    });
    await boss1.save();

    // Create division org for organizational structure (department of ownerOrg; excluded from Platform Admin org list)
    const boss1Org = new Organization({
      name: 'Boss 1 Division',
      code: await generateOrgCode(),
      type: 'Technology',
      employeeSize: '20-50',
      bossId: boss1._id,
      parentOrganizationId: ownerOrg._id,
      managers: [],
      subscriptionStatus: 'active',
      dimensionWeights: {
        functional: 50,
        organizational: 30,
        selfDevelopment: 15,
        developingOthers: 5,
      },
    });
    await boss1Org.save();
    // Note: boss1 stays in ownerOrg, boss1Org is a department of ownerOrg (not shown as separate org in Platform Admin)

    // Create a team for Boss 1 to store their KRAs
    const boss1TeamCode = await generateTeamCode();
    const boss1Team = new Team({
      name: `${boss1.name}'s Team`,
      code: boss1TeamCode,
      createdBy: boss1._id,
      members: [boss1._id],
      membersDetails: [{
        name: boss1.name,
        role: 'Boss',
        mobile: boss1.mobile,
        functionalKRAs: [],
        organizationalKRAs: [],
        selfDevelopmentKRAs: [],
        developingOthersKRAs: [],
      }],
      dimensionWeights: {
        functional: 50,
        organizational: 30,
        selfDevelopment: 15,
        developingOthers: 5,
      },
    });
    await boss1Team.save();
    
    // Add KRAs to Boss 1
    const boss1MemberDetail = boss1Team.membersDetails[0];
    const boss1FuncCount = Math.floor(Math.random() * 2) + 2;
    for (let k = 0; k < boss1FuncCount; k++) {
      const kra = createFunctionalKRA(k + 1);
      (boss1MemberDetail.functionalKRAs as any[]).push(kra);
    }
    const boss1OrgCount = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < boss1OrgCount; k++) {
      const orgKRA = createOrganizationalKRA(k + 1);
      (boss1MemberDetail.organizationalKRAs as any[]).push(orgKRA);
    }
    const boss1SelfDevCount = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < boss1SelfDevCount; k++) {
      const selfDev = createSelfDevelopmentKRA(k + 1);
      (boss1MemberDetail.selfDevelopmentKRAs as any[]).push(selfDev);
    }
    const boss1DevOthersCount = Math.random() > 0.5 ? 1 : 0;
    for (let k = 0; k < boss1DevOthersCount; k++) {
      const devOthers = createDevelopingOthersKRA(k + 1);
      (boss1MemberDetail.developingOthersKRAs as any[]).push(devOthers);
    }
    boss1.teamId = boss1Team._id;
    await boss1.save();
    await boss1Team.save();

    console.log(`   ✅ Created Boss 1: ${boss1.name}`);
    console.log(`   ✅ Added KRAs to Boss 1`);

    // Boss 1 - Manager 1 (5 employees)
    const manager1_1 = await createManager('Manager 1-1', boss1, boss1Org, ownerOrg);
    await createEmployees(5, manager1_1, boss1, ownerOrg, '1-1');
    console.log(`   ✅ Created Manager 1-1 with 5 employees`);

    // Boss 1 - Manager 2 (4 employees)
    const manager1_2 = await createManager('Manager 1-2', boss1, boss1Org, ownerOrg);
    await createEmployees(4, manager1_2, boss1, ownerOrg, '1-2');
    console.log(`   ✅ Created Manager 1-2 with 4 employees`);

    // Boss 1 - Manager 3 (4 employees)
    const manager1_3 = await createManager('Manager 1-3', boss1, boss1Org, ownerOrg);
    await createEmployees(4, manager1_3, boss1, ownerOrg, '1-3');
    console.log(`   ✅ Created Manager 1-3 with 4 employees`);

    // ============================================
    // 6. CREATE BOSS 2 (2 Managers, 8 Employees)
    // ============================================
    console.log('\n👔 Creating Boss 2 with 2 Managers and 8 Employees...');
    const boss2 = new User({
      name: 'Boss Two',
      email: 'boss2@testworkflow.com',
      mobile: getNextMobile(),
      role: 'boss',
      hierarchyLevel: 1,
      companyName: 'Test Organization',
      industry: 'Technology',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      organizationId: ownerOrg._id, // All bosses in main org
      bossId: ownerBoss._id,
    });
    await boss2.save();

    // Create division org for organizational structure (department of ownerOrg; excluded from Platform Admin org list)
    const boss2Org = new Organization({
      name: 'Boss 2 Division',
      code: await generateOrgCode(),
      type: 'Technology',
      employeeSize: '10-20',
      bossId: boss2._id,
      parentOrganizationId: ownerOrg._id,
      managers: [],
      subscriptionStatus: 'active',
      dimensionWeights: {
        functional: 50,
        organizational: 30,
        selfDevelopment: 15,
        developingOthers: 5,
      },
    });
    await boss2Org.save();
    // Note: boss2 stays in ownerOrg, boss2Org is a department of ownerOrg (not shown as separate org in Platform Admin)

    // Create a team for Boss 2 to store their KRAs
    const boss2TeamCode = await generateTeamCode();
    const boss2Team = new Team({
      name: `${boss2.name}'s Team`,
      code: boss2TeamCode,
      createdBy: boss2._id,
      members: [boss2._id],
      membersDetails: [{
        name: boss2.name,
        role: 'Boss',
        mobile: boss2.mobile,
        functionalKRAs: [],
        organizationalKRAs: [],
        selfDevelopmentKRAs: [],
        developingOthersKRAs: [],
      }],
      dimensionWeights: {
        functional: 50,
        organizational: 30,
        selfDevelopment: 15,
        developingOthers: 5,
      },
    });
    await boss2Team.save();
    
    // Add KRAs to Boss 2
    const boss2MemberDetail = boss2Team.membersDetails[0];
    const boss2FuncCount = Math.floor(Math.random() * 2) + 2;
    for (let k = 0; k < boss2FuncCount; k++) {
      const kra = createFunctionalKRA(k + 1);
      (boss2MemberDetail.functionalKRAs as any[]).push(kra);
    }
    const boss2OrgCount = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < boss2OrgCount; k++) {
      const orgKRA = createOrganizationalKRA(k + 1);
      (boss2MemberDetail.organizationalKRAs as any[]).push(orgKRA);
    }
    const boss2SelfDevCount = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < boss2SelfDevCount; k++) {
      const selfDev = createSelfDevelopmentKRA(k + 1);
      (boss2MemberDetail.selfDevelopmentKRAs as any[]).push(selfDev);
    }
    const boss2DevOthersCount = Math.random() > 0.5 ? 1 : 0;
    for (let k = 0; k < boss2DevOthersCount; k++) {
      const devOthers = createDevelopingOthersKRA(k + 1);
      (boss2MemberDetail.developingOthersKRAs as any[]).push(devOthers);
    }
    boss2.teamId = boss2Team._id;
    await boss2.save();
    await boss2Team.save();

    console.log(`   ✅ Created Boss 2: ${boss2.name}`);
    console.log(`   ✅ Added KRAs to Boss 2`);

    // Boss 2 - Manager 1 (4 employees)
    const manager2_1 = await createManager('Manager 2-1', boss2, boss2Org, ownerOrg);
    await createEmployees(4, manager2_1, boss2, ownerOrg, '2-1');
    console.log(`   ✅ Created Manager 2-1 with 4 employees`);

    // Boss 2 - Manager 2 (4 employees)
    const manager2_2 = await createManager('Manager 2-2', boss2, boss2Org, ownerOrg);
    await createEmployees(4, manager2_2, boss2, ownerOrg, '2-2');
    console.log(`   ✅ Created Manager 2-2 with 4 employees`);

    // ============================================
    // 7. CREATE BOSS 3 (1 Manager, 3 Employees)
    // ============================================
    console.log('\n👔 Creating Boss 3 with 1 Manager and 3 Employees...');
    const boss3 = new User({
      name: 'Boss Three',
      email: 'boss3@testworkflow.com',
      mobile: getNextMobile(),
      role: 'boss',
      hierarchyLevel: 1,
      companyName: 'Test Organization',
      industry: 'Technology',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      organizationId: ownerOrg._id, // All bosses in main org
      bossId: ownerBoss._id,
    });
    await boss3.save();

    // Create division org for organizational structure (department of ownerOrg; excluded from Platform Admin org list)
    const boss3Org = new Organization({
      name: 'Boss 3 Division',
      code: await generateOrgCode(),
      type: 'Technology',
      employeeSize: '5-10',
      bossId: boss3._id,
      parentOrganizationId: ownerOrg._id,
      managers: [],
      subscriptionStatus: 'active',
      dimensionWeights: {
        functional: 50,
        organizational: 30,
        selfDevelopment: 15,
        developingOthers: 5,
      },
    });
    await boss3Org.save();
    // Note: boss3 stays in ownerOrg, boss3Org is a department of ownerOrg (not shown as separate org in Platform Admin)

    // Create a team for Boss 3 to store their KRAs
    const boss3TeamCode = await generateTeamCode();
    const boss3Team = new Team({
      name: `${boss3.name}'s Team`,
      code: boss3TeamCode,
      createdBy: boss3._id,
      members: [boss3._id],
      membersDetails: [{
        name: boss3.name,
        role: 'Boss',
        mobile: boss3.mobile,
        functionalKRAs: [],
        organizationalKRAs: [],
        selfDevelopmentKRAs: [],
        developingOthersKRAs: [],
      }],
      dimensionWeights: {
        functional: 50,
        organizational: 30,
        selfDevelopment: 15,
        developingOthers: 5,
      },
    });
    await boss3Team.save();
    
    // Add KRAs to Boss 3
    const boss3MemberDetail = boss3Team.membersDetails[0];
    const boss3FuncCount = Math.floor(Math.random() * 2) + 2;
    for (let k = 0; k < boss3FuncCount; k++) {
      const kra = createFunctionalKRA(k + 1);
      (boss3MemberDetail.functionalKRAs as any[]).push(kra);
    }
    const boss3OrgCount = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < boss3OrgCount; k++) {
      const orgKRA = createOrganizationalKRA(k + 1);
      (boss3MemberDetail.organizationalKRAs as any[]).push(orgKRA);
    }
    const boss3SelfDevCount = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < boss3SelfDevCount; k++) {
      const selfDev = createSelfDevelopmentKRA(k + 1);
      (boss3MemberDetail.selfDevelopmentKRAs as any[]).push(selfDev);
    }
    const boss3DevOthersCount = Math.random() > 0.5 ? 1 : 0;
    for (let k = 0; k < boss3DevOthersCount; k++) {
      const devOthers = createDevelopingOthersKRA(k + 1);
      (boss3MemberDetail.developingOthersKRAs as any[]).push(devOthers);
    }
    boss3.teamId = boss3Team._id;
    await boss3.save();
    await boss3Team.save();

    console.log(`   ✅ Created Boss 3: ${boss3.name}`);
    console.log(`   ✅ Added KRAs to Boss 3`);

    // Boss 3 - Manager 1 (3 employees)
    const manager3_1 = await createManager('Manager 3-1', boss3, boss3Org, ownerOrg);
    await createEmployees(3, manager3_1, boss3, ownerOrg, '3-1');
    console.log(`   ✅ Created Manager 3-1 with 3 employees`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 WORKFLOW SEED SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Platform Admin: 1`);
    console.log(`✅ Reviewer: 1`);
    console.log(`✅ CSA (Client Admin): 1`);
    console.log(`✅ Owner Boss: 1`);
    console.log(`✅ Additional Bosses: 3`);
    console.log(`✅ Managers: 6`);
    console.log(`✅ Employees: 24`);
    console.log(`✅ Total Users: 37`);
    console.log(`✅ Organizations: 4`);
    console.log(`✅ Teams: 10 (4 Boss teams + 6 Manager teams)`);
    console.log('\n✅ All KRAs and scores have been added!');
    console.log('='.repeat(60));

    console.log('\n🎉 Full workflow seed completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log(`   Platform Admin: ${platformAdmin.email} / ${platformAdmin.mobile}`);
    console.log(`   Reviewer: ${reviewer.email} / ${reviewer.mobile}`);
    console.log(`   CSA: ${csa.email} / ${csa.mobile}`);
    console.log(`   Owner: ${ownerBoss.email} / ${ownerBoss.mobile}`);
    console.log(`   Boss 1: ${boss1.email} / ${boss1.mobile}`);
    console.log(`   Boss 2: ${boss2.email} / ${boss2.mobile}`);
    console.log(`   Boss 3: ${boss3.email} / ${boss3.mobile}`);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

// Helper function to create a manager
async function createManager(
  name: string,
  boss: any,
  bossOrg: any,
  ownerOrg: any
): Promise<any> {
  const manager = new User({
    name,
    email: getEmail(name, 'manager'),
    mobile: getNextMobile(),
    role: 'manager',
    hierarchyLevel: 2,
    companyName: ownerOrg.name,
    industry: ownerOrg.type || 'Technology',
    isEmailVerified: true,
    isMobileVerified: true,
    isActive: true,
    organizationId: ownerOrg._id, // All users in main organization
    bossId: boss._id,
  });

  const teamCode = await generateTeamCode();
  const team = new Team({
    name: `${name}'s Team`,
    code: teamCode,
    createdBy: null as any, // Will set after manager save
    members: [],
    membersDetails: [],
    dimensionWeights: {
      functional: 50,
      organizational: 30,
      selfDevelopment: 15,
      developingOthers: 5,
    },
  });

  await manager.save();
  team.createdBy = manager._id;
  team.members = [manager._id];
  
  // Add manager to membersDetails so their KRAs can be stored
  const managerMemberDetail = {
    name: manager.name,
    role: 'Manager',
    mobile: manager.mobile,
    functionalKRAs: [],
    organizationalKRAs: [],
    selfDevelopmentKRAs: [],
    developingOthersKRAs: [],
  };
  
  // Add Functional KRAs to manager (2-3)
  const managerFuncCount = Math.floor(Math.random() * 2) + 2;
  for (let k = 0; k < managerFuncCount; k++) {
    const kra = createFunctionalKRA(k + 1);
    (managerMemberDetail.functionalKRAs as any[]).push(kra);
  }
  
  // Add Organizational KRAs to manager (1-2)
  const managerOrgCount = Math.floor(Math.random() * 2) + 1;
  for (let k = 0; k < managerOrgCount; k++) {
    const orgKRA = createOrganizationalKRA(k + 1);
    (managerMemberDetail.organizationalKRAs as any[]).push(orgKRA);
  }
  
  // Add Self Development KRAs to manager (1-2)
  const managerSelfDevCount = Math.floor(Math.random() * 2) + 1;
  for (let k = 0; k < managerSelfDevCount; k++) {
    const selfDev = createSelfDevelopmentKRA(k + 1);
    (managerMemberDetail.selfDevelopmentKRAs as any[]).push(selfDev);
  }
  
  // Add Developing Others KRAs to manager (0-1)
  const managerDevOthersCount = Math.random() > 0.5 ? 1 : 0;
  for (let k = 0; k < managerDevOthersCount; k++) {
    const devOthers = createDevelopingOthersKRA(k + 1);
    (managerMemberDetail.developingOthersKRAs as any[]).push(devOthers);
  }
  
  team.membersDetails = [managerMemberDetail];
  
  await team.save();

  manager.teamId = team._id;
  await manager.save();

  bossOrg.managers.push(manager._id);
  await bossOrg.save();

  return { manager, team };
}

// Helper function to create employees
async function createEmployees(
  count: number,
  managerData: any,
  boss: any,
  ownerOrg: any,
  managerPrefix: string
): Promise<any[]> {
  const employees = [];
  const manager = managerData.manager;
  const team = managerData.team;

  for (let i = 1; i <= count; i++) {
    const employee = new User({
      name: `Employee ${managerPrefix}-${i}`,
      email: getEmail(`employee.${managerPrefix}`, 'employee', i),
      mobile: getNextMobile(),
      role: 'employee',
      hierarchyLevel: 3,
      companyName: ownerOrg.name,
      industry: ownerOrg.type || 'Technology',
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
      organizationId: ownerOrg._id, // All users in main organization
      bossId: boss._id,
      managerId: manager._id,
      teamId: team._id,
    });

    await employee.save();
    team.members.push(employee._id);

    // Add employee to team membersDetails
    if (!team.membersDetails) {
      team.membersDetails = [];
    }

    const memberDetail = {
      name: employee.name,
      role: 'Employee',
      mobile: employee.mobile,
      functionalKRAs: [],
      organizationalKRAs: [],
      selfDevelopmentKRAs: [],
      developingOthersKRAs: [],
    };

    // Add Functional KRAs (2-3 per employee)
    const functionalKRACount = Math.floor(Math.random() * 2) + 2; // 2-3 KRAs
    for (let k = 0; k < functionalKRACount; k++) {
      const kra = createFunctionalKRA(k + 1);
      (memberDetail.functionalKRAs as any[]).push(kra);
    }

    // Add Organizational KRAs (1-2 per employee)
    const orgKRACount = Math.floor(Math.random() * 2) + 1; // 1-2 KRAs
    for (let k = 0; k < orgKRACount; k++) {
      const orgKRA = createOrganizationalKRA(k + 1);
      (memberDetail.organizationalKRAs as any[]).push(orgKRA);
    }

    // Add Self Development KRAs (1-2 per employee)
    const selfDevCount = Math.floor(Math.random() * 2) + 1; // 1-2 KRAs
    for (let k = 0; k < selfDevCount; k++) {
      const selfDev = createSelfDevelopmentKRA(k + 1);
      (memberDetail.selfDevelopmentKRAs as any[]).push(selfDev);
    }

    // Add Developing Others KRAs (0-1 per employee)
    const devOthersCount = Math.random() > 0.5 ? 1 : 0; // 0-1 KRAs
    for (let k = 0; k < devOthersCount; k++) {
      const devOthers = createDevelopingOthersKRA(k + 1);
      (memberDetail.developingOthersKRAs as any[]).push(devOthers);
    }

    team.membersDetails.push(memberDetail);
    employees.push(employee);
  }

  await team.save();
  return employees;
}

// Helper function to create Functional KRA with scores
function createFunctionalKRA(index: number): any {
  const weights = [10, 20, 30, 40, 50];
  const pilotWeight = weights[Math.floor(Math.random() * weights.length)];

  const r1Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r2Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r3Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r4Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));

  const kra = {
    kra: `Functional KRA ${index}: Improve project delivery efficiency`,
    kpis: [
      { kpi: `KPI ${index}.1: Complete tasks on time`, target: '95% on-time delivery' },
      { kpi: `KPI ${index}.2: Reduce errors by 20%`, target: 'Error rate < 2%' },
    ],
    reportsGenerated: [],
    editCount: 0,
    isScoreLocked: false,
    pilotWeight,
    pilotScore: parseFloat((Math.random() * 2 + 2.5).toFixed(2)), // 2.5-4.5
    r1Weight: Math.max(10, Math.min(100, pilotWeight + (Math.random() > 0.5 ? 10 : -10))),
    r1Score,
    r1ActualPerf: `R1 Performance: Met ${Math.floor(Math.random() * 30 + 70)}% of targets`,
    r2Weight: Math.max(10, Math.min(100, pilotWeight + (Math.random() > 0.5 ? 10 : -10))),
    r2Score,
    r2ActualPerf: `R2 Performance: Met ${Math.floor(Math.random() * 30 + 70)}% of targets`,
    r3Weight: Math.max(10, Math.min(100, pilotWeight + (Math.random() > 0.5 ? 10 : -10))),
    r3Score,
    r3ActualPerf: `R3 Performance: Met ${Math.floor(Math.random() * 30 + 70)}% of targets`,
    r4Weight: Math.max(10, Math.min(100, pilotWeight + (Math.random() > 0.5 ? 10 : -10))),
    r4Score,
    r4ActualPerf: `R4 Performance: Met ${Math.floor(Math.random() * 30 + 70)}% of targets`,
    averageScore: 0, // Will be calculated
  };

  // Calculate average score
  const avgScore = calculateFunctionalAverageScore(kra);
  kra.averageScore = avgScore ?? 0;

  return kra;
}

// Helper function to create Organizational KRA with scores
function createOrganizationalKRA(_index: number): any {
  const coreValues = [
    'Integrity',
    'Innovation',
    'Teamwork',
    'Excellence',
    'Customer Focus',
    'Accountability',
  ];
  const coreValue = coreValues[Math.floor(Math.random() * coreValues.length)];

  const r1Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r2Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r3Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r4Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));

  const orgKRA = {
    coreValues: coreValue,
    editCount: 0,
    isScoreLocked: false,
    pilotScore: parseFloat((Math.random() * 2 + 2.5).toFixed(2)),
    pilotCriticalIncident: `Pilot: Demonstrated ${coreValue} in team collaboration`,
    r1Score,
    r1CriticalIncident: `R1: Showed ${coreValue} during project crisis`,
    r2Score,
    r2CriticalIncident: `R2: Exemplified ${coreValue} in client interaction`,
    r3Score,
    r3CriticalIncident: `R3: Applied ${coreValue} in process improvement`,
    r4Score,
    r4CriticalIncident: `R4: Demonstrated ${coreValue} in mentoring others`,
    averageScore: 0, // Will be calculated
  };

  // Calculate average score
  const avgScore = calculateOrganizationalAverageScore(orgKRA);
  orgKRA.averageScore = avgScore ?? 0;

  return orgKRA;
}

// Helper function to create Self Development KRA with scores
function createSelfDevelopmentKRA(_index: number): any {
  const areas = [
    'Technical Skills',
    'Communication',
    'Leadership',
    'Time Management',
    'Problem Solving',
    'Presentation Skills',
  ];
  const area = areas[Math.floor(Math.random() * areas.length)];

  const pilotScore = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r1Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r2Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r3Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r4Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));

  const selfDev = {
    areaOfConcern: area,
    actionPlanInitiative: `Action Plan: Complete ${area} training course and apply learnings`,
    editCount: 0,
    isScoreLocked: false,
    pilotScore,
    pilotReason: `Pilot: Identified need for improvement in ${area}`,
    r1Score,
    r1Reason: `R1: Made progress in ${area} through training`,
    r2Score,
    r2Reason: `R2: Applied ${area} skills in daily work`,
    r3Score,
    r3Reason: `R3: Showed significant improvement in ${area}`,
    r4Score,
    r4Reason: `R4: Mastered ${area} and helping others`,
    averageScore: 0, // Will be calculated
  };

  // Calculate average score (includes pilot)
  const avgScore = calculateSelfDevelopmentAverageScore(selfDev);
  selfDev.averageScore = avgScore ?? 0;

  return selfDev;
}

// Helper function to create Developing Others KRA with scores
function createDevelopingOthersKRA(_index: number): any {
  const people = [
    'Junior Developer',
    'New Team Member',
    'Intern',
    'Cross-functional Colleague',
  ];
  const person = people[Math.floor(Math.random() * people.length)];

  const pilotScore = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r1Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r2Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r3Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));
  const r4Score = parseFloat((Math.random() * 2 + 2.5).toFixed(2));

  const devOthers = {
    person,
    areaOfDevelopment: `Mentoring ${person} in technical skills and best practices`,
    editCount: 0,
    isScoreLocked: false,
    pilotScore,
    pilotReason: `Pilot: Started mentoring ${person}`,
    r1Score,
    r1Reason: `R1: ${person} showed improvement in assigned tasks`,
    r2Score,
    r2Reason: `R2: ${person} became more independent`,
    r3Score,
    r3Reason: `R3: ${person} contributed to team success`,
    r4Score,
    r4Reason: `R4: ${person} achieved performance goals`,
    averageScore: 0, // Will be calculated
  };

  // Calculate average score (includes pilot)
  const avgScore = calculateDevelopingOthersAverageScore(devOthers);
  devOthers.averageScore = avgScore ?? 0;

  return devOthers;
}

// Run the seed (ES module syntax)
seedFullWorkflow()
  .then(() => {
    console.log('\n✅ Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  });

export { seedFullWorkflow };
