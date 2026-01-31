# CSA: Roles & Permissions Tab + Simpler Sign-Up

## TL;DR

- **Add a "Roles & Permissions" tab in CSA** so Client Admins can see roles, invite people with a pre-set role, and share one link/code.
- **Simplify sign-up**: user gets a link (e.g. "Join as Supervisor" or "Join as Member") → minimal form (name, email, mobile, designation) → no role/code dropdowns.

---

## 1. Roles & Permissions Tab in CSA

**What it is**

- A new tab in the Client Admin (CSA) dashboard: **Roles & Permissions** (or "Roles").
- Shows who has which role in the org: Admins (Bosses), Supervisors, Members.
- Optional: manage what each role can do (e.g. who can edit dimension weights, who can trigger review cycles).

**Why it helps**

- **Single place for roles**: CSA sees the full picture without jumping between Admins / All Users.
- **Easier onboarding**: CSA can create **invites** with a role and (if needed) org/team context, and share one link or code. New users don’t have to choose "Boss / Manager / Employee" or hunt for org/team codes.
- **Clearer permissions**: If you add a permission matrix later, it lives here (e.g. "Only CSA can change dimension weights" is already in Settings; this tab can list such rules in one place).

**Simple version (MVP)**

- **Roles tab**: List of users grouped by role (Admins, Supervisors, Members) with name, email, maybe "Invited" vs "Active."
- **Invite flow**: CSA clicks "Invite Supervisor" or "Invite Member" → system generates a sign-up link (and optionally a code). CSA shares the link; the link encodes role (and org/team if needed). No need for the new user to select role or enter org/team code.

---

## 2. Simpler Sign-Up Flow

**Current flow**

- User picks **signup type** (Boss / Manager / Employee).
- Manager: must enter **org code**.
- Employee: must enter **team code**.
- Then name, email, designation, mobile, OTP, etc.

**Pain points**

- Users don’t always have the code handy.
- Choosing the wrong role or code causes failed sign-ups or wrong assignments.
- Multiple steps and fields before they’re "in."

**Simpler flow with Roles & Permissions**

1. **CSA (or Boss/Manager) creates an invite**
   - Chooses role: Admin (Boss), Supervisor, or Member.
   - For Supervisor: optionally tie to org (org code can be embedded in link).
   - For Member: optionally tie to team (team code embedded in link).
   - System returns a **short link** (e.g. `app.com/join/abc123`) and optionally a **short code** (e.g. "JOIN-X7K2").

2. **New user gets the link/code**
   - Clicks link or goes to a "Join with code" page and enters the code.
   - Backend resolves: role + org/team from invite.

3. **Sign-up form is minimal**
   - Only: Name, Email, Designation, Mobile (and password/OTP as you already have).
   - No role dropdown, no org code, no team code. Role and context come from the invite.

4. **After sign-up**
   - User is created with the correct role and org/team; they land in the right dashboard.

**Benefits**

- Fewer choices and fields → fewer errors and drop-offs.
- CSA (or Boss/Manager) controls who gets which role and which org/team.
- You can keep the current "open" sign-up (with role + org/team code) for cases where no invite is used (e.g. first Boss creating the org).

---

## 3. Suggested Next Steps

1. **Add "Roles" (or "Roles & Permissions") tab in CSA**
   - Reuse existing APIs (e.g. organization users, bosses) to show Admins, Supervisors, Members in one view.
2. **Implement invite model and APIs**
   - Create invite (role + optional org/team), generate token/code and short link.
   - Endpoint to resolve invite by token/code (for the sign-up page).
3. **Add "Invite" actions**
   - e.g. "Invite Supervisor" / "Invite Member" from the Roles tab (and optionally from Admins/Users).
4. **Add join-by-link and join-by-code routes**
   - e.g. `/join/:token` and `/join` (enter code) that prefill role/org/team and show the minimal sign-up form.
5. **Keep existing sign-up**
   - For Boss (create org) and for anyone who has an org/team code but no invite link.

If you want, next we can break step 1 into concrete UI/API tasks (e.g. new tab component, which endpoints to call, and how to name "Roles" vs "Roles & Permissions") and then do the same for the invite flow.
