# LCPL - Task List & Audit Report

> Generated: February 2026
> Status: MVP Development

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Backend Controllers | 7 audited |
| Backend Functions | 58 total |
| Functions Complete | 54 (93%) |
| Functions with Issues | 4 (7%) |
| Frontend Pages | 29 total |
| Pages Complete | 25 (86%) |
| Pages Placeholder/Incomplete | 4 (14%) |
| Backend Endpoints | ~95 |
| Endpoints with Frontend UI | ~70 (74%) |
| Endpoints without Frontend UI | ~25 (26%) |
| TODO Comments | 10 |
| Critical Bugs | 1 |

---

## CRITICAL: Fix Immediately

### 1. Bug in Reviewer Score Submission
**File:** `server/src/controllers/reviewerController.ts`
**Lines:** 522-600
**Issue:** Uses undefined variable `periodPrefix` instead of `reviewPeriod`
**Impact:** Runtime errors when submitting organizational, self-development, and developing others scores
**Fix:** Replace `periodPrefix` with correct period field names (`r1`, `r2`, `r3`, `r4`)

```typescript
// Current (BROKEN):
kra[`${periodPrefix}Score`] = ...  // periodPrefix is undefined

// Should be:
const periodKey = `r${reviewPeriod}`;  // reviewPeriod is 1-4
kra[`${periodKey}Score`] = ...
```

---

## HIGH Priority Tasks

### Backend Fixes

| # | Task | File | Line | Effort |
|---|------|------|------|--------|
| 1 | Fix submitScores bug | `reviewerController.ts` | 522-600 | Low |
| 2 | Implement action plan persistence | `employeeController.ts` | 194 | Medium |
| 3 | Implement review lock persistence | `reviewerController.ts` | 686 | Medium |
| 4 | Implement mid-cycle notes storage | `feedbackController.ts` | 88 | Medium |
| 5 | Implement feedback storage | `feedbackController.ts` | 237 | Medium |
| 6 | Implement feedback retrieval | `feedbackController.ts` | 165 | Medium |

### Frontend - Missing Core UI

| # | Task | Backend Endpoint | Priority |
|---|------|------------------|----------|
| 1 | Create Manager form | `POST /api/boss/managers` | High |
| 2 | Create Employee form | `POST /api/manager/employees` | High |
| 3 | Team member management UI | `POST/PUT/DELETE /api/team/members` | High |
| 4 | KRA locking UI (all dimensions) | `POST .../lock` endpoints | High |
| 5 | View/Add feedback UI | `GET/POST /api/feedback/*` | High |

---

## MEDIUM Priority Tasks

### Frontend - Placeholder Pages

| # | Page | File | Current State | What's Needed |
|---|------|------|---------------|---------------|
| 1 | Calendar | `Dashboard/Calendar/Calendar.tsx` | "Content will be added here..." | Review cycle calendar view |
| 2 | Performance | `Dashboard/Performance/Performance.tsx` | "Content will be added here..." | Performance overview/charts |
| 3 | Teams | `Dashboard/Teams/Teams.tsx` | "Content will be added here..." | Team listing/management |
| 4 | Enquiry | `Auth/EnquiryOrSignUp.tsx` | Simulates API | Connect to backend |

### Frontend - Missing Features

| # | Feature | Backend Endpoint | Notes |
|---|---------|------------------|-------|
| 1 | Get team code display | `GET /api/team/code` | Show team invite code |
| 2 | Delete KRA | `DELETE /api/team/members/:idx/kras/:kraIdx` | Remove KRA button |
| 3 | Employee KRA detail view | `GET /api/manager/employees/:id/kras` | Detailed KRA modal |
| 4 | Review period check trigger | `GET /api/review-cycles/check` | Manual trigger button |

### Backend - Data Model Changes (Planned)

| # | Change | Impact | Notes |
|---|--------|--------|-------|
| 1 | Per-person dimension weights | High | Move `dimensionWeights` into `membersDetails[]` |
| 2 | `reportsTo` field | High | Replace `managerId` + `bossId` |
| 3 | Action plan model | Medium | New model or User field |
| 4 | Review lock model | Medium | New model or Team field |
| 5 | Feedback model | Medium | New model for mid-cycle notes |

---

## LOW Priority Tasks

### Code Cleanup

| # | Task | File | Notes |
|---|------|------|-------|
| 1 | Remove debug console.logs | `client/src/pages/Auth/SignUp.tsx` | Lines 67, 70, 108, 118, 121 |
| 2 | Remove dev OTP logging | `client/src/pages/Auth/SetPassword.tsx` | Line 34 |
| 3 | Remove debug logging | `client/src/pages/Dashboard/TeamMember/TeamMemberKRAs.tsx` | Line 197 |
| 4 | Add salary field to User | `server/src/services/exportService.ts` | Currently hardcoded to 0 |

### Minor TODOs (Non-blocking)

| # | TODO | File | Line |
|---|------|------|------|
| 1 | Auth token extraction | `teamController.ts` | 98 |
| 2 | Auth token extraction | `userController.ts` | 17, 220 |
| 3 | Auth token extraction | `accessCodeController.ts` | 22 |

---

## Backend Endpoints Without Frontend UI

### Team Management (Need UI)
- `GET /api/team/code` - Display team invite code
- `POST /api/team/members` - Add team member form
- `PUT /api/team/members/:memberIndex` - Edit team member form
- `DELETE /api/team/members/:memberIndex` - Delete team member button

### KRA Locking (Need UI)
- `POST /api/team/members/:idx/kras/:kraIdx/lock` - Lock functional KRA
- `POST /api/team/members/:idx/organizational/:idx/lock` - Lock organizational
- `POST /api/team/members/:idx/self-development/:idx/lock` - Lock self-dev
- `POST /api/team/members/:idx/developing-others/:idx/lock` - Lock dev others
- `DELETE /api/team/members/:idx/kras/:kraIdx` - Delete KRA

### Feedback (Need UI)
- `GET /api/feedback/employee/:employeeId` - View feedback
- `POST /api/feedback/add` - Add feedback form

### Other (Need UI)
- `POST /api/boss/managers` - Create manager form
- `POST /api/manager/employees` - Create employee form
- `GET /api/manager/employees/:employeeId/kras` - Employee KRA detail view
- `GET /api/client-admin/bosses/:bossId/team-member-index` - Boss member index

### Intentionally No UI Needed
- `GET /api/health` - Health check (system only)
- `POST /api/notifications` - Create notification (system only)
- `GET /api/review-cycles/check` - Scheduler endpoint
- `POST /api/user/fix-roles` - Migration utility
- `GET /api/user?email=` - Admin utility
- `POST /api/auth/verify-otp` - Generic (mobile-specific used)
- `GET /api/reviewer/employees` - Legacy (org-scoped used)

---

## Recommended Task Order

### Phase 1: Critical Fixes (Do First)
1. Fix `submitScores` bug in reviewerController
2. Test reviewer scoring flow end-to-end

### Phase 2: Complete Core Features
3. Implement feedback storage (backend)
4. Implement action plan persistence (backend)
5. Implement review lock persistence (backend)
6. Build Create Manager UI
7. Build Create Employee UI
8. Build Team Member management UI

### Phase 3: KRA Management
9. Build KRA locking UI for all dimensions
10. Build KRA delete functionality
11. Build feedback view/add UI

### Phase 4: Data Model Changes
12. Implement per-person dimension weights
13. Add weight configuration to KRA setup flow
14. Update score calculations to use per-person weights

### Phase 5: Polish
15. Complete Calendar page
16. Complete Performance page
17. Complete Teams page
18. Connect Enquiry form to backend
19. Remove debug console.logs
20. Add salary field for exports

### Phase 6: Architecture (Supervisor/Member)
21. Add `reportsTo` field to User model
22. Build subtree query function
23. Refactor dashboards to Supervisor/Member tabs
24. Remove role-specific dashboard logic

---

## Controller Status Summary

| Controller | Functions | Complete | Issues |
|------------|-----------|----------|--------|
| bossController.ts | 9 | 9 ✅ | None |
| managerController.ts | 8 | 8 ✅ | None |
| employeeController.ts | 2 | 1 ⚠️ | TODO: action plan |
| clientAdminController.ts | 16 | 16 ✅ | None |
| reviewerController.ts | 6 | 4 ⚠️ | BUG + TODO |
| organizationController.ts | 10 | 10 ✅ | None |
| teamController.ts | 8 | 8 ✅ | Minor TODO |

---

## Frontend Page Status

| Section | Pages | Complete | Incomplete |
|---------|-------|----------|------------|
| Auth | 8 | 7 | 1 (Enquiry) |
| Dashboard | 12 | 9 | 3 (Calendar, Performance, Teams) |
| Admin | 2 | 2 | 0 |
| ClientAdmin | 1 | 1 | 0 |
| Reviewer | 2 | 2 | 0 |
| Home | 1 | 1 | 0 |
| **Total** | **26** | **22** | **4** |

---

## Files Reference

### Backend Controllers
- `server/src/controllers/bossController.ts`
- `server/src/controllers/managerController.ts`
- `server/src/controllers/employeeController.ts`
- `server/src/controllers/clientAdminController.ts`
- `server/src/controllers/reviewerController.ts`
- `server/src/controllers/organizationController.ts`
- `server/src/controllers/teamController.ts`
- `server/src/controllers/feedbackController.ts`

### Frontend Pages with Issues
- `client/src/pages/Auth/EnquiryOrSignUp/EnquiryOrSignUp.tsx`
- `client/src/pages/Dashboard/Calendar/Calendar.tsx`
- `client/src/pages/Dashboard/Performance/Performance.tsx`
- `client/src/pages/Dashboard/Teams/Teams.tsx`

### Files with Debug Code to Remove
- `client/src/pages/Auth/SignUp/SignUp.tsx`
- `client/src/pages/Auth/SetPassword/SetPassword.tsx`
- `client/src/pages/Dashboard/TeamMember/TeamMemberKRAs.tsx`

---

*This task list should be updated as items are completed.*
