# 4D Performance Management System
## Complete Flow Guide & Presentation Document

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [System Architecture](#system-architecture)
3. [User Roles & Hierarchy](#user-roles--hierarchy)
4. [Complete Setup Flow](#complete-setup-flow)
5. [Review Cycle System](#review-cycle-system)
6. [Role-Based Dashboards](#role-based-dashboards)
7. [Key Features](#key-features)
8. [System Flow Diagram](#system-flow-diagram)
9. [Quick Start Guide](#quick-start-guide)

---

## 🎯 System Overview

### What is 4D Performance Management System?

A comprehensive, multi-tier organizational performance management platform that enables:
- **Structured Performance Reviews** across 4 KRA dimensions
- **Automated Review Cycles** with configurable frequencies
- **Role-Based Dashboards** for different organizational levels
- **Continuous Feedback Loop** between employees, managers, and leadership
- **Data-Driven Analytics** for strategic decision-making

### Core Capabilities

✅ **Multi-Organization Management** - Platform admin can manage multiple organizations  
✅ **Hierarchical Structure** - Boss → Manager → Employee hierarchy  
✅ **Flexible Review Cycles** - Monthly, Quarterly, Biannual, or Annual  
✅ **4-Dimensional Scoring** - Functional, Organizational, Self Development, Developing Others  
✅ **Real-Time Notifications** - Automated alerts for review periods  
✅ **Performance Analytics** - Department comparisons and trend analysis  

---

## 🏗️ System Architecture

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (Build Tool)
- React Router v6
- CSS Modules

**Backend:**
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- RESTful API

**Key Features:**
- Real-time notifications
- Role-based access control
- Automated review period triggers
- Multi-tenant organization isolation

---

## 👥 User Roles & Hierarchy

### Organizational Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│              PLATFORM ADMIN (Level 0)                    │
│  • Manages all organizations                            │
│  • Creates organizations                                │
│  • Assigns reviewers                                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              ORGANIZATION                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  BOSS (Level 1)                                    │  │
│  │  • Creates managers                                │  │
│  │  • Configures review cycles                        │  │
│  │  • Views org-wide analytics                        │  │
│  └───────────────────────────────────────────────────┘  │
│                        │                                  │
│                        ▼                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  MANAGER (Level 2) - Acts as Department            │  │
│  │  • Creates employees                               │  │
│  │  • Manages team performance                        │  │
│  │  • Adds mid-cycle notes                            │  │
│  └───────────────────────────────────────────────────┘  │
│                        │                                  │
│                        ▼                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  EMPLOYEE (Level 3)                                │  │
│  │  • Views performance scores                         │  │
│  │  • Creates action plans                             │  │
│  │  • Acknowledges reviews                             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              REVIEWER (External)                          │
│  • Scores employees across all KRA dimensions            │
│  • Locks reviews after completion                        │
│  • Assigned to organizations by Platform Admin          │
└─────────────────────────────────────────────────────────┘
```

### Role Responsibilities

| Role | Level | Key Responsibilities |
|------|-------|---------------------|
| **Platform Admin** | 0 | Manage organizations, assign reviewers, view system analytics |
| **Boss** | 1 | Create managers, configure review cycles, view org analytics |
| **Manager** | 2 | Create employees, manage team, add mid-cycle feedback |
| **Employee** | 3 | View scores, create action plans, acknowledge reviews |
| **Reviewer** | External | Score employees, lock reviews, manage KRA dimensions |

---

## 🚀 Complete Setup Flow

### Phase 1: Platform Admin Setup

**Step 1: Create Organization**
- Navigate to `/admin/dashboard`
- Click "+ Create Organization"
- Enter: Organization Name, Industry, Size, Contact
- Optional: Boss Email (if boss already exists)
- System creates isolated workspace with "trial" status

**Step 2: Assign Reviewer**
- Click on organization card
- Assign reviewer (must exist as user with role "reviewer")
- Reviewer can now score employees in this organization

**Result:** Organization is ready for boss setup

---

### Phase 2: Boss Setup

**Step 1: Boss Login**
- Boss logs in at `/dashboard/boss`
- Sees organization dashboard

**Step 2: Create Managers**
- Click "+ Create Manager"
- Enter: Name, Email, Mobile, Designation (optional)
- System creates manager account and links to organization

**Step 3: Configure Review Cycle**
- Navigate to `/dashboard/boss/review-cycles`
- Select frequency: Monthly, Quarterly, Biannual, or Annual
- Set start date
- System calculates next review date automatically

**Step 4: Configure Dimension Weights** ⚠️ **REQUIRED**
- Navigate to `/dashboard/settings`
- Set weights for 4 dimensions (must sum to 100%):
  - **Functional Dimension** (Mandatory)
  - **Organizational Dimension** (Mandatory)
  - **Self Development** (Mandatory)
  - **Developing Others** (Optional)
- **Note:** Employees cannot be scored until weights are configured

**Result:** Organization is ready for manager and employee setup

---

### Phase 3: Manager Setup

**Step 1: Manager Login**
- Manager logs in at `/dashboard/manager`
- Sees team dashboard

**Step 2: Create Employees**
- Click "+ Create Employee"
- Enter: Name, Email, Mobile, Designation (optional)
- System automatically:
  - Links employee to organization, manager, and boss
  - Assigns organization's reviewer to employee
  - Establishes complete hierarchy

**Result:** Team is ready for performance reviews

---

## 🔄 Review Cycle System

### Review Period Flow

```
┌─────────────────────────────────────────────────────────┐
│                    PILOT PERIOD                         │
│  • Initial setup phase                                  │
│  • Define KRAs and baseline weights                     │
│  • Establish performance framework                      │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              REVIEW PERIOD 1 STARTS                      │
│  • System sends notifications to all users              │
│  • Reviewer enters scores for all dimensions            │
│  • Reviewer locks review                                │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              SCORES DISTRIBUTED                          │
│  • Available in Employee dashboard                      │
│  • Available in Manager dashboard                      │
│  • Available in Boss dashboard                         │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              FEEDBACK LOOP                               │
│  • Employee acknowledges & creates action plan          │
│  • Manager adds mid-cycle notes                         │
│  • Boss reviews analytics                               │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              NEXT PERIOD (2 → 3 → 4 → Reset)            │
│  • Auto-triggered when nextReviewDate arrives           │
│  • Or manually triggered by Boss                        │
└─────────────────────────────────────────────────────────┘
```

### Review Period Configuration

**Frequency Options:**
- **Monthly** - Every month
- **Quarterly** - Every 3 months
- **Biannual** - Every 6 months
- **Annual** - Every year

**Periods:**
- **Pilot Period** - Initial setup
- **Period 1, 2, 3, 4** - Active review periods (cycles through)
- After Period 4, resets to Period 1

**Auto-Trigger:**
- System checks review cycles periodically
- Automatically triggers when `nextReviewDate` arrives
- Sends notifications to all users in organization
- Can also be manually triggered by Boss

---

## 📊 Role-Based Dashboards

### Employee Dashboard
**URL:** `/dashboard/employee`  
**Color Scheme:** Light Green (`#d4edda`)

**Features:**
- 📈 **Current Score** - Large display of performance score
- 📉 **Historical Trends** - Visual chart across review periods
- 📅 **Next Review Date** - When next period starts
- 🔢 **Current Period** - Active review period indicator
- 💬 **Feedback & Comments** - Reviewer feedback
- ✅ **Action Plan** - Create and save improvement plans
- ✍️ **Acknowledge Review** - Commit to action plan

---

### Manager Dashboard
**URL:** `/dashboard/manager`  
**Color Scheme:** Light Blue (`#cce5ff`)

**Features:**
- 👥 **Team Size** - Total employees in team
- 📊 **Average Team Score** - Overall team performance
- 🏆 **Top Performers** - Ranked top 3 employees
- ⚠️ **Needs Improvement** - Bottom 3 employees
- 📝 **Employee List** - All employees with individual scores
- ➕ **Create Employees** - Add new team members
- 📌 **Mid-Cycle Notes** - Add feedback during review period

---

### Boss Dashboard
**URL:** `/dashboard/boss`  
**Color Scheme:** Light Red (`#f8d7da`)

**Features:**
- 📈 **Organization Overview:**
  - Total managers
  - Total employees
  - Number of departments
  - Organization average score
- 🏢 **Department Comparisons:**
  - Ranked list by average score
  - Department scores and employee counts
  - Drill-down capability
- ➕ **Create Managers** - Add new managers
- ⚙️ **Review Cycle Configuration** - Manage review cycles

---

### Reviewer Dashboard
**URL:** `/reviewer/dashboard`

**Features:**
- 👥 **Employee List** - All employees in assigned organizations
- 📝 **Scoring Interface** - Enter scores for all KRA dimensions
- 🔒 **Lock Reviews** - Finalize and timestamp reviews
- 📊 **Period Selection** - Pilot, R1, R2, R3, or R4

---

## ⭐ Key Features

### 1. Four-Dimensional KRA System

**Functional Dimension**
- Job-specific Key Result Areas
- Weighted scoring per KRA
- Actual performance notes
- KPI targets and reports

**Organizational Dimension**
- Core values assessment
- Critical incident tracking
- Score per core value

**Self Development**
- Areas of concern identification
- Action plan initiatives
- Improvement tracking

**Developing Others** (Optional)
- People development tracking
- Development areas
- Score and reasoning

### 2. Dimension Weight Configuration

- **Mandatory Dimensions:** Functional, Organizational, Self Development
- **Optional Dimension:** Developing Others
- **Total Must Equal:** 100%
- **Configuration:** Boss/Admin in Settings
- **Impact:** Determines final performance score calculation

### 3. Automated Review Cycles

- **Configurable Frequencies:** Monthly, Quarterly, Biannual, Annual
- **Auto-Trigger:** System automatically starts next period
- **Manual Override:** Boss can trigger manually
- **Notifications:** All users notified when period starts
- **Period Tracking:** Pilot + 4 review periods (cycles through)

### 4. Real-Time Notifications

- **Review Period Start** - Automatic notifications
- **Unread Count** - Badge on notification icon
- **Auto-Refresh** - Updates every 30 seconds
- **Mark as Read** - Individual or bulk actions
- **Notification Center** - Centralized at `/dashboard/notifications`

### 5. Performance Analytics

**Boss Level:**
- Organization-wide metrics
- Department comparisons
- Ranked performance lists
- Average score calculations

**Manager Level:**
- Team performance metrics
- Top/bottom performers
- Individual employee scores
- Trend analysis

**Employee Level:**
- Personal score history
- Period-by-period trends
- Feedback and comments
- Action plan tracking

### 6. Feedback Loop System

```
Employee → Acknowledges Review → Creates Action Plan
    ↓
Manager → Reviews Action Plan → Adds Mid-Cycle Notes
    ↓
Boss → Reviews Analytics → Makes Strategic Decisions
    ↓
Next Review Period → Cycle Continues
```

---

## 🔄 System Flow Diagram

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM ADMIN                            │
│  1. Create Organization                                       │
│  2. Assign Reviewer                                           │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                        BOSS                                  │
│  1. Login to Dashboard                                       │
│  2. Create Managers                                          │
│  3. Configure Review Cycle                                    │
│  4. Configure Dimension Weights                              │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      MANAGER                                 │
│  1. Login to Dashboard                                       │
│  2. Create Employees                                         │
│  3. View Team Performance                                    │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    REVIEW CYCLE STARTS                      │
│  • System sends notifications                                │
│  • Reviewer enters scores                                    │
│  • Reviewer locks review                                     │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    SCORES AVAILABLE                         │
│  • Employee sees score & feedback                            │
│  • Manager sees team performance                             │
│  • Boss sees org analytics                                   │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    FEEDBACK LOOP                             │
│  • Employee acknowledges & creates action plan               │
│  • Manager adds mid-cycle notes                              │
│  • Boss reviews and makes decisions                          │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT PERIOD                               │
│  • Auto-triggered or manual                                  │
│  • Cycle continues (1→2→3→4→Reset)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### For Platform Admin

1. **Sign Up** → `/auth/signup` (Select "Platform Admin")
2. **Verify OTP** → Complete email and mobile verification
3. **Access Dashboard** → `/admin/dashboard`
4. **Create Organization** → Fill form and submit
5. **Assign Reviewer** → Click organization card and assign

### For Boss

1. **Login** → `/auth/login` (or signup if new)
2. **Access Dashboard** → `/dashboard/boss`
3. **Create Managers** → Click "+ Create Manager"
4. **Configure Review Cycle** → `/dashboard/boss/review-cycles`
5. **Set Dimension Weights** → `/dashboard/settings`

### For Manager

1. **Login** → `/auth/login` (created by Boss)
2. **Access Dashboard** → `/dashboard/manager`
3. **Create Employees** → Click "+ Create Employee"
4. **View Team Performance** → Dashboard shows metrics

### For Employee

1. **Login** → `/auth/login` (created by Manager)
2. **Access Dashboard** → `/dashboard/employee`
3. **View Performance** → See scores and feedback
4. **Create Action Plan** → Acknowledge review

### For Reviewer

1. **Login** → `/auth/login` (role: reviewer)
2. **Access Dashboard** → `/reviewer/dashboard`
3. **Select Employee** → Click on employee card
4. **Enter Scores** → Fill all KRA dimensions
5. **Lock Review** → Finalize and timestamp

---

## 📱 Key URLs Reference

### Authentication
- **Sign Up:** `/auth/signup`
- **Login:** `/auth/login`
- **OTP Verify:** `/auth/otp-verify`
- **Access Code:** `/auth/access-code`
- **Team Code Join:** `/auth/team-code`

### Dashboards
- **Platform Admin:** `/admin/dashboard`
- **Boss:** `/dashboard/boss`
- **Manager:** `/dashboard/manager`
- **Employee:** `/dashboard/employee`
- **Reviewer:** `/reviewer/dashboard`

### Configuration
- **Review Cycles:** `/dashboard/boss/review-cycles`
- **Settings:** `/dashboard/settings`
- **Notifications:** `/dashboard/notifications`
- **Mid-Cycle Notes:** `/dashboard/manager/mid-cycle-notes`

---

## 🎯 System Highlights

### ✅ What Makes This System Unique

1. **Multi-Tier Hierarchy** - Clear organizational structure with role-based access
2. **Flexible Review Cycles** - Configurable frequencies to match organizational needs
3. **4-Dimensional Scoring** - Comprehensive performance evaluation
4. **Automated Workflows** - System handles period triggers and notifications
5. **Real-Time Analytics** - Data-driven insights at every level
6. **Continuous Feedback** - Ongoing improvement cycle, not just annual reviews
7. **Pilot Period Support** - Initial setup phase for establishing baselines
8. **Dimension Weighting** - Customizable performance calculation

### 📊 Performance Metrics Tracked

- Individual employee scores
- Team/department averages
- Organization-wide metrics
- Historical trends
- Period-over-period comparisons
- Top/bottom performers
- Improvement tracking

---

## 🔧 Technical Specifications

### System Requirements

- **Node.js:** >= 18.0.0
- **MongoDB:** Local or connection string
- **Browser:** Modern browser with JavaScript enabled

### Key Technologies

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB with Mongoose
- **Validation:** Zod schema validation
- **Routing:** React Router v6

---

## 📝 Important Notes

### Prerequisites for Scoring

⚠️ **Before employees can be scored:**
1. Organization must be created
2. Reviewer must be assigned
3. Review cycle must be configured
4. **Dimension weights must be set** (sum to 100%)

### Review Period Flow

1. **Pilot Period** - Initial setup (KRAs and weights)
2. **Period 1-4** - Active review periods
3. **Auto-Trigger** - System automatically starts next period
4. **Manual Override** - Boss can trigger manually
5. **Cycle Reset** - After Period 4, returns to Period 1

### Data Flow

- **Scores** stored per review period (r1, r2, r3, r4)
- **Averages** calculated across periods
- **Trends** tracked historically
- **Analytics** updated in real-time

---

## 🎨 Visual Design System

### Color Schemes by Role

- **Platform Admin:** `#fff3cd` (Light Yellow)
- **Employee:** `#d4edda` (Light Green)
- **Manager:** `#cce5ff` (Light Blue)
- **Boss:** `#f8d7da` (Light Red)

### UI Features

- Responsive design
- Role-based color coding
- Intuitive navigation
- Real-time updates
- Clear visual hierarchy

---

## 📈 Version Information

**Current Version:** 2.1  
**Last Updated:** Latest  
**Status:** Production Ready

### Recent Updates (v2.1)

- ✅ Pilot Period introduced for initial setup
- ✅ Dimension weights configuration (must sum to 100%)
- ✅ Enhanced reviewer API endpoints
- ✅ Team code join flow
- ✅ Managers' teams as "Departments" in analytics
- ✅ 5-period scoring system (Pilot + R1-R4)

---

## 📞 Support & Troubleshooting

### Common Issues

**"User ID is required"**
- Solution: Check localStorage, log in again if needed

**"Only [role] can access this"**
- Solution: Verify user role in database

**"Organization not found"**
- Solution: Ensure organization exists and user is linked

**"Review cycle not found"**
- Solution: Boss must configure review cycle first

**"Reviewer is not assigned"**
- Solution: Platform Admin must assign reviewer

**Scores not appearing**
- Solution: Verify reviewer submitted scores, check if review is locked

---

## 🎓 Summary

### System Overview

The **4D Performance Management System** is a comprehensive platform that enables organizations to:

- ✅ Manage performance reviews across multiple organizational levels
- ✅ Automate review cycles with flexible frequencies
- ✅ Track performance across 4 key dimensions
- ✅ Provide real-time analytics and insights
- ✅ Facilitate continuous feedback and improvement

### Key Benefits

1. **Structured Approach** - Clear hierarchy and defined processes
2. **Automation** - Reduces manual work with automated triggers
3. **Flexibility** - Configurable cycles and dimension weights
4. **Transparency** - Real-time visibility at all levels
5. **Continuous Improvement** - Ongoing feedback loop, not just annual reviews

### Next Steps

1. Set up organization (Platform Admin)
2. Configure review cycles (Boss)
3. Create team structure (Boss → Manager → Employee)
4. Set dimension weights (Boss)
5. Begin Pilot Period (Reviewer)
6. Start Review Cycle 1

---

**Document Version:** 2.1  
**Last Updated:** Latest  
**Purpose:** Presentation & Reference Guide
