# 4D PMS Input Fields — Coverage Report

## Overview

The [4D_PMS_App_Input_Fields.md](file:///d:/LCPL/4D_PMS_App_Input_Fields.md) spec defines **9 sections** with a total of **101 fields** (**72 user-input** + **29 auto-calculated**).

Below is a section-by-section comparison against the current project codebase.

---

## Summary Counts

| Section | Spec Fields | ✅ Implemented | ⚠️ Partial | ❌ Missing |
|---|---|---|---|---|
| 1 — Employee Header | 9 | 3 | 0 | **6** |
| 2 — Review Period Dates | 5 | 4 | 0 | **1** |
| 3 — LCPL Facilitators | 5 | 4 | 0 | **1** |
| 4 — Functional Dimension | 15 (1 section + 14 per-row) | 8 | 1 | **6** |
| 5 — Organizational Dimension | 11 (1 section + 10 per-row) | 9 | 1 | **1** |
| 6 — Self Development | 13 (1 section + 12 per-row) | 13 | 0 | **0** |
| 7 — Developing Others | 13 (1 section + 12 per-row) | 13 | 0 | **0** |
| 8 — Remarks & Actionables | 5 | 0 | 0 | **5** |
| 9 — Score Summary (auto) | 26 | 0 | 0 | **26** |
| **TOTAL** | **102** | **54** | **2** | **46** |

> **46 fields are missing**, primarily the entire Remarks section (Sec 8), the entire Score Summary section (Sec 9), Employee Header fields, and Functional Dimension comments.

---

## Section-by-Section Detail

### Section 1 — Employee Header

Stored across `User.ts` and `Organization.ts`.

| Spec `field_id` | Spec Label | Status | Current Location |
|---|---|---|---|
| `emp_client_name` | Client Name | ❌ **Missing** | Not stored; `Organization.name` exists but is the org name, not "client" |
| `emp_name` | Employee Name | ✅ | `User.name` |
| `emp_doj` | Date of Joining | ❌ **Missing** | No `dateOfJoining` field exists anywhere |
| `emp_designation` | Designation | ✅ | `User.designation` |
| `emp_department` | Department | ❌ **Missing** | No `department` field on User or Organization |
| `emp_location` | Location | ❌ **Missing** | No `location` field anywhere |
| `emp_reviewed_by` | Reviewed By | ✅ | `User.reviewerId` (reference) |
| `emp_kra_date` | KRA Date | ❌ **Missing** | No `kraDate` field exists |
| `emp_review_year` | Performance Review Year | ❌ **Missing** | No `reviewYear` field; `ReviewCycle.startDate` is closest |

> **6 out of 9 fields missing.**

---

### Section 2 — Review Period Dates

Stored in `ReviewCycle.ts`.

| Spec `field_id` | Spec Label | Status | Current Field |
|---|---|---|---|
| `date_pilot` | Review Date – PILOT | ❌ **Missing** | No `pilotDate` — only `r1Date` through `r4Date` |
| `date_q1` | Review Date – Q1 | ✅ | `r1Date` |
| `date_q2` | Review Date – Q2 | ✅ | `r2Date` |
| `date_q3` | Review Date – Q3 | ✅ | `r3Date` |
| `date_q4` | Review Date – Q4 | ✅ | `r4Date` |

> **1 out of 5 fields missing** (`date_pilot`).

---

### Section 3 — LCPL Facilitators

Stored in `ReviewCycle.ts`.

| Spec `field_id` | Spec Label | Status | Current Field |
|---|---|---|---|
| `facilitator_pilot` | Facilitator – PILOT | ❌ **Missing** | No `pilotFacilitator` field |
| `facilitator_q1` | Facilitator – Q1 | ✅ | `r1Facilitator` |
| `facilitator_q2` | Facilitator – Q2 | ✅ | `r2Facilitator` |
| `facilitator_q3` | Facilitator – Q3 | ✅ | `r3Facilitator` |
| `facilitator_q4` | Facilitator – Q4 | ✅ | `r4Facilitator` |

> **1 out of 5 fields missing** (`facilitator_pilot`).

---

### Section 4 — Functional Dimension

Stored in `Team.ts → IFunctionalKRA` + `IDimensionWeights`.

| Spec `field_id` | Spec Label | Status | Notes |
|---|---|---|---|
| `functional_section_weight` | Section Weight | ✅ | `dimensionWeights.functional` |
| `fd_kra` | KRA | ✅ | `kra` field |
| `fd_kpi` | KPI / Target | ✅ | `kpis[]` array (enhanced vs spec) |
| `fd_report` | Report / Evidence | ✅ | `reportsGenerated[]` (enhanced with proof types) |
| `fd_weight` | Row Weight | ⚠️ **Partial** | `pilotWeight` exists, but spec wants one `fd_weight` per row; project has separate `pilotWeight`, `r1Weight`, etc. per period |
| `fd_score_pilot` | Score – PILOT | ✅ | `pilotScore` |
| `fd_comment_pilot` | Comment – PILOT | ❌ **Missing** | No comment/note field for pilot |
| `fd_score_q1` | Score – Q1 | ✅ | `r1Score` |
| `fd_comment_q1` | Comment – Q1 | ❌ **Missing** | `r1ActualPerf` exists but is "actual performance", not a general comment |
| `fd_score_q2` | Score – Q2 | ✅ | `r2Score` |
| `fd_comment_q2` | Comment – Q2 | ❌ **Missing** | Same as above |
| `fd_score_q3` | Score – Q3 | ✅ | `r3Score` |
| `fd_comment_q3` | Comment – Q3 | ❌ **Missing** | Same |
| `fd_score_q4` | Score – Q4 | ✅ | `r4Score` |
| `fd_comment_q4` | Comment – Q4 | ❌ **Missing** | Same |
| `fd_avg_score` | Avg Score (auto) | ✅ | `averageScore` |

> **5 comment fields missing.** `r*ActualPerf` could be repurposed as comments, but currently serves a different purpose. Weight is structurally different (per-period vs single row weight).

---

### Section 5 — Organizational Dimension (Core Values)

Stored in `Team.ts → IOrganizationalKRA`.

| Spec `field_id` | Spec Label | Status | Notes |
|---|---|---|---|
| `org_section_weight` | Section Weight | ✅ | `dimensionWeights.organizational` |
| `cv_score_pilot` | Score – PILOT | ⚠️ **Partial** | `pilotScore` exists in schema but labelled "no score" in interface comment; `pilotCriticalIncident` is present |
| `cv_incident_pilot` | Critical Incident – PILOT | ✅ | `pilotCriticalIncident` |
| `cv_score_q1` | Score – Q1 | ✅ | `r1Score` |
| `cv_incident_q1` | Critical Incident – Q1 | ✅ | `r1CriticalIncident` |
| `cv_score_q2` | Score – Q2 | ✅ | `r2Score` |
| `cv_incident_q2` | Critical Incident – Q2 | ✅ | `r2CriticalIncident` |
| `cv_score_q3` | Score – Q3 | ✅ | `r3Score` |
| `cv_incident_q3` | Critical Incident – Q3 | ✅ | `r3CriticalIncident` |
| `cv_score_q4` | Score – Q4 | ✅ | `r4Score` |
| `cv_incident_q4` | Critical Incident – Q4 | ✅ | `r4CriticalIncident` |
| `cv_avg_score` | Avg Score (auto) | ✅ | `averageScore` |

> **Mostly complete.** Pilot score field exists in the Mongoose schema but the TypeScript interface has a comment saying "no score, just critical incident" — needs clarification.

---

### Section 6 — Self Development ✅

Stored in `Team.ts → ISelfDevelopmentKRA`.

| Spec `field_id` | Status | Current Field |
|---|---|---|
| `sd_section_weight` | ✅ | `dimensionWeights.selfDevelopment` |
| `sd_area` | ✅ | `areaOfConcern` |
| `sd_action_plan` | ✅ | `actionPlanInitiative` |
| `sd_score_pilot` | ✅ | `pilotScore` |
| `sd_reason_pilot` | ✅ | `pilotReason` |
| `sd_score_q1` – `sd_score_q4` | ✅ | `r1Score` – `r4Score` |
| `sd_reason_q1` – `sd_reason_q4` | ✅ | `r1Reason` – `r4Reason` |
| `sd_avg_score` | ✅ | `averageScore` |

> **All 13 fields implemented.** ✅

---

### Section 7 — Developing Others ✅

Stored in `Team.ts → IDevelopingOthersKRA`.

| Spec `field_id` | Status | Current Field |
|---|---|---|
| `do_section_weight` | ✅ | `dimensionWeights.developingOthers` |
| `do_person_name` | ✅ | `person` |
| `do_area` | ✅ | `areaOfDevelopment` |
| `do_score_pilot` | ✅ | `pilotScore` |
| `do_reason_pilot` | ✅ | `pilotReason` |
| `do_score_q1` – `do_score_q4` | ✅ | `r1Score` – `r4Score` |
| `do_reason_q1` – `do_reason_q4` | ✅ | `r1Reason` – `r4Reason` |
| `do_avg_score` | ✅ | `averageScore` |

> **All 13 fields implemented.** ✅

---

### Section 8 — Remarks & Actionables ❌

| Spec `field_id` | Spec Label | Status |
|---|---|---|
| `remarks_pilot` | Remarks – PILOT | ❌ **Missing** |
| `remarks_q1` | Remarks – Q1 | ❌ **Missing** |
| `remarks_q2` | Remarks – Q2 | ❌ **Missing** |
| `remarks_q3` | Remarks – Q3 | ❌ **Missing** |
| `remarks_q4` | Remarks – Q4 | ❌ **Missing** |

> **Entirely missing.** No `remarks` field in any model. The `Feedback` model exists but serves a different purpose (mid-cycle notes), and `ActionPlan` tracks items, not free-text remarks.

---

### Section 9 — Score Summary (Auto-Calculated) ❌

All 26 auto-calculated fields are **not implemented anywhere**:

- ❌ `score_functional_pilot` through `score_functional_q4` (5 fields)
- ❌ `score_org_pilot` through `score_org_q4` (5 fields)
- ❌ `score_sd_pilot` through `score_sd_q4` (5 fields)
- ❌ `score_do_pilot` through `score_do_q4` (5 fields)
- ❌ `total_score_pilot` through `total_score_q4` (5 fields)
- ❌ `final_avg_score` (1 field)

> **All 26 auto-calculated score summary fields are missing.** No backend logic or frontend display for weighted aggregate scores.

---

## Key Structural Differences

| Area | Spec Says | Project Does |
|---|---|---|
| **Weight model** | Single `fd_weight` per row (0–1 range) | Separate weights per period (`pilotWeight`, `r1Weight`, etc.) in 0–100 range |
| **Weight range** | 0 to 1 | 0 to 100 |
| **Pilot period naming** | Explicit "PILOT" period | Uses `pilot*` prefix (consistent) |
| **Core Values (Sec 5)** | Fixed rows, admin-configurable per client | Dynamic array, rows can be added/deleted |
| **Score range** | 1–5 | 0–5 (allows 0) |
| **Review periods** | 5 periods: PILOT + Q1–Q4 | 5 periods: Pilot + R1–R4 (naming: R vs Q) |
| **Section weights** | Must sum to 1.0 | Use 0–100 scale, presumably sum to 100 |

---

## Summary: What's Missing (46 fields)

| Category | Missing Fields | Count |
|---|---|---|
| Employee Header | client name, DOJ, department, location, KRA date, review year | 6 |
| Review Dates | pilot date | 1 |
| Facilitators | pilot facilitator | 1 |
| Functional Comments | comments for pilot + Q1–Q4 | 5 |
| Org Pilot Score | pilot score (ambiguous — schema has it, interface says no) | 1 |
| Remarks | all 5 period remarks | 5 |
| Score Summary | all 26 auto-calculated aggregate scores | 26 |
| **Total Missing** | | **~45–46** |
