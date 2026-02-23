# LCPL - Performance Management System

> **LCPL = Liberation Coaches Private Limited**

> **AI Agent Quick Reference**: This document provides comprehensive context for understanding the LCPL Performance Management System. Read this first before making any changes.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Status & Roadmap](#project-status--roadmap)
3. [Tech Stack](#tech-stack)
4. [The 4-Dimension Performance System](#the-4-dimension-performance-system)
5. [Role Hierarchy & Permissions](#role-hierarchy--permissions)
6. [Data Models](#data-models)
7. [API Endpoints](#api-endpoints)
8. [Frontend Structure](#frontend-structure)
9. [Key Business Logic](#key-business-logic)
10. [File Structure](#file-structure)
11. [Common Operations](#common-operations)
12. [Development Guidelines](#development-guidelines)

---

## Project Overview

LCPL is a **digital Performance Management System** that complements Liberation Coaches' premium **4DPMS (4-Dimension Performance Management System)** consulting service. While the full 4DPMS service is for top executives, this app extends performance tracking to all employees in a scalable, self-serve way.

### Business Context

| Aspect | Description |
|--------|-------------|
| **Liberation Coaches** | The company providing 4DPMS consulting services |
| **4DPMS Service** | Premium, hands-on performance management for executives |
| **This App** | Digital tool to track lower-tier employees' performance |
| **Problem Solved** | Full 4DPMS isn't feasible for every employee - app makes it scalable |
| **Value** | Data-driven appraisals instead of guesswork |

### Core Concept

- **Multi-dimensional evaluation**: Employees evaluated on 4 dimensions with **per-person configurable weights**
- **Quarterly reviews**: Performance tracked across 4 review periods (R1-R4) plus initial Pilot period
- **Hierarchical structure**: Platform Admin → CSA → Boss → Manager → Employee
- **Supervisor/Member model**: Everyone has a Member view; those with reports also have Supervisor view
- **External validation**: LCPL Reviewers validate scores for assigned teams/departments
- **Automated calculations**: All scores computed automatically using weighted formulas

---

## Project Status & Roadmap

### Current Status: MVP Development

| Aspect | Status |
|--------|--------|
| **Deployment** | Not deployed - Local development + GitHub only |
| **Stage** | MVP (Minimum Viable Product) |
| **Primary Platform** | Web app (React) - for testing and ease of access |
| **Planned Platform** | Mobile app (Flutter) - final target for all users |

### What's Working
- Full backend API for all roles (15 route modules)
- Web frontend for core workflows
- 4-Dimension evaluation system
- Score calculations and exports (PDF only for CSA, personal PDF for everyone)
- **Unified Join Flow** (Org Code + Invite Code in single field)
- **KRA Finalization** (Supervisor can finalize all KRAs for a member)
- **Edit/Delete** for orgs, managers, employees, team members
- **Personal PDF Report** download for Employee, Manager, Boss
- **Feedback system** (mid-cycle notes + feedback history)
- **CSA Hierarchy** endpoint for viewing org structure

### Known Gaps
- **Authentication is simplified** - Uses `userId` query parameter (secure auth planned for production)
- **Third-party integrations not yet configured** - SMS for OTP, email services, cloud storage TBD
- **Per-person dimension weights** not implemented - currently at team level
- **Violet/purple color inconsistencies** across CSS (should use design system variables)
- **Button sizes** not fully standardized across dashboards

### Development Focus Areas

| Priority | Area | Notes |
|----------|------|-------|
| **HIGH** | Client Admin (CSA) dashboard | Most controls and management features |
| **HIGH** | Platform Admin dashboard | Organization and user management |
| **MEDIUM** | Manager/Employee workflows | Core evaluation flows |
| **PLANNED** | Supervisor/Member architecture | Replace fixed role dashboards |
| **PLANNED** | Per-person dimension weights | Currently at team level (`Team.dimensionWeights`), needs to move to `membersDetails[]` |
| **PLANNED** | Mobile app (Flutter) | Final delivery platform |
| **PLANNED** | Proper authentication | JWT/session-based security |
| **PLANNED** | Third-party integrations | SMS, email, cloud storage |

### Planned Architecture: Supervisor/Member Model

The current system has fixed role dashboards (Boss, Manager, Employee). The planned architecture uses a **capability-based dual-tab system**:

```
┌─────────────────────────────────────────────────────────────┐
│                     MEMBER TAB                              │
│  (Everyone sees this - their own performance)               │
├─────────────────────────────────────────────────────────────┤
│  • My 4 Dimensions (KRAs assigned to me)                    │
│  • Add proof of work                                        │
│  • My scores (current + comparison with last review)        │
│  • My team's score (average + rank)                         │
│  • Download my report (after all quarters)                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   SUPERVISOR TAB                            │
│  (Only if you have people reporting to you)                 │
├─────────────────────────────────────────────────────────────┤
│  • View team members + profiles                             │
│  • Set dimension weights (per person)                       │
│  • Set their KRAs (all 4 dimensions)                        │
│  • Score their performance                                  │
│  • Team/Department comparison                               │
│  • See entire subtree (reports + their reports)             │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes:**
- `reportsTo` field replaces `managerId` + `bossId`
- Supervisor tab auto-appears if anyone reports to you
- Visibility = entire subtree (your reports + their reports + ...)
- Works for any org structure without code changes

### Deployment Plans
- Deployment strategy TBD (pending stakeholder meeting)
- Currently version-controlled on GitHub

---

## Tech Stack

### Backend (`/server`)
| Technology | Purpose |
|------------|---------|
| Node.js (ES2020) | Runtime |
| Express.js | Web framework |
| MongoDB + Mongoose | Database & ODM |
| TypeScript (strict) | Language |
| Zod, Joi | Validation |
| XLSX | Excel export |
| pdfmake | PDF export |
| Jest + Supertest | Testing |

### Frontend (`/client`)
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Language |
| Vite | Build tool |
| React Router DOM 6 | Routing |
| Recharts | Charts/visualizations |
| CSS Modules | Styling |

---

## The 4-Dimension Performance System

This is the **core innovation** of the system. Each employee is evaluated across 4 dimensions:

### Dimensions Overview

| # | Dimension | Example Weight | Description |
|---|-----------|---------------|-------------|
| 1 | **Functional** | 40-80% | Job-specific goals, KRAs, KPIs, and targets |
| 2 | **Organizational** | 10-30% | Company-wide objectives and core values |
| 3 | **Self Development** | 5-15% | Personal growth, learning, skill development |
| 4 | **Developing Others** | 0-30% | Mentoring, coaching, developing colleagues |

### Dimension Weights: Per-Person Configuration

> **CRITICAL**: Dimension weights are configured **per person**, NOT per organization.

| Rule | Description |
|------|-------------|
| **Per-Person** | Each employee has their own dimension weights |
| **Set by Supervisor** | Manager/Boss sets weights when creating the person |
| **Required First** | Weights MUST be set before adding any KRAs |
| **Fixed for Year** | Weights stay the same for all 4 quarters |
| **Override by CSA Only** | Only CSA can change weights after initial setup |
| **Must Sum to 100%** | All 4 dimensions must total exactly 100% |

**Example: Different weights for different roles**

| Person | Functional | Organizational | Self-Dev | Developing Others |
|--------|-----------|----------------|----------|-------------------|
| Junior Developer | 80% | 10% | 10% | 0% |
| Senior Developer | 70% | 15% | 10% | 5% |
| Tech Lead | 50% | 20% | 10% | 20% |
| Manager | 40% | 25% | 10% | 25% |

A junior focused on delivery vs. a manager focused on team development → completely different weights.

### Dimension Details

#### 1. Functional Dimension (60%)
- Contains multiple **KRAs** (Key Result Areas)
- Each KRA has:
  - Multiple **KPIs** with targets
  - **Weight** per period (must sum to 100% for all KRAs)
  - **Score** (0-5 scale)
  - **Proof/Reports** (drive links or file uploads)
- **Calculation**: Weighted average = `SUMPRODUCT(scores, weights) / SUM(weights)`

#### 2. Organizational Dimension (20%)
- Contains **Core Values**
- Each core value has:
  - **Score** (0-5) per period
  - **Critical Incidents** (text descriptions)
- **Calculation**: Simple average of all core value scores
- **Note**: No pilot period scores (only R1-R4)

#### 3. Self Development Dimension (10%)
- Contains **Areas of Concern**
- Each area has:
  - **Action Plan/Initiative**
  - **Score** (0-5) per period including pilot
  - **Reason** (text explanation)
- **Calculation**: Simple average of all area scores

#### 4. Developing Others Dimension (10%)
- Contains **Persons being developed**
- Each person has:
  - **Area of Development**
  - **Score** (0-5) per period including pilot
  - **Reason** (text explanation)
- **Calculation**: Simple average of all person scores

### Review Periods

| Period | Description |
|--------|-------------|
| **Pilot** | Initial baseline (for Functional, Self Dev, Developing Others) |
| **R1** | Quarter 1 review |
| **R2** | Quarter 2 review |
| **R3** | Quarter 3 review |
| **R4** | Quarter 4 / Annual review |

### 4D Index Calculation

The final performance score (4D Index) is calculated as:

```
4D Index = (
  (Functional × FunctionalWeight) +
  (Organizational × OrganizationalWeight) +
  (SelfDevelopment × SelfDevWeight) +
  (DevelopingOthers × DevOthersWeight)
) / 100
```

**Scale**: 0-5 (displayed as 0-100%)

### Salary Hike Calculation

The 4D Index maps to salary hike percentages:

| 4D Index Range | Hike % |
|----------------|--------|
| 0 - 1.0 | 0% |
| 1.0 - 2.0 | 3% |
| 2.0 - 3.0 | 6% |
| 3.0 - 4.0 | 10% |
| 4.0 - 5.0 | 15% |

---

## Role Hierarchy & Permissions

```
Platform Admin (LCPL)
    │
    └── CSA (Client Service Admin)
            │
            └── Boss (High-tier, not necessarily owner)
                    │
                    └── Manager (Team supervisor)
                            │
                            └── Employee (Team member)

Reviewer (LCPL Facilitator - assigned to specific teams/departments)
```

### Detailed Role Breakdown (Bottom-Up)

#### Employee
| Feature | Description |
|---------|-------------|
| View 4 Dimensions | See all their KRAs across all 4 dimensions |
| Add Proof | Upload evidence of work done |
| View Score | Current scores for each dimension |
| Progress Comparison | Compare with previous review (improvement/decline) |
| Download Report | After all 4 quarters complete |
| Team Score | See team average AND team rank in department |

#### Manager
| Feature | Description |
|---------|-------------|
| **All Employee abilities** | Their own 4D, proof, scores, comparison, download |
| View Team Members | See profiles of their direct reports |
| **Set KRAs** | Enter all 4 dimension fields for team members |
| **Set Dimension Weights** | Configure weights per person (must do before adding KRAs) |
| Score Team | Rate team members' performance each quarter |
| Team Comparison | See how their team ranks vs other teams in department |

#### Boss
| Feature | Description |
|---------|-------------|
| **All Manager abilities** | Set KRAs, score team, own 4D, etc. |
| Multi-Department View | See performance of all departments under them |
| Department Comparison | Compare departments against each other |

**Note:** Boss ≠ Org owner necessarily. A high-tier person with multiple departments reporting to them.

#### CSA (Client Service Admin)
| Feature | Description |
|---------|-------------|
| Org Configuration | Set up organization structure |
| User Management | Invite users, assign roles |
| Review Cycle Config | Set up quarterly review dates |
| **Set Boss's KRAs** | CSA evaluates the Boss |
| **Override Weights** | Only CSA can change dimension weights after initial setup |
| Export Data | Generate org-wide reports |

**Note:** Usually delegated by org owner to someone else.

#### Platform Admin (LCPL)
| Feature | Description |
|---------|-------------|
| Oversight | Monitor all client organizations |
| Create Orgs | Set up new client organizations |
| Create CSAs | Assign client admins |
| **Assign Reviewers** | Assign LCPL facilitators to teams/departments |

#### Reviewer (LCPL Facilitator)
| Feature | Description |
|---------|-------------|
| Review KRAs | Validate KRAs set by supervisors |
| Validate Scores | Review scores given |
| **Scoped Assignment** | Assigned to specific team/department, NOT whole org |
| **Multi-Org** | Can be assigned to multiple organizations |

**Status:** Feature still being defined.

### Who Evaluates Whom

| Person | Evaluated By | Sets Their KRAs |
|--------|--------------|-----------------|
| Employee | Manager | Manager |
| Manager | Boss | Boss |
| Boss | CSA | CSA |

### Evaluation Flow

```
1. Supervisor sets dimension weights for person (required first)
2. Supervisor assigns KRAs across all 4 dimensions
3. Employee works on KRAs → Submits proof
4. Supervisor scores performance → Period scores (R1-R4)
5. Reviewer validates scores → Confirms/validates
6. System calculates dimension scores → Per-person weighted formulas
7. System calculates 4D Index → Final score
8. Supervisor/Boss finalizes KRAs → `krasFinalized = true` (locks ALL KRAs for that person)
9. Scores can be locked → Prevents further edits
```

---

## Data Models

### User Model
```typescript
{
  name, email (unique), mobile (unique),
  companyName, industry, // (Technology|Healthcare|Finance|Education|Manufacturing|Retail|Consulting|Other)
  isEmailVerified, isMobileVerified, isActive,
  accessCode, useFingerprint,
  role, // (platform_admin|client_admin|reviewer|boss|manager|employee)
  hierarchyLevel, // (0|0.5|1|2|3)
  organizationId, teamId,
  reviewerId, managerId, bossId,   // CURRENT: Separate fields
  createdBy,                       // NEW: Who created this user
  designation, aboutMe,
  educationalQualification, skills, clientele, languages,
  onboardingCompleted, onboardingStep,
  
  // PLANNED: Replace managerId + bossId with single field
  // reportsTo: ObjectId,          // ← Single field for hierarchy
  // canConfigureOrg: boolean,     // ← For review cycles, weights (Boss privilege)
}
```

### Organization Model
```typescript
{
  name, code (unique, 6-8 chars),
  type, employeeSize,
  bossId, reviewerId, clientAdminId,
  managers[], // array of User refs
  subscriptionStatus, // (active|trial|expired)
  parentOrganizationId, // for departments
  dimensionWeights: {
    functional, organizational,
    selfDevelopment, developingOthers // each 0-100
  }
}
```

### Team Model
```typescript
{
  name, code (unique, 4-8 chars),
  members[], // User refs
  membersDetails[]: {
    name, role, mobile,
    // KRA Finalization Tracking (NEW)
    krasReadyForReview: boolean,   // Member marks ready
    krasFinalized: boolean,        // Supervisor/Admin marks final
    krasFinalizedAt: Date,
    krasFinalizedBy: ObjectId,

    // PLANNED: Move dimensionWeights here (per-person, not per-team)
    dimensionWeights: { ... },
    functionalKRAs[]: {
      kra, kpis[]: { kpi, target },
      reportsGenerated[]: { type, value, fileName },
      pilotWeight, pilotScore,
      r1Weight, r1Score, r1ActualPerf, r1ReviewedBy,
      r2Weight, r2Score, r2ActualPerf, r2ReviewedBy,
      r3Weight, r3Score, r3ActualPerf, r3ReviewedBy,
      r4Weight, r4Score, r4ActualPerf, r4ReviewedBy,
      averageScore, editCount, isScoreLocked, scoreLockedAt, scoreLockedBy
    },
    organizationalKRAs[]: {
      coreValues,
      r1Score, r1CriticalIncident,
      // ... same for R2-R4
      averageScore, editCount, isScoreLocked, scoreLockedAt, scoreLockedBy
    },
    selfDevelopmentKRAs[]: {
      areaOfConcern, actionPlanInitiative,
      // ... same for Pilot-R4
      averageScore, editCount, isScoreLocked, scoreLockedAt, scoreLockedBy
    },
    developingOthersKRAs[]: {
      person, areaOfDevelopment,
      // ... same for Pilot-R4
      averageScore, editCount, isScoreLocked, scoreLockedAt, scoreLockedBy
    }
  },
  dimensionWeights: { ... },  // CURRENT: Team-level (to be deprecated)
  createdBy
}
```

### ReviewCycle Model
```typescript
{
  organizationId,
  frequency, // (monthly|quarterly|biannual|annual)
  startDate, nextReviewDate,
  currentReviewPeriod, // (1-4)
  isActive,
  r1Date, r1Facilitator,
  r2Date, r2Facilitator,
  r3Date, r3Facilitator,
  r4Date, r4Facilitator
}
```

### Other Models
- **Invite**: Token-based invitations with shortCode
- **Notification**: User notifications with types (info|success|warning|error|review_period_start|system)
- **OTP**: 6-digit codes with 10-minute expiry, max 3 attempts
- **ActionPlan**: Employee action plans (employeeId, reviewPeriod, items[], acknowledgedAt)
- **Feedback**: Mid-cycle notes and feedback (employeeId, addedBy, type, content, reviewPeriod, isPrivate)
- **ReviewLock**: Locked review tracking (employeeId, reviewPeriod, lockedBy, per-dimension lock flags)
- **Enquiry**: Contact enquiries (email, name, company, message, status)
- **PlanYourGoals**: User goal planning (userId, organizationId, year, goals[])

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Sign up new user |
| POST | `/signup-with-invite` | Sign up with invite token |
| POST | `/signup-with-org` | Sign up with org code |
| POST | `/login` | Login with mobile + access code |
| POST | `/verify-otp` | Verify mobile OTP |
| POST | `/verify-otp/mobile` | Verify single OTP |
| POST | `/resend-otp/mobile` | Resend mobile OTP |
| POST | `/access-code` | Set access code |
| POST | `/team-code` | Join team by code |
| POST | `/set-password` | Set password |

### Boss Routes (`/api/boss`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/managers` | Create manager |
| GET | `/managers` | Get all managers |
| GET | `/organization` | Get organization details |
| GET | `/analytics` | Get department performance |
| POST | `/managers/:id/kras/functional` | Add functional KRA |
| POST | `/managers/:id/kras/organizational` | Add organizational KRA |
| POST | `/managers/:id/kras/self-development` | Add self-dev KRA |
| GET | `/managers/:id/kras` | Get manager KRAs |
| GET | `/my-kras` | Get boss's own KRAs |

### Manager Routes (`/api/manager`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/employees` | Create employee |
| GET | `/employees` | Get all employees |
| GET | `/team-performance` | Get team performance |
| POST | `/employees/:id/kras/functional` | Add functional KRA |
| POST | `/employees/:id/kras/organizational` | Add organizational KRA |
| POST | `/employees/:id/kras/self-development` | Add self-dev KRA |
| GET | `/employees/:id/kras` | Get employee KRAs |
| PUT | `/employees/:id/kras/finalize` | **Finalize all KRAs** for employee |
| GET | `/my-kras` | Get manager's own KRAs |

### Employee Routes (`/api/employee`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/performance` | Get performance data |
| POST | `/acknowledge` | Acknowledge review |
| GET | `/kras` | Get own KRAs |
| PUT | `/kras` | Save own KRAs |
| GET | `/dimension-weights` | Get dimension weights |
| PUT | `/dimension-weights` | Save dimension weights |

### Team Routes (`/api/team`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/code` | Get team code |
| GET | `/members` | Get team members |
| POST | `/members` | Add team member |
| PUT | `/members/:idx` | Update team member |
| DELETE | `/members/:idx` | Delete team member |
| GET | `/dimension-weights` | Get team dimension weights |
| PUT | `/dimension-weights` | Update team dimension weights |
| POST | `/members/:idx/kras` | Add functional KRA |
| PUT | `/members/:idx/kras/:kraIdx` | Update functional KRA |
| DELETE | `/members/:idx/kras/:kraIdx` | Delete functional KRA |
| POST | `/members/:idx/kras/:kraIdx/lock` | Lock KRA scores |
| POST | `/members/:idx/organizational` | Add organizational KRA |
| PUT | `/members/:idx/organizational/:dimIdx` | Update organizational KRA |
| POST | `/members/:idx/organizational/:dimIdx/lock` | Lock organizational scores |
| POST | `/members/:idx/self-development` | Add self-development |
| PUT | `/members/:idx/self-development/:devIdx` | Update self-development |
| POST | `/members/:idx/self-development/:devIdx/lock` | Lock self-dev scores |
| POST | `/members/:idx/developing-others` | Add developing others |
| PUT | `/members/:idx/developing-others/:devIdx` | Update developing others |
| POST | `/members/:idx/developing-others/:devIdx/lock` | Lock dev-others scores |

### Client Admin Routes (`/api/client-admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bosses` | Create boss |
| GET | `/bosses` | Get all bosses |
| GET | `/organization` | Get organization |
| GET | `/users` | Get org users |
| GET | `/teams-for-invite` | Get teams for invite |
| POST | `/users/bulk-upload` | Bulk upload users |
| POST | `/bosses/:id/kras/functional` | Add boss functional KRA |
| PUT | `/bosses/:id/kras/functional/:idx` | Update boss KRA |
| DELETE | `/bosses/:id/kras/functional/:idx` | Delete boss KRA |
| POST | `/bosses/:id/kras/functional/:idx/lock` | Lock boss KRA scores |
| POST | `/bosses/:id/kras/organizational` | Add boss org KRA |
| POST | `/bosses/:id/kras/self-development` | Add boss self-dev KRA |
| GET | `/bosses/:id/kras` | Get boss KRAs |
| GET | `/bosses/:id/team-member-index` | Get boss member index |
| GET | `/analytics` | Get CSA analytics |
| GET | `/hierarchy` | Get org hierarchy view |
| GET | `/export` | Export performance data (PDF) |

### Reviewer Routes (`/api/reviewer`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/organizations` | Get assigned organizations |
| GET | `/organizations/:orgId/employees` | Get org employees |
| GET | `/employees` | Get all employees to review |
| GET | `/employees/:id` | Get employee for scoring |
| POST | `/employees/:id/scores` | Submit scores |
| POST | `/employees/:id/lock` | Lock review |

### Organization Routes (`/api/organizations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create organization |
| GET | `/` | Get all organizations |
| GET | `/analytics` | Admin analytics |
| GET | `/resolve?code=XXX` | Resolve org code (for Join flow) |
| POST | `/client-admins` | Create client admin |
| GET | `/client-admins` | Get client admins |
| GET | `/dimension-weights` | Get dimension weights |
| PUT | `/dimension-weights` | Update dimension weights |
| GET | `/:id` | Get organization by ID |
| PUT | `/:id` | Update organization |
| DELETE | `/:id` | Delete organization |
| POST | `/:id/assign-reviewer` | Assign reviewer to org |

### User Routes (`/api/user`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get user profile |
| GET | `/` | Get user by email |
| GET | `/list` | List users |
| GET | `/my-report` | Download personal performance PDF |
| POST | `/fix-roles` | Fix user roles (admin utility) |
| PUT | `/profile` | Update user profile |

### Notification Routes (`/api/notifications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user notifications |
| GET | `/count` | Get unread count |
| POST | `/` | Create notification |
| PUT | `/:id/read` | Mark as read |
| PUT | `/read-all` | Mark all as read |

### Other Routes
| Route | Description |
|-------|-------------|
| `/api/enquiry` | Enquiry form (POST /, GET /, PUT /:id) |
| `/api/onboarding` | Onboarding flow (GET /status, PUT /step, PUT /complete, POST /pyg, GET /pyg) |
| `/api/feedback` | Feedback (POST /mid-cycle-note, GET /employee/:id, POST /add) |
| `/api/invites` | Invites (POST /, GET /resolve) |
| `/api/review-cycles` | Review cycles (POST /, GET /organization/:orgId, PUT /:id, GET /check, POST /:id/trigger) |

> **Authentication**: All endpoints use `userId` query parameter for authentication. No JWT/session middleware.

---

## Frontend Structure

### Client-Side Routing

```
/                                    → Home
/auth/signup                         → Sign up
/auth/login                          → Login
/auth/join                           → Join via invite/org code
/auth/join/:token                    → Join via invite token
/auth/otp-verify                     → OTP verification
/auth/team-code                      → Team code entry
/auth/access-code                    → Access code setup
/auth/enquiry-or-signup              → Enquiry or signup choice
/auth/set-password                   → Set password
/onboarding                          → User onboarding flow
/app                                 → Unified dashboard (planned)

/dashboard                           → Dashboard layout (nested routes below)
  /dashboard/performance             → Performance (4D Index, trends)
  /dashboard/teams                   → Teams management
  /dashboard/calendar                → Review cycle calendar
  /dashboard/settings                → Profile settings
  /dashboard/notifications           → Notifications

/admin/dashboard                     → Platform Admin Dashboard
/admin/organizations/:id             → Organization detail view
/client-admin/dashboard              → Client Admin Dashboard
/dashboard/boss                      → Boss Dashboard
/dashboard/boss/review-cycles        → Review cycle config
/dashboard/manager                   → Manager Dashboard
/dashboard/manager/team/:memberId    → Team member KRAs
/dashboard/manager/mid-cycle-notes   → Mid-cycle notes
/dashboard/employee                  → Employee Dashboard
/dashboard/employee/feedback         → Feedback history
/reviewer/dashboard                  → Reviewer Dashboard
/reviewer/scoring/:employeeId        → Score employee
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `Layout.tsx` | Main layout wrapper |
| `Dashboard.tsx` | Dashboard layout with header and side menu |
| `KRAForm.tsx` | Form for creating/editing KRAs with KPI management |
| `TeamMemberCard.tsx` | Card for displaying team members |

### State Management
- **No global state library** (no Redux/Zustand)
- **Local state** with `useState` and `useEffect`
- **localStorage** for: `userId`, `userRole`
- **Direct fetch()** calls to `/api/*` endpoints

---

## Key Business Logic

### Score Calculations (`/server/src/utils/calculations.ts`)

```typescript
// Functional: Weighted average
functionalScore = SUMPRODUCT(scores, weights) / SUM(weights)

// Organizational/SelfDev/DevOthers: Simple average
score = AVERAGE(allScores)

// 4D Index
index4D = (func*funcWeight + org*orgWeight + self*selfWeight + dev*devWeight) / 100
```

### Business Rules

1. **KRA Edit Limit**: KRAs can only be edited once after creation (`editCount`)
2. **Score Locking**: Once locked (`isScoreLocked`), scores cannot be modified
3. **Period Restriction**: Only current review period is editable
4. **Weight Validation**: Functional KRA weights must sum to 100% per period
5. **Dimension Weight Validation**: All 4 dimension weights must sum to 100
6. **Proof Types**: Drive links or file uploads (JPEG, PNG, PDF, max 10MB)

### KRA Finalization
- **Purpose**: Prevent further edits to KRAs once agreed upon.
- **Process**:
  1. Member/Employee marks KRAs as "Ready for Review" (`krasReadyForReview = true`)
  2. Supervisor reviews and clicks "Finalize KRAs"
  3. System sets `krasFinalized = true`, records timestamp and user
  4. System locks ALL individual KRAs (`isScoreLocked = true`)
- **Status Fields**: `krasFinalized`, `krasFinalizedAt`, `krasFinalizedBy` in `membersDetails`

### Code Generation
- **Organization Code**: 6-8 alphanumeric uppercase characters
- **Team Code**: 4-8 alphanumeric uppercase characters
- **OTP**: 6 digits, 10-minute expiry, max 3 attempts

---

## File Structure

```
LCPL/
├── server/
│   ├── src/
│   │   ├── controllers/       # Route handlers (18 controllers)
│   │   │   ├── authController.ts
│   │   │   ├── bossController.ts
│   │   │   ├── managerController.ts
│   │   │   ├── employeeController.ts
│   │   │   ├── clientAdminController.ts
│   │   │   ├── reviewerController.ts
│   │   │   ├── organizationController.ts
│   │   │   ├── userController.ts
│   │   │   ├── teamController.ts
│   │   │   ├── feedbackController.ts
│   │   │   ├── notificationController.ts
│   │   │   ├── reviewCycleController.ts
│   │   │   ├── onboardingController.ts
│   │   │   ├── enquiryController.ts
│   │   │   ├── inviteController.ts
│   │   │   ├── accessCodeController.ts
│   │   │   ├── dimensionController.ts  (used by teamRoutes)
│   │   │   └── kraController.ts        (used by teamRoutes)
│   │   ├── models/            # Mongoose schemas (12 models)
│   │   │   ├── User.ts
│   │   │   ├── Organization.ts
│   │   │   ├── Team.ts
│   │   │   ├── ReviewCycle.ts
│   │   │   ├── ActionPlan.ts
│   │   │   ├── Feedback.ts
│   │   │   ├── ReviewLock.ts
│   │   │   ├── Enquiry.ts
│   │   │   ├── PlanYourGoals.ts
│   │   │   ├── Invite.ts
│   │   │   ├── Notification.ts
│   │   │   └── OTP.ts
│   │   ├── routes/            # Express routes (15 modules)
│   │   ├── services/          # Business logic
│   │   │   ├── authService.ts
│   │   │   ├── inviteService.ts
│   │   │   └── exportService.ts
│   │   ├── utils/             # Utility functions
│   │   │   ├── calculations.ts    # Score calculations
│   │   │   ├── kraCalculations.ts
│   │   │   ├── validation.ts      # Zod schemas
│   │   │   └── ...
│   │   ├── middleware/
│   │   ├── config/
│   │   └── index.ts           # Entry point
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── components/        # Reusable components (Layout, Dashboard, KRAForm, etc.)
│   │   ├── pages/
│   │   │   ├── Auth/          # SignUp, Login, Join, OTPVerify, TeamCode, AccessCode,
│   │   │   │                  # SetPassword, EnquiryOrSignUp
│   │   │   ├── Dashboard/     # Boss/, Manager/, Employee/, TeamMember/,
│   │   │   │                  # Settings/, Calendar/, Performance/, Teams/,
│   │   │   │                  # Notifications/, MidCycleNotes/, FeedbackHistory/
│   │   │   ├── Admin/         # AdminDashboard, OrganizationDetail
│   │   │   ├── ClientAdmin/   # ClientAdminDashboard
│   │   │   ├── Reviewer/      # ReviewerDashboard, Scoring
│   │   │   └── Onboarding/    # Onboarding flow
│   │   ├── utils/
│   │   ├── styles/            # CSS Modules, design-system.css, DashboardBase.module.css
│   │   └── App.tsx            # Main routing (30+ routes)
│   ├── vite.config.ts
│   └── package.json
│
└── PROJECT_CONTEXT.md         # This file
```

---

## Common Operations

### Adding a New KRA Type
1. Update Team model in `/server/src/models/Team.ts`
2. Add calculation in `/server/src/utils/calculations.ts`
3. Add endpoints in relevant controller
4. Add routes in relevant route file
5. Update frontend forms

### Adding a New Role
1. Update User model role enum
2. Add hierarchyLevel mapping
3. Create controller with role-specific logic
4. Create routes with authorization checks
5. Add frontend dashboard

### Modifying Score Calculation
- Primary file: `/server/src/utils/calculations.ts`
- Function: `calculateMemberScores()`
- Test thoroughly - affects entire system

### Export Data
- Service: `/server/src/services/exportService.ts`
- Org-wide export (CSA): `GET /api/client-admin/export?format=pdf` (PDF only in UI)
- Personal report: `GET /api/user/my-report` (PDF, available to all users)

---

## Environment Variables

```env
# Current (MVP)
MONGODB_URI=mongodb://localhost:27017/performance-management
PORT=3000
NODE_ENV=development

# Planned (Production) - TBD
# SMS_PROVIDER_API_KEY=xxx     # For OTP delivery
# EMAIL_SERVICE_API_KEY=xxx    # For notifications
# CLOUD_STORAGE_KEY=xxx        # For file uploads
# JWT_SECRET=xxx               # For secure auth
```

---

## Quick Reference

| Concept | Location |
|---------|----------|
| 4D Index calculation | `/server/src/utils/calculations.ts` |
| KRA data structure | `/server/src/models/Team.ts` |
| Role permissions | Inline checks in controllers |
| Dimension weights | Currently at `Team.dimensionWeights` (team-level); PLANNED: move to `membersDetails[].dimensionWeights` (per-person) |
| Review periods | ReviewCycle model |
| Score locking | `isScoreLocked` field on each KRA type |
| Authentication | `userId` query parameter (temporary) |

### Key Business Rules

| Rule | Detail |
|------|--------|
| Dimension weights | Per-person, set by supervisor, fixed for year |
| Weight override | Only CSA can change after initial setup |
| KRA entry | Supervisor sets KRAs, employee adds proof |
| Visibility | Supervisor sees entire subtree (reports + their reports) |

### Development Priority

| Focus | Files |
|-------|-------|
| CSA Dashboard | `/client/src/pages/ClientAdmin/`, `/server/src/controllers/clientAdminController.ts` |
| Platform Admin | `/client/src/pages/Admin/`, `/server/src/controllers/organizationController.ts` |
| Score Calculations | `/server/src/utils/calculations.ts` |
| Exports | `/server/src/services/exportService.ts` |
| **PLANNED: Per-person weights** | `/server/src/models/Team.ts` - move `dimensionWeights` into `membersDetails[]` |
| **PLANNED: Supervisor/Member** | Replace role-based dashboards with capability-based tabs |

---

## Development Guidelines

### Coding Standards

1. **Clean Code**: Write readable, self-documenting code with meaningful names
2. **TypeScript Strict**: Always use proper types, avoid `any`
3. **Security First**: Validate all inputs, sanitize data, prepare for auth upgrade
4. **Error Handling**: Use try-catch, return meaningful error messages

### When Making Changes

1. **Read this document first** - Understand the 4D system before modifying scores/calculations
2. **Check both backend AND frontend** - Some features may exist only in backend
3. **Respect the role hierarchy** - Ensure proper authorization checks
4. **Test score calculations** - They affect the entire evaluation system
5. **Don't break MVP** - Focus on completing core features before adding new ones

### API Conventions

```typescript
// Standard response format
{ status: 'success' | 'error', data: {...}, message?: string }

// Authentication (temporary - will be upgraded)
GET /api/endpoint?userId=xxx

// Error handling
throw new Error('message') // Caught by errorHandler middleware
```

### Frontend Conventions

```typescript
// API calls use fetch directly
const response = await fetch(`/api/endpoint?userId=${userId}`);
const data = await response.json();

// User data in localStorage
localStorage.getItem('userId')
localStorage.getItem('userRole')
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Controllers | `{role}Controller.ts` | `managerController.ts` |
| Models | `{Entity}.ts` (PascalCase) | `Organization.ts` |
| Routes | `{role}Routes.ts` | `managerRoutes.ts` |
| Utils | `{purpose}.ts` (camelCase) | `calculations.ts` |
| Components | `{Name}.tsx` (PascalCase) | `KRAForm.tsx` |
| Pages | `{Name}.tsx` (PascalCase) | `ManagerDashboard.tsx` |

### Things to Avoid

- Don't hardcode dimension weights - they're **per-person**, not per-org
- Don't allow KRA entry without weights - weights MUST be set first
- Don't let anyone except CSA change weights after setup
- Don't skip validation - use Zod schemas
- Don't modify locked scores - check `isScoreLocked` first
- Don't ignore `editCount` - KRAs can only be edited once
- Don't bypass role checks - always verify user permissions

---

*Last updated: February 2026*
