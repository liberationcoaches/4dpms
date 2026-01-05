# Performance Management System - Complete Examples

This document provides comprehensive examples showing how each role (Platform Admin → Reviewer → Boss → Manager → Employee) uses the system with realistic data and scenarios.

---

## Example Scenario Setup

We'll follow a complete example with:
- **Organization**: "TechCorp Solutions"
- **Industry**: Technology
- **Size**: 150 employees
- **Reviewer**: Dr. Sarah Johnson
- **Boss**: John Smith (CEO)
- **Manager**: Maria Garcia (Engineering Manager)
- **Employee**: Alex Chen (Software Developer)

---

## 1. Platform Admin Examples

### Example: Platform Admin Dashboard

**URL:** `/admin/dashboard`

**What Platform Admin Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│ Platform Admin Dashboard                          [+ Create] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SYSTEM ANALYTICS                                            │
│ ┌──────────────┐  ┌──────────────┐                         │
│ │Organizations │  │    Users     │                         │
│ │ Total: 12    │  │ Reviewers: 3 │                         │
│ │ Active: 8    │  │ Bosses: 8    │                         │
│ │ Trial: 3     │  │ Managers: 45 │                         │
│ │ Expired: 1   │  │ Employees: 150│                        │
│ └──────────────┘  └──────────────┘                         │
│                                                              │
│ ORGANIZATIONS                                                │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ TechCorp Solutions                    [Trial]        │   │
│ │ Industry: Technology | Size: 150                     │   │
│ │ Contact: admin@techcorp.com                          │   │
│ │ Reviewer: Dr. Sarah Johnson                          │   │
│ │ Boss: John Smith                                     │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Example: Creating Organization

**Action:** Click "+ Create Organization"

**Form Data:**
```json
{
  "name": "TechCorp Solutions",
  "industry": "Technology",
  "size": 150,
  "contact": "admin@techcorp.com",
  "bossEmail": "john.smith@techcorp.com"
}
```

**API Response:**
```json
{
  "status": "success",
  "message": "Organization created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "TechCorp Solutions",
    "industry": "Technology",
    "size": 150,
    "contact": "admin@techcorp.com",
    "subscriptionStatus": "trial",
    "bossId": "507f1f77bcf86cd799439012",
    "reviewerId": null,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Example: Assigning Reviewer

**Action:** Assign Dr. Sarah Johnson as reviewer

**API Request:**
```
POST /api/organizations/507f1f77bcf86cd799439011/assign-reviewer
Body: {
  "reviewerId": "507f1f77bcf86cd799439020"
}
```

**Result:**
- Organization now has reviewer assigned
- Reviewer can see all employees in TechCorp Solutions
- Ready for review cycles

---

## 2. Boss Examples

### Example: Boss Dashboard

**URL:** `/dashboard/boss`

**User:** John Smith (Boss of TechCorp Solutions)

**What Boss Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│ Boss Dashboard                                   [+ Create] │
│ TechCorp Solutions                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ORGANIZATION OVERVIEW                                        │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│ │ Managers │  │Employees │  │Depts     │  │Org Avg   │   │
│ │    5     │  │   145    │  │    5     │  │  82.5    │   │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│ DEPARTMENT COMPARISONS                                       │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ #1  Engineering       45 employees      Avg: 85.2   │   │
│ │ #2  Sales             30 employees      Avg: 83.1   │   │
│ │ #3  Marketing         25 employees      Avg: 81.5   │   │
│ │ #4  HR                20 employees      Avg: 79.8   │   │
│ │ #5  Finance           25 employees      Avg: 78.2   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ MANAGERS                                                     │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Maria Garcia                                          │   │
│ │ Email: maria.garcia@techcorp.com                     │   │
│ │ Mobile: 9876543210                                    │   │
│ │ Created: Jan 10, 2024                                 │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Example: Creating Manager

**Action:** Click "+ Create Manager"

**Form Data:**
```json
{
  "name": "Maria Garcia",
  "email": "maria.garcia@techcorp.com",
  "mobile": "9876543210",
  "designation": "Engineering Manager"
}
```

**API Request:**
```
POST /api/boss/managers?userId=507f1f77bcf86cd799439012
Body: {
  "name": "Maria Garcia",
  "email": "maria.garcia@techcorp.com",
  "mobile": "9876543210",
  "designation": "Engineering Manager"
}
```

**API Response:**
```json
{
  "status": "success",
  "message": "Manager created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Maria Garcia",
    "email": "maria.garcia@techcorp.com",
    "mobile": "9876543210",
    "role": "manager",
    "designation": "Engineering Manager"
  }
}
```

**Result:**
- Manager account created
- Role set to "manager"
- Hierarchy level: 2
- Linked to organization and boss
- Manager can now create employees

### Example: Configuring Review Cycle

**URL:** `/dashboard/boss/review-cycles`

**Action:** Configure Quarterly Review Cycle

**Form Data:**
```json
{
  "frequency": "quarterly",
  "startDate": "2024-01-01"
}
```

**API Response:**
```json
{
  "status": "success",
  "message": "Review cycle configured successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439025",
    "organizationId": "507f1f77bcf86cd799439011",
    "frequency": "quarterly",
    "startDate": "2024-01-01T00:00:00.000Z",
    "nextReviewDate": "2024-04-01T00:00:00.000Z",
    "currentReviewPeriod": 1,
    "isActive": true
  }
}
```

**What Boss Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│ Review Cycle Configuration                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ CURRENT REVIEW CYCLE                                         │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Frequency:        Quarterly                          │   │
│ │ Start Date:        Jan 1, 2024                       │   │
│ │ Current Period:    Period 1                          │   │
│ │ Next Review Date:  Apr 1, 2024                       │   │
│ │ Status:            Active                            │   │
│ │                                                       │   │
│ │        [Trigger Next Review Period]                  │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Manager Examples

### Example: Manager Dashboard

**URL:** `/dashboard/manager`

**User:** Maria Garcia (Engineering Manager)

**What Manager Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│ Manager Dashboard                                [+ Create] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ TEAM PERFORMANCE                                             │
│ ┌──────────────┐  ┌──────────────┐                         │
│ │ Team Size    │  │ Avg Score    │                         │
│ │     15       │  │   85.2       │                         │
│ └──────────────┘  └──────────────┘                         │
│                                                              │
│ TOP PERFORMERS                                               │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ #1  Alex Chen                          Score: 92.5   │   │
│ │ #2  Emily Rodriguez                   Score: 89.3   │   │
│ │ #3  David Kim                         Score: 87.1   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ EMPLOYEES                                                    │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Alex Chen                                            │   │
│ │ Email: alex.chen@techcorp.com                        │   │
│ │ Mobile: 9876543211                                    │   │
│ │ Score: 92.5                                          │   │
│ │ Created: Jan 15, 2024                                │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Example: Creating Employee

**Action:** Click "+ Create Employee"

**Form Data:**
```json
{
  "name": "Alex Chen",
  "email": "alex.chen@techcorp.com",
  "mobile": "9876543211",
  "designation": "Software Developer"
}
```

**API Request:**
```
POST /api/manager/employees?userId=507f1f77bcf86cd799439015
Body: {
  "name": "Alex Chen",
  "email": "alex.chen@techcorp.com",
  "mobile": "9876543211",
  "designation": "Software Developer"
}
```

**API Response:**
```json
{
  "status": "success",
  "message": "Employee created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439018",
    "name": "Alex Chen",
    "email": "alex.chen@techcorp.com",
    "mobile": "9876543211",
    "role": "employee",
    "designation": "Software Developer",
    "managerId": "507f1f77bcf86cd799439015"
  }
}
```

**Result:**
- Employee account created
- Role set to "employee"
- Hierarchy level: 3
- Linked to organization, manager, boss, and reviewer
- Ready for reviews

### Example: Adding Mid-Cycle Note

**URL:** `/dashboard/manager/mid-cycle-notes`

**Action:** Add feedback for Alex Chen

**Form Data:**
```json
{
  "employeeId": "507f1f77bcf86cd799439018",
  "reviewPeriod": 1,
  "note": "Alex has shown excellent progress on the new feature. Keep up the great work! Also, please consider taking the lead on the next sprint planning session."
}
```

**What Manager Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│ Mid-Cycle Notes                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Select Employee: [Alex Chen ▼]                              │
│ Review Period:   [Period 1 ▼]                               │
│                                                              │
│ Note:                                                        │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Alex has shown excellent progress on the new         │   │
│ │ feature. Keep up the great work! Also, please        │   │
│ │ consider taking the lead on the next sprint          │   │
│ │ planning session.                                     │   │
│ │                                                       │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│            [Add Mid-Cycle Note]                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Employee Examples

### Example: Employee Dashboard

**URL:** `/dashboard/employee`

**User:** Alex Chen (Software Developer)

**What Employee Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│ Employee Dashboard                                           │
│ Welcome, Alex Chen                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│ │Current Score │  │ Next Review  │  │   Current    │      │
│ │              │  │     Date     │  │   Period     │      │
│ │    92.5      │  │  Apr 1, 2024 │  │  Period 1    │      │
│ │  Out of 100  │  │              │  │              │      │
│ └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│ HISTORICAL TRENDS                                            │
│ ┌──────────────────────────────────────────────────────┐   │
│ │   Period 1: ████████████████████ 92.5                │   │
│ │   Period 2: (No data yet)                            │   │
│ │   Period 3: (No data yet)                            │   │
│ │   Period 4: (No data yet)                            │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ FEEDBACK & COMMENTS                                          │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Functional Dimension                                  │   │
│ │ ┌──────────────────────────────────────────────┐    │   │
│ │ │ Feature Development                           │    │   │
│ │ │ Excellent work on the new authentication      │    │   │
│ │ │ feature. Completed on time with high quality. │    │   │
│ │ └──────────────────────────────────────────────┘    │   │
│ │                                                       │   │
│ │ ┌──────────────────────────────────────────────┐    │   │
│ │ │ Code Quality                                 │    │   │
│ │ │ Code reviews show improvement. Keep          │    │   │
│ │ │ maintaining high standards.                  │    │   │
│ │ └──────────────────────────────────────────────┘    │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│                    [Create Action Plan]                      │
└─────────────────────────────────────────────────────────────┘
```

### Example: Acknowledging Review

**Action:** Click "Create Action Plan"

**Form Data:**
```json
{
  "actionPlan": "1. Complete advanced React course by end of Q1\n2. Lead next sprint planning session\n3. Mentor junior developer on code review best practices\n4. Improve test coverage to 90% for all new features"
}
```

**API Request:**
```
POST /api/employee/acknowledge?userId=507f1f77bcf86cd799439018
Body: {
  "actionPlan": "1. Complete advanced React course by end of Q1\n2. Lead next sprint planning session\n3. Mentor junior developer on code review best practices\n4. Improve test coverage to 90% for all new features"
}
```

**What Employee Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│ Create Action Plan                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Action Plan:                                                 │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 1. Complete advanced React course by end of Q1       │   │
│ │ 2. Lead next sprint planning session                 │   │
│ │ 3. Mentor junior developer on code review best       │   │
│ │    practices                                         │   │
│ │ 4. Improve test coverage to 90% for all new features │   │
│ │                                                       │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│        [Acknowledge Review & Save Action Plan]              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Reviewer Examples

### Example: Reviewer Dashboard

**URL:** `/reviewer/dashboard`

**User:** Dr. Sarah Johnson (Reviewer for TechCorp Solutions)

**What Reviewer Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│ Reviewer Dashboard                                           │
│ Employees assigned for review                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Alex Chen                                            │   │
│ │ Email: alex.chen@techcorp.com                        │   │
│ │ Mobile: 9876543211                                    │   │
│ │ Organization: TechCorp Solutions                     │   │
│ │ Manager: Maria Garcia                                 │   │
│ │                                                       │   │
│ │              [Enter Scores]                          │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Emily Rodriguez                                      │   │
│ │ Email: emily.r@techcorp.com                          │   │
│ │ Mobile: 9876543212                                    │   │
│ │ Organization: TechCorp Solutions                     │   │
│ │ Manager: Maria Garcia                                 │   │
│ │                                                       │   │
│ │              [Enter Scores]                          │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Example: Entering Scores

**URL:** `/reviewer/scoring/507f1f77bcf86cd799439018`

**Action:** Review Period 1 - Enter scores for Alex Chen

**Form Data:**
```json
{
  "reviewPeriod": 1,
  "scores": {
    "functionalKRAs": [
      {
        "kra": "Feature Development",
        "weight": 40,
        "score": 95,
        "actualPerf": "Excellent work on the new authentication feature. Completed on time with high quality. Showed strong problem-solving skills."
      },
      {
        "kra": "Code Quality",
        "weight": 30,
        "score": 90,
        "actualPerf": "Code reviews show improvement. Maintains high standards. Fewer review comments compared to previous period."
      },
      {
        "kra": "Bug Fixes",
        "weight": 30,
        "score": 92,
        "actualPerf": "Quick response to bug reports. Effective debugging. Good documentation of fixes."
      }
    ],
    "organizationalKRAs": [
      {
        "coreValues": "Team Collaboration",
        "score": 88,
        "criticalIncident": "Actively helped junior developers. Participated well in team meetings."
      },
      {
        "coreValues": "Innovation",
        "score": 90,
        "criticalIncident": "Proposed new testing framework that improved team productivity."
      }
    ],
    "selfDevelopmentKRAs": [
      {
        "areaOfConcern": "Advanced React Skills",
        "score": 85,
        "reason": "Shows initiative in learning. Enrolled in advanced course."
      }
    ],
    "developingOthersKRAs": [
      {
        "person": "Junior Developer - Mike",
        "score": 87,
        "reason": "Provided guidance on code review best practices. Helpful mentor."
      }
    ]
  }
}
```

**What Reviewer Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│ Enter Scores for Alex Chen                    [← Back]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Review Period: [Period 1 ▼]                                 │
│                                                              │
│ FUNCTIONAL DIMENSION KRAs                                    │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Feature Development                                  │   │
│ │ Weight: [40]  Score: [95]                           │   │
│ │ Actual Performance:                                  │   │
│ │ ┌──────────────────────────────────────────────┐    │   │
│ │ │ Excellent work on the new authentication     │    │   │
│ │ │ feature. Completed on time with high quality.│    │   │
│ │ └──────────────────────────────────────────────┘    │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Code Quality                                         │   │
│ │ Weight: [30]  Score: [90]                           │   │
│ │ Actual Performance:                                  │   │
│ │ ┌──────────────────────────────────────────────┐    │   │
│ │ │ Code reviews show improvement. Maintains     │    │   │
│ │ │ high standards.                              │    │   │
│ │ └──────────────────────────────────────────────┘    │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ [Submit Scores]  [Lock Review]                              │
└─────────────────────────────────────────────────────────────┘
```

**API Request:**
```
POST /api/reviewer/employees/507f1f77bcf86cd799439018/scores?userId=507f1f77bcf86cd799439020
Body: {
  "reviewPeriod": 1,
  "scores": { ... }
}
```

**API Response:**
```json
{
  "status": "success",
  "message": "Scores submitted successfully",
  "data": {
    "employeeId": "507f1f77bcf86cd799439018",
    "reviewPeriod": 1,
    "timestamp": "2024-01-20T14:30:00.000Z"
  }
}
```

### Example: Locking Review

**Action:** After entering all scores, click "Lock Review"

**API Request:**
```
POST /api/reviewer/employees/507f1f77bcf86cd799439018/lock?userId=507f1f77bcf86cd799439020
Body: {
  "reviewPeriod": 1
}
```

**API Response:**
```json
{
  "status": "success",
  "message": "Review locked successfully",
  "data": {
    "employeeId": "507f1f77bcf86cd799439018",
    "reviewPeriod": 1,
    "lockedAt": "2024-01-20T14:35:00.000Z",
    "lockedBy": "507f1f77bcf86cd799439020"
  }
}
```

**Result:**
- Review is locked and timestamped
- Scores are now visible in Employee, Manager, and Boss dashboards
- Review cannot be edited

---

## 6. Notifications Example

### Example: Review Period Notification

**Trigger:** When review period starts (automatically or manually)

**What All Users See:**

**URL:** `/dashboard/notifications`

```
┌─────────────────────────────────────────────────────────────┐
│ Notifications                      [2 unread] [Mark All Read]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 📅 Review Period 2 Started                           │   │
│ │ A new review period (Period 2) has started. Please   │   │
│ │ check your dashboard for details.                    │   │
│ │ Review Period 2                                      │   │
│ │ 2 hours ago                                          │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ℹ️ Review Completed                                   │   │
│ │ Your review for Period 1 has been completed and      │   │
│ │ locked. Check your dashboard to view scores.         │   │
│ │ 1 day ago                                            │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Notification Data:**
```json
{
  "_id": "507f1f77bcf86cd799439030",
  "userId": "507f1f77bcf86cd799439018",
  "type": "review_period_start",
  "title": "Review Period 2 Started",
  "message": "A new review period (Period 2) has started. Please check your dashboard for details.",
  "isRead": false,
  "metadata": {
    "reviewPeriod": 2,
    "organizationId": "507f1f77bcf86cd799439011"
  },
  "createdAt": "2024-04-01T00:00:00.000Z"
}
```

---

## 7. Complete Flow Example

### End-to-End Scenario: Q1 2024 Review Cycle

**Timeline:**
- **Jan 1, 2024**: Boss configures quarterly review cycle
- **Jan 1, 2024**: Period 1 starts automatically
- **Jan 20, 2024**: Reviewer completes scores for Alex Chen
- **Jan 21, 2024**: Alex views scores and creates action plan
- **Feb 15, 2024**: Manager adds mid-cycle note
- **Apr 1, 2024**: Period 2 starts automatically

**Step-by-Step:**

1. **Jan 1 - Boss Configures Review Cycle**
   ```
   Boss → /dashboard/boss/review-cycles
   → Configures: Quarterly, Start: Jan 1, 2024
   → System creates review cycle
   → nextReviewDate = Apr 1, 2024
   → currentReviewPeriod = 1
   ```

2. **Jan 1 - Review Period 1 Starts**
   ```
   System automatically triggers Period 1
   → Notifications sent to all users
   → Everyone sees: "Review Period 1 Started"
   ```

3. **Jan 20 - Reviewer Enters Scores**
   ```
   Reviewer → /reviewer/dashboard
   → Clicks "Alex Chen"
   → Enters scores for all KRA dimensions
   → Submits scores
   → Locks review
   → Scores saved to Team model
   ```

4. **Jan 21 - Employee Views Dashboard**
   ```
   Alex → /dashboard/employee
   → Sees current score: 92.5
   → Views feedback and comments
   → Creates action plan
   → Acknowledges review
   ```

5. **Jan 21 - Manager Views Team Performance**
   ```
   Maria → /dashboard/manager
   → Sees Alex's score: 92.5
   → Sees Alex in "Top Performers" list
   → Team average: 85.2
   ```

6. **Jan 21 - Boss Views Org Analytics**
   ```
   John → /dashboard/boss
   → Sees Engineering dept avg: 85.2
   → Engineering ranked #1
   → Org average: 82.5
   ```

7. **Feb 15 - Manager Adds Mid-Cycle Note**
   ```
   Maria → /dashboard/manager/mid-cycle-notes
   → Selects Alex Chen
   → Adds note: "Great progress, keep it up!"
   → Note saved
   ```

8. **Apr 1 - Period 2 Starts**
   ```
   System checks review cycles
   → nextReviewDate reached
   → Increments to Period 2
   → Calculates next date: Jul 1, 2024
   → Sends notifications
   → Cycle continues...
   ```

---

## 8. Data Structure Examples

### Example: User Object (Employee)

```json
{
  "_id": "507f1f77bcf86cd799439018",
  "name": "Alex Chen",
  "email": "alex.chen@techcorp.com",
  "mobile": "9876543211",
  "role": "employee",
  "hierarchyLevel": 3,
  "organizationId": "507f1f77bcf86cd799439011",
  "managerId": "507f1f77bcf86cd799439015",
  "bossId": "507f1f77bcf86cd799439012",
  "reviewerId": "507f1f77bcf86cd799439020",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

### Example: Organization Object

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "TechCorp Solutions",
  "industry": "Technology",
  "size": 150,
  "contact": "admin@techcorp.com",
  "subscriptionStatus": "trial",
  "reviewerId": "507f1f77bcf86cd799439020",
  "bossId": "507f1f77bcf86cd799439012",
  "createdAt": "2024-01-01T10:00:00.000Z"
}
```

### Example: Review Cycle Object

```json
{
  "_id": "507f1f77bcf86cd799439025",
  "organizationId": "507f1f77bcf86cd799439011",
  "frequency": "quarterly",
  "startDate": "2024-01-01T00:00:00.000Z",
  "nextReviewDate": "2024-04-01T00:00:00.000Z",
  "currentReviewPeriod": 1,
  "isActive": true,
  "createdAt": "2024-01-01T10:00:00.000Z"
}
```

### Example: Team Member Details (with Scores)

```json
{
  "name": "Alex Chen",
  "role": "Software Developer",
  "mobile": "9876543211",
  "functionalKRAs": [
    {
      "kra": "Feature Development",
      "r1Weight": 40,
      "r1Score": 95,
      "r1ActualPerf": "Excellent work on the new authentication feature."
    },
    {
      "kra": "Code Quality",
      "r1Weight": 30,
      "r1Score": 90,
      "r1ActualPerf": "Code reviews show improvement."
    }
  ],
  "organizationalKRAs": [
    {
      "coreValues": "Team Collaboration",
      "r1Score": 88,
      "r1CriticalIncident": "Actively helped junior developers."
    }
  ],
  "selfDevelopmentKRAs": [
    {
      "areaOfConcern": "Advanced React Skills",
      "r1Score": 85,
      "r1Reason": "Shows initiative in learning."
    }
  ],
  "developingOthersKRAs": [
    {
      "person": "Junior Developer - Mike",
      "r1Score": 87,
      "r1Reason": "Provided guidance on code review."
    }
  ]
}
```

---

## Summary

This document demonstrates the complete flow:

1. **Platform Admin** creates organization and assigns reviewer
2. **Boss** creates managers and configures review cycles
3. **Manager** creates employees and views team performance
4. **Reviewer** enters scores and locks reviews
5. **Employee** views scores, creates action plan, acknowledges review
6. **System** sends notifications and manages review cycles
7. **All roles** see relevant data in their dashboards

The system maintains complete hierarchy and data flow from organization setup through review cycles to continuous feedback loop.

