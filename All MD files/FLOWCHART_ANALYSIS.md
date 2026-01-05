# Performance Management Flowchart Analysis

## Overview
This document analyzes the new client requirements from `Assets/perf_mgmt_flowchart.mermaid` and maps them to the existing codebase, identifying what needs to be added or modified.

## Flowchart Summary

The new flow introduces a multi-tier organizational hierarchy:
1. **Platform Admin** - Manages organizations and assigns reviewers
2. **Reviewer** - External reviewer who scores employees
3. **Boss** - Organization head who creates managers and configures review cycles
4. **Manager** - Creates employee accounts and manages team
5. **Employee** - End user who receives scores and feedback

## Current State vs Required State

### ✅ Existing Components (Keep As-Is)

1. **Authentication System**
   - SignUp component (`client/src/pages/Auth/SignUp/SignUp.tsx`)
   - OTP verification (`client/src/pages/Auth/OTPVerify/OTPVerify.tsx`)
   - Access Code (`client/src/pages/Auth/AccessCode/AccessCode.tsx`)
   - Login system
   - **Status:** ✅ Keep and extend

2. **Team Model & KRAs**
   - Team model with KRA structure (`server/src/models/Team.ts`)
   - Functional, Organizational, Self Development, Developing Others KRAs
   - **Status:** ✅ Keep and enhance for reviewer scoring

3. **Dashboard Structure**
   - Basic dashboard layout (`client/src/pages/Dashboard/Dashboard.tsx`)
   - Dashboard routing structure
   - **Status:** ✅ Keep but differentiate by role

4. **Notification System**
   - Notification model exists (`server/src/models/Notification.ts`)
   - **Status:** ✅ Keep and extend for review period notifications

### 🆕 New Components Required

#### 1. Platform Admin System

**Required Features:**
- Platform Admin Dashboard to manage all organizations
- Capture organization info (Name, Industry, Size, Contact)
- Create isolated organization workspaces
- Assign reviewers to organizations
- Monitor all orgs, subscriptions, reviewer assignments, analytics, revenue

**New Models Needed:**
- `Organization` model (workspace isolation)
- `PlatformAdmin` model (or extend User with role)
- `Reviewer` model (or extend User with role)

**New Controllers Needed:**
- `organizationController.ts` - CRUD for organizations
- `platformAdminController.ts` - Admin dashboard operations
- `reviewerController.ts` - Reviewer assignment

**New Frontend Pages:**
- `client/src/pages/Admin/AdminDashboard.tsx` - Platform admin dashboard
- `client/src/pages/Admin/Organizations.tsx` - Organization management
- `client/src/pages/Admin/Reviewers.tsx` - Reviewer management
- `client/src/pages/Admin/Analytics.tsx` - System analytics

**Routes to Add:**
```
/admin/dashboard
/admin/organizations
/admin/reviewers
/admin/analytics
```

#### 2. Role-Based Hierarchy System

**Current User Model:**
```typescript
role: 'admin' | 'member'
```

**Required User Model Extension:**
```typescript
role: 'platform_admin' | 'reviewer' | 'boss' | 'manager' | 'employee'
hierarchyLevel?: number // 0=Platform Admin, 1=Boss, 2=Manager, 3=Employee
organizationId?: mongoose.Types.ObjectId
reviewerId?: mongoose.Types.ObjectId // For employees being reviewed
managerId?: mongoose.Types.ObjectId // Direct manager
bossId?: mongoose.Types.ObjectId // Organization boss
```

**New Models Needed:**
- `Organization` model:
  ```typescript
  {
    name: string
    industry: string
    size: number
    contact: string
    reviewerId: mongoose.Types.ObjectId
    bossId: mongoose.Types.ObjectId
    subscriptionStatus: 'active' | 'trial' | 'expired'
    createdAt: Date
  }
  ```

**Changes to Existing Models:**
- Extend `User` model with new role types and hierarchy fields
- Update `Team` model to link with Organization

#### 3. Boss Setup Flow

**Required Features:**
- Boss first login (after admin assigns reviewer)
- Create Manager accounts
- Configure Review Cycles & Frequency

**New Controllers:**
- `bossController.ts` - Boss-specific operations
  - `createManager()` - Create manager accounts
  - `configureReviewCycle()` - Set review frequency/dates

**New Frontend Pages:**
- `client/src/pages/Dashboard/Boss/Managers.tsx` - Manager creation/management
- `client/src/pages/Dashboard/Boss/ReviewCycles.tsx` - Review cycle configuration
- `client/src/pages/Dashboard/Boss/Analytics.tsx` - Organization-wide analytics

**Routes:**
```
/dashboard/boss/managers
/dashboard/boss/review-cycles
/dashboard/boss/analytics
```

#### 4. Manager Setup Flow

**Required Features:**
- Manager login
- Create Employee accounts
- System establishes hierarchy automatically

**New Controllers:**
- `managerController.ts` - Manager operations
  - `createEmployee()` - Create employee accounts

**New Frontend Pages:**
- `client/src/pages/Dashboard/Manager/Employees.tsx` - Employee management
- `client/src/pages/Dashboard/Manager/TeamPerformance.tsx` - Team performance view

**Routes:**
```
/dashboard/manager/employees
/dashboard/manager/team-performance
```

#### 5. Review Cycle System

**Required Features:**
- Configure review cycles (frequency, dates)
- Review period starts check
- Notifications sent to all users when period starts
- Wait for next cycle

**New Models:**
- `ReviewCycle` model:
  ```typescript
  {
    organizationId: mongoose.Types.ObjectId
    frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual'
    startDate: Date
    nextReviewDate: Date
    currentReviewPeriod: number // 1, 2, 3, 4
    isActive: boolean
  }
  ```

**New Controllers:**
- `reviewCycleController.ts`
  - `createReviewCycle()`
  - `checkReviewPeriodStart()`
  - `triggerReviewPeriod()`

**Background Jobs Needed:**
- Cron job or scheduled task to check if review period started
- Send notifications when period starts

#### 6. Reviewer Scoring System

**Required Features:**
- Reviewer accesses scoring system
- Enter scores, comments & feedback for employees
- Timestamp & lock review

**Current State:**
- Team model has KRA structure with r1, r2, r3, r4 scores
- Need to add reviewer assignment and scoring workflow

**New Controllers:**
- `reviewerController.ts`
  - `getEmployeesToReview()` - Get list of employees assigned
  - `submitScores()` - Enter scores and feedback
  - `lockReview()` - Lock review with timestamp

**New Frontend Pages:**
- `client/src/pages/Reviewer/Dashboard.tsx` - Reviewer dashboard
- `client/src/pages/Reviewer/Scoring.tsx` - Score entry form
- `client/src/pages/Reviewer/Employees.tsx` - List of employees to review

**Routes:**
```
/reviewer/dashboard
/reviewer/scoring/:employeeId
/reviewer/employees
```

#### 7. Role-Based Dashboards

**Current:** Single generic dashboard

**Required:** Three distinct dashboards with different views

##### Employee Dashboard
**Features:**
- View current score
- Historical trends
- Next review date
- Feedback/Comments
- Improvement actions
- Acknowledge & create action plan

**New Page:**
- `client/src/pages/Dashboard/Employee/Overview.tsx`
- `client/src/pages/Dashboard/Employee/Performance.tsx`
- `client/src/pages/Dashboard/Employee/ActionPlan.tsx`

##### Manager Dashboard
**Features:**
- View all team members
- Team performance metrics
- Comparisons/Rankings
- Add extra feedback
- Alerts
- Mid-cycle notes

**New Page:**
- `client/src/pages/Dashboard/Manager/Team.tsx` (enhance existing)
- `client/src/pages/Dashboard/Manager/Comparisons.tsx`
- `client/src/pages/Dashboard/Manager/Feedback.tsx`

##### Boss Dashboard
**Features:**
- View all managers & teams
- Department comparisons
- Org-wide trends
- Drill-down capability
- Analytics
- Strategic decisions

**New Page:**
- `client/src/pages/Dashboard/Boss/Overview.tsx`
- `client/src/pages/Dashboard/Boss/Departments.tsx`
- `client/src/pages/Dashboard/Boss/Analytics.tsx`
- `client/src/pages/Dashboard/Boss/DrillDown.tsx`

#### 8. Score Distribution System

**Required Features:**
- After reviewer locks review, distribute scores to appropriate user levels
- Employee sees their scores
- Manager sees their team's scores
- Boss sees all scores

**Implementation:**
- Already handled by existing Team model structure
- Need to add notification triggers when review is locked
- Need to add access control based on hierarchy

#### 9. Continuous Feedback Loop

**Required Features:**
- Employee acknowledges and creates action plan
- Manager adds mid-cycle notes
- Boss makes strategic decisions
- Loop back to next review period

**Implementation:**
- Add feedback/comments system
- Add action plan tracking
- Add mid-cycle notes
- Connect to review cycle system

## Implementation Priority

### Phase 1: Core Structure
1. ✅ Create Organization model
2. ✅ Extend User model with new roles and hierarchy
3. ✅ Create Platform Admin dashboard structure
4. ✅ Update authentication to support new roles

### Phase 2: Boss & Manager Flow
5. ✅ Boss setup: Create managers
6. ✅ Manager setup: Create employees
7. ✅ Hierarchy establishment logic

### Phase 3: Review System
8. ✅ Review cycle configuration
9. ✅ Reviewer assignment
10. ✅ Reviewer scoring system
11. ✅ Review locking and distribution

### Phase 4: Role-Based Dashboards
12. ✅ Employee dashboard
13. ✅ Manager dashboard (enhance existing)
14. ✅ Boss dashboard

### Phase 5: Notifications & Feedback
15. ✅ Review period notifications
16. ✅ Feedback/action plan system
17. ✅ Continuous feedback loop

## Database Schema Changes Summary

### New Collections
- `organizations` - Organization workspaces
- `reviewcycles` - Review cycle configurations
- `reviews` - Locked review records (or extend Team model)

### Modified Collections
- `users` - Add roles, hierarchy fields, organizationId
- `teams` - Link to organization, add reviewer assignment

## API Endpoints to Add

### Platform Admin
```
GET    /api/admin/organizations
POST   /api/admin/organizations
GET    /api/admin/organizations/:id
PUT    /api/admin/organizations/:id
POST   /api/admin/organizations/:id/assign-reviewer
GET    /api/admin/analytics
```

### Organizations
```
GET    /api/organizations
POST   /api/organizations
GET    /api/organizations/:id
```

### Review Cycles
```
POST   /api/review-cycles
GET    /api/review-cycles/organization/:orgId
PUT    /api/review-cycles/:id
POST   /api/review-cycles/:id/trigger
```

### Reviewer
```
GET    /api/reviewer/employees
GET    /api/reviewer/employees/:id/scores
POST   /api/reviewer/employees/:id/scores
POST   /api/reviewer/reviews/:id/lock
```

### Boss
```
POST   /api/boss/managers
GET    /api/boss/managers
POST   /api/boss/review-cycles
```

### Manager
```
POST   /api/manager/employees
GET    /api/manager/employees
GET    /api/manager/team-performance
```

## Frontend Route Structure

```
/auth/* (existing - keep)
/admin/* (new - Platform Admin)
/reviewer/* (new - Reviewer)
/dashboard/* (enhance - role-based)
  /dashboard/employee/* (new)
  /dashboard/manager/* (enhance existing)
  /dashboard/boss/* (new)
```

## Theme & Color Codes (Keep As-Is)

The flowchart specifies these color styles:
- Start: `#e1f5ff` (light blue)
- Admin: `#fff3cd` (light yellow)
- Employee Dashboard: `#d4edda` (light green)
- Manager Dashboard: `#cce5ff` (light blue)
- Boss Dashboard: `#f8d7da` (light red)
- Distribution: `#e7e7e7` (light gray)

These should be maintained in the CSS modules for respective components.

## Next Steps

1. Review and approve this analysis
2. Start with Phase 1 implementation
3. Iterate through phases incrementally
4. Test each phase before moving to next

