# Demo Setup Guide

Quick guide to set up the demo data and show the system to clients.

## Quick Start

### 1. Seed Example Data

Run the seed script to populate the database with example data:

```bash
cd server
npm run seed:examples
```

This creates:
- Platform Admin
- Reviewer (Dr. Sarah Johnson)
- Organization (TechCorp Solutions)
- Boss (John Smith)
- Manager (Maria Garcia)
- 3 Employees (Alex Chen, Emily Rodriguez, David Kim)
- Review Cycle (Quarterly)
- Team data with scores
- Sample notifications

### 2. Start the Application

```bash
# From root directory
npm run dev
```

Or separately:
```bash
# Terminal 1 - Server
npm run dev:server

# Terminal 2 - Client
npm run dev:client
```

### 3. Use Demo User Switcher

Navigate to: **http://localhost:5173/demo/users**

This page allows you to:
- See all demo users
- Click on any user card to switch to their dashboard
- Automatically sets userId in localStorage
- Navigates to the appropriate dashboard

### 4. Manual User ID Setup (Alternative)

If you prefer to set userIds manually:

1. After running seed script, note the User IDs from console output
2. Open browser console (F12)
3. Run: `localStorage.setItem('userId', 'USER_ID_HERE')`
4. Navigate to the appropriate dashboard URL

## Demo Users

After seeding, these users are available:

| Role | Name | Email | Dashboard URL |
|------|------|-------|---------------|
| Platform Admin | Platform Admin | admin@platform.com | `/admin/dashboard` |
| Reviewer | Dr. Sarah Johnson | sarah.johnson@reviewer.com | `/reviewer/dashboard` |
| Boss | John Smith | john.smith@techcorp.com | `/dashboard/boss` |
| Manager | Maria Garcia | maria.garcia@techcorp.com | `/dashboard/manager` |
| Employee | Alex Chen | alex.chen@techcorp.com | `/dashboard/employee` |
| Employee | Emily Rodriguez | emily.r@techcorp.com | `/dashboard/employee` |
| Employee | David Kim | david.kim@techcorp.com | `/dashboard/employee` |

## Demo Flow

### Scenario 1: Platform Admin View

1. Go to `/demo/users`
2. Click "Platform Admin" card
3. See organization "TechCorp Solutions" at `/admin/dashboard`
4. View system analytics

### Scenario 2: Boss View

1. Go to `/demo/users`
2. Click "John Smith (Boss)" card
3. See boss dashboard at `/dashboard/boss`
4. View:
   - Organization overview
   - Department comparisons
   - Managers list
5. Navigate to `/dashboard/boss/review-cycles` to see review cycle configuration

### Scenario 3: Manager View

1. Go to `/demo/users`
2. Click "Maria Garcia (Manager)" card
3. See manager dashboard at `/dashboard/manager`
4. View:
   - Team performance metrics
   - Top performers
   - Employees list with scores
5. Navigate to `/dashboard/manager/mid-cycle-notes` to add notes

### Scenario 4: Employee View

1. Go to `/demo/users`
2. Click "Alex Chen (Employee)" card
3. See employee dashboard at `/dashboard/employee`
4. View:
   - Current score: 92.5
   - Historical trends
   - Feedback and comments
   - Next review date
5. Create action plan

### Scenario 5: Reviewer View

1. Go to `/demo/users`
2. Click "Dr. Sarah Johnson (Reviewer)" card
3. See reviewer dashboard at `/reviewer/dashboard`
4. View list of employees to review
5. Click on "Alex Chen" to see scoring interface
6. View scores already entered for Period 1

## What's Included in Seed Data

### Organization
- **Name**: TechCorp Solutions
- **Industry**: Technology
- **Size**: 150 employees
- **Status**: Trial
- **Reviewer**: Dr. Sarah Johnson
- **Boss**: John Smith

### Review Cycle
- **Frequency**: Quarterly
- **Start Date**: Jan 1, 2024
- **Current Period**: 1
- **Next Review Date**: Apr 1, 2024

### Team Data
- **Team**: Engineering Team
- **Team Code**: TEAM1234
- **3 Employees** with complete KRA scores:
  - Alex Chen: 92.5 (Top performer)
  - Emily Rodriguez: 89.3
  - David Kim: 87.1

### Scores Included
- Functional Dimension KRAs (with weights, scores, feedback)
- Organizational Dimension KRAs (core values, critical incidents)
- Self Development KRAs
- Developing Others KRAs

### Notifications
- Review period start notifications
- Review completed notifications

## Demo Tips

1. **Start with Platform Admin** to show organization creation
2. **Show Boss Dashboard** to demonstrate hierarchy and analytics
3. **Switch to Manager** to show team performance
4. **Show Employee View** to demonstrate individual experience
5. **Show Reviewer** to demonstrate scoring system
6. **Check Notifications** at `/dashboard/notifications` for any user

## Troubleshooting

### User IDs Not Loading in UserSwitcher

The UserSwitcher tries to fetch user IDs automatically. If they don't load:

1. Check that seed script ran successfully
2. Check browser console for errors
3. Manually set userId in localStorage:
   ```javascript
   localStorage.setItem('userId', 'USER_ID_FROM_SEED_OUTPUT')
   ```

### Can't See Data

1. Make sure seed script completed successfully
2. Check MongoDB connection
3. Verify userId is set in localStorage
4. Check browser console for API errors

### Reset Demo Data

To reset and reseed:

```bash
cd server
npm run seed:examples
```

This will delete existing example data and create fresh data.

## Next Steps

After demo:
- Show how to create new organizations (Platform Admin)
- Show how to create managers (Boss)
- Show how to create employees (Manager)
- Show how to configure review cycles (Boss)
- Show how to enter scores (Reviewer)

