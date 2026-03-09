# LCPL Dead Code Cleanup Guide
> For small agents (Gemini, GPT-4o mini, etc.)
> Each task is self-contained. Do ONE section at a time. No need to read the full codebase.

---

## TASK 1 — Delete Dead Frontend Files
**Effort: 2 min | Just delete these folders/files entirely**

```
# Run from repo root
rm -rf client/src/pages/UnifiedDashboard/
rm -rf client/src/pages/Auth/SetPassword/
rm -rf client/src/pages/Auth/TeamCode/
rm -rf client/src/pages/Dashboard/Performance/
rm -rf client/src/pages/Dashboard/Calendar/
rm -rf client/src/pages/Dashboard/Teams/
```

---

## TASK 2 — Clean App.tsx Routes
**File: `client/src/App.tsx`**
**Effort: 5 min | Remove imports + routes for deleted pages**

### Step 1 — Remove these import lines:
```
import SetPassword from './pages/Auth/SetPassword/SetPassword';
import TeamCode from './pages/Auth/TeamCode/TeamCode';
import Performance from './pages/Dashboard/Performance/Performance';
import Calendar from './pages/Dashboard/Calendar/Calendar';
import Teams from './pages/Dashboard/Teams/Teams';
import UnifiedDashboard from './pages/UnifiedDashboard/UnifiedDashboard';
```

### Step 2 — Remove these Route lines:
```
<Route path="/auth/set-password" element={<SetPassword />} />
<Route path="/auth/team-code" element={<TeamCode />} />
<Route path="/app" element={<UnifiedDashboard />} />
<Route path="performance" element={<Performance />} />
<Route path="calendar" element={<Calendar />} />
<Route path="teams" element={<Teams />} />
```

### Step 3 — Also remove this comment + route (Teams is dead):
```
{/* Team routes are now part of Supervisor dashboard */}
```

---

## TASK 3 — Fix navigationConfig.tsx
**File: `client/src/utils/navigationConfig.tsx`**
**Effort: 5 min | Remove nav items that point to non-existent routes**

Remove these 3 objects from the `allItems` array:

**Remove the "Admins" item** (path doesn't exist):
```javascript
{
  label: 'Admins',
  path: '/client-admin/dashboard/bosses',
  ...
  roles: ['client_admin'],
},
```

**Remove the "Supervisors" item** (path doesn't exist):
```javascript
{
  label: 'Supervisors',
  path: '/dashboard/boss/managers',
  ...
  roles: ['boss', 'platform_admin'],
},
```

**Remove the "Analytics" item** (path doesn't exist):
```javascript
{
  label: 'Analytics',
  path: '/dashboard/boss/analytics',
  ...
  roles: ['boss', 'platform_admin'],
},
```

---

## TASK 4 — Fix Ghost API Calls in Frontend
**Effort: 10 min | These calls hit endpoints that don't exist — fix or remove**

### Ghost Call 1: `/api/manager/finalize`
**File: `client/src/pages/Dashboard/Manager/ManagerDashboard.tsx`**
- Search for: `api/manager/finalize`
- This is missing the required employee ID in the URL
- Fix: Change to `/api/manager/employees/${employeeId}/kras/finalize`
- If `employeeId` is not available in that context, remove the call entirely

### Ghost Call 2: `/api/manager/lock`
**File: `client/src/pages/Dashboard/Manager/ManagerDashboard.tsx`**
- Search for: `api/manager/lock`
- This route does NOT exist in the backend
- Fix: Remove the fetch call and any UI that triggers it
- Note: Lock functionality exists at `/api/team/members/:idx/kras/:kraIdx/lock` — only reroute there if you know the team member index

### Ghost Call 3: `/api/employee/kras/:id/self-score`
**File: `client/src/pages/Dashboard/Employee/EmployeeDashboard.tsx`**
- Search for: `self-score`
- This route does NOT exist in the backend
- Fix: Remove the fetch call and any UI button/handler that triggers it

---

## TASK 5 — Remove Unused Backend Routes
**Effort: 5 min | These routes exist but are never called from the frontend**

### In `server/src/routes/bossRoutes.ts` — remove these 2 lines:
```javascript
router.post('/managers/:managerId/kras/organizational', addManagerOrganizationalKRA);
router.post('/managers/:managerId/kras/self-development', addManagerSelfDevelopmentKRA);
```

### In `server/src/controllers/bossController.ts` — remove these 2 exported functions:
- `addManagerOrganizationalKRA`
- `addManagerSelfDevelopmentKRA`

### In `server/src/routes/managerRoutes.ts` — remove these 2 lines:
```javascript
router.post('/employees/:employeeId/kras/organizational', addEmployeeOrganizationalKRA);
router.post('/employees/:employeeId/kras/self-development', addEmployeeSelfDevelopmentKRA);
```

### In `server/src/controllers/managerController.ts` — remove these 2 exported functions:
- `addEmployeeOrganizationalKRA`
- `addEmployeeSelfDevelopmentKRA`

---

## TASK 6 — Delete Root-Level Stray Files
**Effort: 1 min | Dev scripts left in root by mistake**

```bash
# Run from repo root
rm list_users.js
rm excel_deep_analysis.py
```

---

## TASK 7 — Delete Dev-Only Server Scripts
**Effort: 1 min | One-time migration scripts, not needed in prod**

```bash
# Run from repo root
rm server/src/scripts/fixUserRoles.ts
rm server/src/scripts/migrateRoles.ts
rm server/src/scripts/listUsers.ts
```

> ⚠️ KEEP: `seed.ts`, `seedExamples.ts`, `seedFullWorkflow.ts` — needed for dev/staging

---

## TASK 8 — Clean dashboardRoutes.ts (Minor)
**File: `client/src/utils/dashboardRoutes.ts`**
**Effort: 3 min | TeamCode route was removed, clean up if referenced**

- Search for any reference to `'team-code'` or `'/auth/team-code'` in this file
- Remove if found
- No other changes needed here

---

## Verification Checklist
After all tasks, confirm:

- [ ] `npm run build` passes in `/client` with no import errors
- [ ] No broken imports from deleted files (TypeScript will catch these)
- [ ] Backend still starts: `npm run dev` in `/server`
- [ ] Login flow still works (roles: boss, manager, employee, client_admin, reviewer)
- [ ] No console errors about failed API calls on page load

---

## What Was NOT Touched (intentional)
- `pages/Onboarding/` — sub-components used by `Onboarding.tsx`
- `pages/Auth/EnquiryOrSignUp/` — linked from `Home.tsx`
- `pages/Dashboard/Manager/MidCycleNotes.tsx` — reachable via Notifications
- `pages/Dashboard/Employee/FeedbackHistory.tsx` — linked from EmployeeDashboard
- All seed scripts — needed for dev environment
- `server/src/scripts/README_FULL_WORKFLOW.md` — documentation
