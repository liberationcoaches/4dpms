# Quick Demo Guide

## ✅ Seed Data Successfully Created!

The example data has been populated in your database. Here's how to use it for client demos.

## 🚀 Quick Start

### 1. Start the Application

```bash
npm run dev
```

### 2. Access Demo User Switcher

Navigate to: **http://localhost:5173/demo/users**

This page shows all demo users and lets you switch between them with one click.

### 3. Or Manually Set User ID

Open browser console (F12) and run:

```javascript
// For Platform Admin
localStorage.setItem('userId', '694101775d77e1d619f790d2')
// Then visit: http://localhost:5173/admin/dashboard

// For Boss
localStorage.setItem('userId', '694101775d77e1d619f790d7')
// Then visit: http://localhost:5173/dashboard/boss

// For Manager
localStorage.setItem('userId', '694101775d77e1d619f790dc')
// Then visit: http://localhost:5173/dashboard/manager

// For Employee (Alex Chen)
localStorage.setItem('userId', '694101775d77e1d619f790de')
// Then visit: http://localhost:5173/dashboard/employee

// For Reviewer
localStorage.setItem('userId', '694101775d77e1d619f790d5')
// Then visit: http://localhost:5173/reviewer/dashboard
```

## 📊 What You'll See

### Platform Admin Dashboard (`/admin/dashboard`)
- **Organization**: TechCorp Solutions
- **System Analytics**: 
  - 1 organization
  - 1 reviewer
  - 1 boss
  - 1 manager
  - 3 employees

### Boss Dashboard (`/dashboard/boss`)
- **Organization**: TechCorp Solutions
- **Managers**: 1 (Maria Garcia)
- **Employees**: 3
- **Departments**: 1
- **Org Average Score**: Calculated from employee scores

### Manager Dashboard (`/dashboard/manager`)
- **Team Size**: 3
- **Average Score**: ~85.2
- **Top Performers**: 
  - #1 Alex Chen (92.5)
  - #2 Emily Rodriguez (89.3)
  - #3 David Kim (87.1)
- **Employees List**: All 3 employees with scores

### Employee Dashboard (`/dashboard/employee`)
- **Current Score**: 92.5 (for Alex Chen)
- **Historical Trends**: Period 1 data
- **Next Review Date**: Apr 1, 2024
- **Feedback**: Complete feedback from reviewer
- **Action Plan**: Can create and acknowledge

### Reviewer Dashboard (`/reviewer/dashboard`)
- **Employees to Review**: 3 employees listed
- **Click on Alex Chen** to see scoring interface
- **Scores Already Entered**: Period 1 scores are populated

## 🎯 Demo Flow Suggestions

### Option 1: Role-by-Role Walkthrough
1. Start with **Platform Admin** - Show organization creation
2. Switch to **Boss** - Show managers and review cycle config
3. Switch to **Manager** - Show team performance
4. Switch to **Employee** - Show individual experience
5. Switch to **Reviewer** - Show scoring system

### Option 2: Complete Review Cycle
1. Show **Boss** configuring review cycle
2. Show **Reviewer** entering scores
3. Show **Employee** viewing results
4. Show **Manager** seeing team performance
5. Show **Boss** seeing org-wide analytics

## 📝 Demo Users Created

| Role | Name | Email | User ID |
|------|------|-------|---------|
| Platform Admin | Platform Admin | admin@platform.com | `694101775d77e1d619f790d2` |
| Reviewer | Dr. Sarah Johnson | sarah.johnson@reviewer.com | `694101775d77e1d619f790d5` |
| Boss | John Smith | john.smith@techcorp.com | `694101775d77e1d619f790d7` |
| Manager | Maria Garcia | maria.garcia@techcorp.com | `694101775d77e1d619f790dc` |
| Employee | Alex Chen | alex.chen@techcorp.com | `694101775d77e1d619f790de` |
| Employee | Emily Rodriguez | emily.r@techcorp.com | `694101775d77e1d619f790e0` |
| Employee | David Kim | david.kim@techcorp.com | `694101775d77e1d619f790e2` |

## 🔄 Resetting Demo Data

To reset and recreate the demo data:

```bash
cd server
npm run seed:examples
```

This will:
- Delete existing example users (by email/mobile)
- Delete TechCorp Solutions organization
- Delete related review cycles, teams, and notifications
- Create fresh example data

## ⚠️ Important Notes

1. **User IDs change** each time you run the seed script
2. **Use `/demo/users`** page to automatically fetch latest IDs
3. **All users are verified** (email and mobile) - no OTP needed for demo
4. **Scores are pre-populated** for Period 1
5. **Review cycle is active** and set to quarterly

## 🎨 Color Schemes

The dashboards use the color schemes from the flowchart:
- **Admin**: Yellow (`#fff3cd`)
- **Employee**: Green (`#d4edda`)
- **Manager**: Blue (`#cce5ff`)
- **Boss**: Red (`#f8d7da`)

## 📱 Testing Checklist

- [ ] Platform Admin can see organization
- [ ] Boss can see managers and analytics
- [ ] Manager can see team performance
- [ ] Employee can see scores and feedback
- [ ] Reviewer can see employees to review
- [ ] Notifications appear for all users
- [ ] UserSwitcher loads user IDs automatically

---

**Ready for Demo!** 🎉

All example data is in place. Navigate to `/demo/users` to start switching between roles and showing the client how the system works.

