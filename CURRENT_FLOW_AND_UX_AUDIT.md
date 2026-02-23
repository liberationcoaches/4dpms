# LCPL (4DPMS) – Current Flow & UX Audit

This document describes **how the project works today**, what users see when it’s live, and lists **good** and **bad** aspects of the flow so you can plan changes.

---

## 1. Entry Points & First-Time Experience

### What people see when they open the app

| URL / Action | What happens |
|--------------|--------------|
| **`/` (Home)** | Redirects **immediately** to `/auth/login`. No landing page. |
| **`/auth/login`** | Login form: **Mobile** + **Access Code**. Links: “Have an invite? Join here” → `/auth/join`, “Don’t have an account? Sign up” → `/auth/signup`. |
| **`/auth/enquiry-or-signup`** | “Get Started” – email input, two buttons: **Enquiry** (submit email) and **Sign Up** (goes to `/auth/signup`). **Not linked from Home or Login** – only reachable if someone shares the URL or you type it. |
| **`/auth/signup`** | Full signup form (name, email, designation, mobile, signup type). Used for **creating a new organization** (boss/owner). Links: “Have an invite? Join with invite” → `/auth/join`, “Already have an account? Log in” → `/auth/login`. |
| **`/auth/join`** | “Join” flow: user can **enter a code** (invite code or org code) or land with **`/auth/join?code=XXX`** or **`/auth/join/:token`**. Resolves to either **invite** (role pre-set) or **org** (user picks role). Then form + OTP. Link at bottom: “Creating an organization? Create your workspace” → `/auth/signup`. |

So in practice:

- **New visitor** → goes to `/` → instantly to **Login**.
- There is **no marketing/landing page**; no clear path like “New here? Sign up” vs “Have an invite? Join.”
- **Enquiry / Get Started** exists but is **hidden** (no nav or button to `/auth/enquiry-or-signup`).

---

## 2. User Roles & Where They Land After Login

| Role | After login goes to | Main area |
|------|---------------------|-----------|
| **platform_admin** | `/admin/dashboard` | Platform Admin Dashboard |
| **client_admin** (CSA) | `/dashboard` first, then redirect to `/client-admin/dashboard` | Client Admin Dashboard |
| **reviewer** | `/reviewer/dashboard` | Reviewer Dashboard |
| **boss** | `/dashboard/boss` | Boss Dashboard |
| **manager** | `/dashboard/manager` | Manager Dashboard |
| **employee** | `/dashboard/employee` | Employee Dashboard |

- **client_admin** is **not** in the Login switch; they hit `default` → `navigate('/dashboard')`. Then `Dashboard.tsx` loads, fetches profile, and redirects by role via `getDashboardPath('client_admin')` → `/client-admin/dashboard`. So they end in the right place but via an extra hop.

---

## 3. Route & Layout Structure (Why It Can Feel Confusing)

### Two different “shells”

1. **Generic Dashboard layout** (`/dashboard` + children)  
   - Used for: `/dashboard`, `/dashboard/performance`, `/dashboard/teams`, `/dashboard/calendar`, `/dashboard/settings`, `/dashboard/notifications`.  
   - Renders the **shared sidebar** (from `navigationConfig`: Dashboard, Admins/Supervisors/Analytics by role, Profile, Settings).  
   - When user opens **exactly** `/dashboard`, the app immediately redirects to the role-specific path (e.g. `/dashboard/employee`). So users **rarely sit on** `/dashboard`; they only see this layout when they go to **child** routes like `/dashboard/settings` or `/dashboard/notifications`.

2. **Role-specific dashboards** (separate full-page UIs)  
   - **Boss:** `/dashboard/boss`, `/dashboard/boss/review-cycles`  
   - **Manager:** `/dashboard/manager`, `/dashboard/manager/team/:memberId`, `/dashboard/manager/mid-cycle-notes`  
   - **Employee:** `/dashboard/employee`, `/dashboard/employee/feedback`  
   - **Client Admin:** `/client-admin/dashboard`  
   - **Platform Admin:** `/admin/dashboard`, `/admin/organizations/:id`  
   - **Reviewer:** `/reviewer/dashboard`, `/reviewer/scoring/:employeeId`  

Each of these has **its own** header, menu, and tabs. They do **not** use the generic Dashboard sidebar.

So the same person (e.g. Employee) can see:

- **Employee UI** on `/dashboard/employee` (role dashboard).
- **Generic Dashboard UI** on `/dashboard/settings` or `/dashboard/notifications` (shared sidebar).

Result: **two different navigation experiences** for one user, depending on the page. “Dashboard” in the generic sidebar sends them back to their role dashboard, but the **look and menu** change between the two – which can feel inconsistent.

---

## 4. Auth Flows (Sign Up vs Join)

### Sign Up (`/auth/signup`)

- **Purpose:** Create a **new organization** (user becomes **Boss** / owner).
- **Flow:** Form → POST `/api/auth/signup` → redirect to **OTP verify** (mobile) → after OTP, **Set access code** or **Login**.
- **No org code or invite** required; this is the “create workspace” path.
- **EnquiryOrSignUp** “Sign Up” button goes here but doesn’t pass any context (e.g. email); user re-enters everything on SignUp.

### Join (`/auth/join`)

- **Purpose:** Join an **existing** org via **invite code/token** or **org code**.
- **Invite:** Role is fixed (e.g. Supervisor/Member). User fills details → signup-with-invite → OTP → then access code or login.
- **Org code:** User **selects role** (Client Admin / Supervisor / Member) and fills details → signup-with-org → OTP → etc.
- Join is the **only** path that uses **invite links** (`/auth/join?code=...` or `/auth/join/:token`).

### Login

- **Mobile + Access code.**  
- First-time users who need to set access code are sent to `/auth/access-code` after login.

So we have:

- **Two ways to “join”:** Sign Up (new org) vs Join (invite/org code).  
- **Naming:** “Sign up” on Login can mean “I’m a new org owner” but a lot of users might think “I’m new, I need an account” (which could be Join).  
- **Enquiry** is disconnected: user can submit email for enquiry or click “Sign Up” and land on the same Sign Up form as org creators.

---

## 5. Hierarchy & Who Does What (High Level)

- **Platform Admin:** Creates **organizations**, can view org list and org detail; manages platform-level settings and reviewers.
- **Client Admin (CSA):** One per org (conceptually). Manages **Bosses** (Admins), **Supervisors** (Managers), **Members** (Employees); invites; Roles & Permissions; dimension weights; can export PDF.
- **Boss:** Owns a “division”/org or subset. Has **Managers** (Supervisors), sets KRAs, review cycles, analytics; can download own report.
- **Manager:** Has **team members** (Employees). Fills/edits KRAs, mid-cycle notes, can lock scores; accesses team via “Teams” or manager dashboard; can download own report.
- **Employee:** Sees own KRAs, scores, feedback, action plan; can add proof; “My Report” PDF.
- **Reviewer:** Separate role; sees list of employees (by org); opens **Scoring** per employee (`/reviewer/scoring/:employeeId`). Used for formal review/scoring across the org.

So the **operational flow** is: Org → CSA → Boss(es) → Manager(s) → Employee(s); **Reviewer** sits alongside for scoring.

---

## 6. What’s Good About the Current Flow

- **Role-based redirect after login** works: everyone lands on the right dashboard (with client_admin going via one redirect).
- **Invite + org code** both supported on Join; invite link and code in URL are resolved; org code lets user choose role.
- **Clear separation of roles** in the backend and in dashboards (Boss vs Manager vs Employee vs CSA vs Platform Admin vs Reviewer).
- **Shared pieces** exist: `/dashboard/settings`, `/dashboard/notifications`, and shared `navigationConfig` for the generic Dashboard shell.
- **Personal “My Report” PDF** and **notifications** are available across roles.
- **OTP + access code** flow is implemented for signup and first-time login.
- **Enquiry** captures email before signup; useful for lead capture even if the page is not linked.

---

## 7. What’s Bad / Confusing About the Current Flow

### Entry & discovery

- **No real home/landing:** `/` just redirects to Login. New users don’t see “Sign up” vs “Join” vs “Enquiry” in one place.
- **EnquiryOrSignUp is orphaned:** Not linked from Home or Login; only by direct URL. So “Get Started” / enquiry is hard to find.
- **“Sign up” on Login** is ambiguous: it sends org creators to the same form as “I just want an account” users; only Join explains “Have an invite?”.

### Auth & onboarding

- **Two entry points for new users:** Sign Up (new org) vs Join (invite/org code). Not explained on one screen; user must know which one to pick.
- **Enquiry → Sign Up** doesn’t carry email to Sign Up; user re-enters it.
- **client_admin** not explicitly handled in Login (relies on redirect from `/dashboard`); small inconsistency.

### Navigation & layout

- **Two UIs for the same user:** Role dashboard (e.g. Employee) has one look and menu; `/dashboard/settings` and `/dashboard/notifications` use the generic Dashboard sidebar. Same user, two different navigation models – **confusing**.
- **Sidebar links** in the generic Dashboard point to paths like `/dashboard/boss/managers` or `/client-admin/dashboard/bosses` that are **not** the main route for that role (e.g. Boss is at `/dashboard/boss`, not under `/dashboard` with nested routes). So “Dashboard” and “Supervisors” etc. can feel inconsistent with where the user actually lives.
- **Boss/Manager/Employee** never “live” inside the generic Dashboard; they only hit it when going to settings/notifications. So the sidebar is partly redundant and partly misleading.

### Naming & consistency

- **“Admin” vs “Client Admin” vs “Supervisor” vs “Boss”:** UI uses “Client Admin,” “Supervisor,” “Member”; backend uses `client_admin`, `boss`, `manager`, `employee`. Mixed terms across screens.
- **“Dashboard”** in the generic sidebar means “go to my role dashboard,” but the URL and layout change when they do – so “Dashboard” doesn’t feel like one place.

### Flows and expectations

- **Reviewer** is a separate area (`/reviewer/...`); not obvious from org hierarchy screens how an employee gets “into” review or who the reviewer is (assignation/visibility could be clearer).
- **Where to set access code** (first login vs signup) and when OTP is required could be clearer for first-time users.
- **Join** with only org code (no invite) requires **role selection**; new users might not know which role to pick (Client Admin vs Supervisor vs Member).

---

## 8. Summary: If This Were Live Today

- **First impression:** User lands on Login. No landing, no single “Get started” story.
- **New user with invite:** Must find “Have an invite? Join here” on Login, then enter code/link and complete Join. Doable but not prominent.
- **New user creating org:** Clicks “Sign up” on Login, gets full signup form. Works but “Sign up” sounds generic.
- **Existing user:** Logs in with mobile + access code, lands on the correct role dashboard. Works well.
- **Once inside:** Role dashboards are clear; but going to Settings/Notifications switches to a different layout and menu – **confusing**.
- **Enquiry/lead capture:** Exists but is **hidden** (no link from main flows).

---

## 9. Suggested Directions for Flow Changes (High Level)

- **Single entry story:** One landing or “Get started” page that splits: “Join with invite/org code” vs “Create new organization” vs “Just enquire.”
- **Link EnquiryOrSignUp** from that page (and optionally from Login) and optionally pass email to Sign Up.
- **One shell per role:** Either use the **generic Dashboard layout** for everyone (and make role dashboards nested under `/dashboard`) or use **only role dashboards** and move Settings/Notifications into each role UI so the same user never sees two different menus.
- **Explicit client_admin** redirect in Login and consistent naming (e.g. “Client Admin” everywhere in UI).
- **Clear labels:** e.g. “Create organization” vs “Join with code” vs “Log in” so “Sign up” isn’t overloaded.

This document reflects the **current** flow; use it as the baseline before changing the UX and navigation.
