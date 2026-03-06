# 4D PMS App — Input Field Specification
**Purpose:** This document defines every input field required to build the 4D Performance Management System (PMS) app. It is structured for AI agents to parse without ambiguity.

---

## HOW TO READ THIS DOCUMENT

- `field_id` — unique machine-readable identifier for each field
- `type` — the UI input type to render
- `editable` — whether a human fills this in (`YES`) or the system computes it (`NO — AUTO`)
- `required` — whether the field must have a value before submitting
- `repeat` — whether this field appears once (`ONCE`) or repeats per row in a table (`PER_ROW`)
- `periods` — review periods are: `PILOT, Q1, Q2, Q3, Q4`

---

## GLOBAL RULES

```
RULE_1: Fields with editable=NO must never accept user input. Display computed value only.
RULE_2: Score fields only accept integers or decimals between 1 and 5 (inclusive).
RULE_3: Weight fields must be numbers between 0 and 1. All weights in a section must sum to 1.
RULE_4: Date fields must follow format: YYYY-MM-DD.
RULE_5: Empty rows in dynamic tables (sections 4, 6, 7) must be ignored — do not divide by zero.
RULE_6: Average Score = mean of all non-empty period scores in that row. Skip blank periods.
RULE_7: Sections 4, 6, 7 are dynamic tables. Rows can be added or removed by the user.
RULE_8: Section 5 (Core Values) has FIXED rows. The core value names cannot be changed.
```

---

## SECTION 1 — EMPLOYEE HEADER
**Description:** Basic employee and review metadata. Filled once per review cycle. Not repeated.

| field_id | label | type | editable | required | repeat |
|---|---|---|---|---|---|
| `emp_client_name` | Client Name | Text | YES | YES | ONCE |
| `emp_name` | Employee Name | Text | YES | YES | ONCE |
| `emp_doj` | Date of Joining | Date | YES | YES | ONCE |
| `emp_designation` | Designation | Text | YES | YES | ONCE |
| `emp_department` | Department | Text | YES | YES | ONCE |
| `emp_location` | Location | Text | YES | YES | ONCE |
| `emp_reviewed_by` | Reviewed By | Text | YES | YES | ONCE |
| `emp_kra_date` | KRA Date | Date | YES | YES | ONCE |
| `emp_review_year` | Performance Review Year | Text | YES | YES | ONCE |

---

## SECTION 2 — REVIEW PERIOD DATES
**Description:** One date per review period. There are 5 periods: PILOT, Q1, Q2, Q3, Q4.

| field_id | label | type | editable | required | repeat |
|---|---|---|---|---|---|
| `date_pilot` | Review Date – PILOT | Date | YES | YES | ONCE |
| `date_q1` | Review Date – Q1 | Date | YES | NO | ONCE |
| `date_q2` | Review Date – Q2 | Date | YES | NO | ONCE |
| `date_q3` | Review Date – Q3 | Date | YES | NO | ONCE |
| `date_q4` | Review Date – Q4 | Date | YES | NO | ONCE |

---

## SECTION 3 — LCPL FACILITATORS
**Description:** Name of the facilitator conducting each review period session.

| field_id | label | type | editable | required | repeat |
|---|---|---|---|---|---|
| `facilitator_pilot` | Facilitator – PILOT | Text | YES | YES | ONCE |
| `facilitator_q1` | Facilitator – Q1 | Text | YES | NO | ONCE |
| `facilitator_q2` | Facilitator – Q2 | Text | YES | NO | ONCE |
| `facilitator_q3` | Facilitator – Q3 | Text | YES | NO | ONCE |
| `facilitator_q4` | Facilitator – Q4 | Text | YES | NO | ONCE |

---

## SECTION 4 — FUNCTIONAL DIMENSION
**Description:** Core job responsibilities scored each period. Dynamic table — rows added per KRA.

**Section-level field (set once, applies to all rows):**

| field_id | label | type | editable | required |
|---|---|---|---|---|
| `functional_section_weight` | Section Weight | Number (0–1) | YES | YES |

**Per-row fields (repeat for each KRA row):**

| field_id | label | type | editable | required | repeat |
|---|---|---|---|---|---|
| `fd_kra` | KRA (Key Result Area) | Text | YES | YES | PER_ROW |
| `fd_kpi` | KPI / Target | Text | YES | YES | PER_ROW |
| `fd_report` | Report / Evidence Document | Text | YES | NO | PER_ROW |
| `fd_weight` | Row Weight | Number (0–1) | YES | YES | PER_ROW |
| `fd_score_pilot` | Score – PILOT | Number (1–5) | YES | YES | PER_ROW |
| `fd_comment_pilot` | Comment – PILOT | Text | YES | NO | PER_ROW |
| `fd_score_q1` | Score – Q1 | Number (1–5) | YES | NO | PER_ROW |
| `fd_comment_q1` | Comment – Q1 | Text | YES | NO | PER_ROW |
| `fd_score_q2` | Score – Q2 | Number (1–5) | YES | NO | PER_ROW |
| `fd_comment_q2` | Comment – Q2 | Text | YES | NO | PER_ROW |
| `fd_score_q3` | Score – Q3 | Number (1–5) | YES | NO | PER_ROW |
| `fd_comment_q3` | Comment – Q3 | Text | YES | NO | PER_ROW |
| `fd_score_q4` | Score – Q4 | Number (1–5) | YES | NO | PER_ROW |
| `fd_comment_q4` | Comment – Q4 | Text | YES | NO | PER_ROW |
| `fd_avg_score` | Average Score | Number | NO — AUTO | — | PER_ROW |

**Calculation rule for fd_avg_score:**
```
fd_avg_score = AVERAGE of (fd_score_pilot, fd_score_q1, fd_score_q2, fd_score_q3, fd_score_q4)
Only include periods where a score has been entered. Skip empty periods.
```

---

## SECTION 5 — ORGANIZATIONAL DIMENSION (CORE VALUES)
**Description:** Fixed set of company core values scored each period. Rows are NOT dynamic.

**Section-level field:**

| field_id | label | type | editable | required |
|---|---|---|---|---|
| `org_section_weight` | Section Weight | Number (0–1) | YES | YES |

**Fixed row names (admin configures per client at setup — then locked for that review cycle):**
```
ROW_1: Teamwork  (default)
ROW_2: Continuous Improvement and Upgradation  (default)
ROW_3: Excellence in Quality  (default)
ROW_4: Service to Customer Above All  (default)
ROW_5: Relationship for Life  (default)

Example alternate set used by some clients: Business Ethics, Trust, Excellence, Quality, Corporate Social Responsibility
```

**Per-row fields (same structure for each of the 5 fixed rows):**

| field_id | label | type | editable | required | repeat |
|---|---|---|---|---|---|
| `cv_score_pilot` | Score – PILOT | Number (1–5) | YES | YES | PER_ROW |
| `cv_incident_pilot` | Critical Incident – PILOT | Text | YES | NO | PER_ROW |
| `cv_score_q1` | Score – Q1 | Number (1–5) | YES | NO | PER_ROW |
| `cv_incident_q1` | Critical Incident – Q1 | Text | YES | NO | PER_ROW |
| `cv_score_q2` | Score – Q2 | Number (1–5) | YES | NO | PER_ROW |
| `cv_incident_q2` | Critical Incident – Q2 | Text | YES | NO | PER_ROW |
| `cv_score_q3` | Score – Q3 | Number (1–5) | YES | NO | PER_ROW |
| `cv_incident_q3` | Critical Incident – Q3 | Text | YES | NO | PER_ROW |
| `cv_score_q4` | Score – Q4 | Number (1–5) | YES | NO | PER_ROW |
| `cv_incident_q4` | Critical Incident – Q4 | Text | YES | NO | PER_ROW |
| `cv_avg_score` | Average Score | Number | NO — AUTO | — | PER_ROW |

**Calculation rule for cv_avg_score:**
```
cv_avg_score = AVERAGE of (cv_score_pilot, cv_score_q1, cv_score_q2, cv_score_q3, cv_score_q4)
Only include periods where a score has been entered. Skip empty periods.
```

---

## SECTION 6 — SELF DEVELOPMENT
**Description:** Areas the employee is actively developing themselves in. Dynamic table.

**Section-level field:**

| field_id | label | type | editable | required |
|---|---|---|---|---|
| `sd_section_weight` | Section Weight | Number (0–1) | YES | YES |

**Per-row fields:**

| field_id | label | type | editable | required | repeat |
|---|---|---|---|---|---|
| `sd_area` | Area of Concern | Text | YES | YES | PER_ROW |
| `sd_action_plan` | Action Plan / Initiative | Text | YES | YES | PER_ROW |
| `sd_score_pilot` | Score – PILOT | Number (1–5) | YES | YES | PER_ROW |
| `sd_reason_pilot` | Reason – PILOT | Text | YES | NO | PER_ROW |
| `sd_score_q1` | Score – Q1 | Number (1–5) | YES | NO | PER_ROW |
| `sd_reason_q1` | Reason – Q1 | Text | YES | NO | PER_ROW |
| `sd_score_q2` | Score – Q2 | Number (1–5) | YES | NO | PER_ROW |
| `sd_reason_q2` | Reason – Q2 | Text | YES | NO | PER_ROW |
| `sd_score_q3` | Score – Q3 | Number (1–5) | YES | NO | PER_ROW |
| `sd_reason_q3` | Reason – Q3 | Text | YES | NO | PER_ROW |
| `sd_score_q4` | Score – Q4 | Number (1–5) | YES | NO | PER_ROW |
| `sd_reason_q4` | Reason – Q4 | Text | YES | NO | PER_ROW |
| `sd_avg_score` | Average Score | Number | NO — AUTO | — | PER_ROW |

**Calculation rule for sd_avg_score:**
```
sd_avg_score = AVERAGE of (sd_score_pilot, sd_score_q1, sd_score_q2, sd_score_q3, sd_score_q4)
Only include periods where a score has been entered. Skip empty periods.
```

---

## SECTION 7 — DEVELOPING OTHERS
**Description:** People the employee is coaching or mentoring. Dynamic table.

**Section-level field:**

| field_id | label | type | editable | required |
|---|---|---|---|---|
| `do_section_weight` | Section Weight | Number (0–1) | YES | YES |

**Per-row fields:**

| field_id | label | type | editable | required | repeat |
|---|---|---|---|---|---|
| `do_person_name` | Person Being Developed | Text | YES | YES | PER_ROW |
| `do_area` | Area of Development | Text | YES | YES | PER_ROW |
| `do_score_pilot` | Score – PILOT | Number (1–5) | YES | YES | PER_ROW |
| `do_reason_pilot` | Reason – PILOT | Text | YES | NO | PER_ROW |
| `do_score_q1` | Score – Q1 | Number (1–5) | YES | NO | PER_ROW |
| `do_reason_q1` | Reason – Q1 | Text | YES | NO | PER_ROW |
| `do_score_q2` | Score – Q2 | Number (1–5) | YES | NO | PER_ROW |
| `do_reason_q2` | Reason – Q2 | Text | YES | NO | PER_ROW |
| `do_score_q3` | Score – Q3 | Number (1–5) | YES | NO | PER_ROW |
| `do_reason_q3` | Reason – Q3 | Text | YES | NO | PER_ROW |
| `do_score_q4` | Score – Q4 | Number (1–5) | YES | NO | PER_ROW |
| `do_reason_q4` | Reason – Q4 | Text | YES | NO | PER_ROW |
| `do_avg_score` | Average Score | Number | NO — AUTO | — | PER_ROW |

**Calculation rule for do_avg_score:**
```
do_avg_score = AVERAGE of (do_score_pilot, do_score_q1, do_score_q2, do_score_q3, do_score_q4)
Only include periods where a score has been entered. Skip empty periods.
```

---

## SECTION 8 — REMARKS AND ACTIONABLES
**Description:** Free-text notes written by the reviewer after each review period session.

| field_id | label | type | editable | required | repeat |
|---|---|---|---|---|---|
| `remarks_pilot` | Remarks – PILOT | Text Area | YES | NO | ONCE |
| `remarks_q1` | Remarks – Q1 | Text Area | YES | NO | ONCE |
| `remarks_q2` | Remarks – Q2 | Text Area | YES | NO | ONCE |
| `remarks_q3` | Remarks – Q3 | Text Area | YES | NO | ONCE |
| `remarks_q4` | Remarks – Q4 | Text Area | YES | NO | ONCE |

---

## SECTION 9 — SCORE SUMMARY (ALL AUTO-CALCULATED — NO USER INPUT)
**Description:** Final score rollup. Every value here is computed. Display as read-only.

| field_id | label | formula |
|---|---|---|
| `score_functional_pilot` | Functional Score – PILOT | SUM(fd_score_pilot x fd_weight) for all rows |
| `score_functional_q1` | Functional Score – Q1 | SUM(fd_score_q1 x fd_weight) for all rows |
| `score_functional_q2` | Functional Score – Q2 | SUM(fd_score_q2 x fd_weight) for all rows |
| `score_functional_q3` | Functional Score – Q3 | SUM(fd_score_q3 x fd_weight) for all rows |
| `score_functional_q4` | Functional Score – Q4 | SUM(fd_score_q4 x fd_weight) for all rows |
| `score_org_pilot` | Org Score – PILOT | AVERAGE(cv_score_pilot) across all 5 core value rows |
| `score_org_q1` | Org Score – Q1 | AVERAGE(cv_score_q1) across all 5 core value rows |
| `score_org_q2` | Org Score – Q2 | AVERAGE(cv_score_q2) across all 5 core value rows |
| `score_org_q3` | Org Score – Q3 | AVERAGE(cv_score_q3) across all 5 core value rows |
| `score_org_q4` | Org Score – Q4 | AVERAGE(cv_score_q4) across all 5 core value rows |
| `score_sd_pilot` | Self Dev Score – PILOT | AVERAGE(sd_score_pilot) across all rows |
| `score_sd_q1` | Self Dev Score – Q1 | AVERAGE(sd_score_q1) across all rows |
| `score_sd_q2` | Self Dev Score – Q2 | AVERAGE(sd_score_q2) across all rows |
| `score_sd_q3` | Self Dev Score – Q3 | AVERAGE(sd_score_q3) across all rows |
| `score_sd_q4` | Self Dev Score – Q4 | AVERAGE(sd_score_q4) across all rows |
| `score_do_pilot` | Dev Others Score – PILOT | AVERAGE(do_score_pilot) across all rows |
| `score_do_q1` | Dev Others Score – Q1 | AVERAGE(do_score_q1) across all rows |
| `score_do_q2` | Dev Others Score – Q2 | AVERAGE(do_score_q2) across all rows |
| `score_do_q3` | Dev Others Score – Q3 | AVERAGE(do_score_q3) across all rows |
| `score_do_q4` | Dev Others Score – Q4 | AVERAGE(do_score_q4) across all rows |
| `total_score_pilot` | Total Score – PILOT | (score_functional_pilot x functional_section_weight) + (score_org_pilot x org_section_weight) + (score_sd_pilot x sd_section_weight) + (score_do_pilot x do_section_weight) |
| `total_score_q1` | Total Score – Q1 | Same formula as PILOT using Q1 values |
| `total_score_q2` | Total Score – Q2 | Same formula as PILOT using Q2 values |
| `total_score_q3` | Total Score – Q3 | Same formula as PILOT using Q3 values |
| `total_score_q4` | Total Score – Q4 | Same formula as PILOT using Q4 values |
| `final_avg_score` | Final Average Score | AVERAGE(total_score_pilot, total_score_q1, total_score_q2, total_score_q3, total_score_q4) — skip empty periods |

---

## FIELD COUNT SUMMARY

| Section | User-Input Fields | Auto-Calculated Fields |
|---|---|---|
| 1 — Employee Header | 9 | 0 |
| 2 — Review Period Dates | 5 | 0 |
| 3 — LCPL Facilitators | 5 | 0 |
| 4 — Functional Dimension (per KRA row) | 14 | 1 |
| 5 — Organizational Dimension (per core value row) | 10 | 1 |
| 6 — Self Development (per row) | 12 | 1 |
| 7 — Developing Others (per row) | 12 | 1 |
| 8 — Remarks | 5 | 0 |
| 9 — Score Summary | 0 | 26 |

---

## KEY DECISIONS FOR THE DEVELOPER / AI AGENT

```
DECISION_1: Sections 4, 6, 7 are dynamic tables. Store as arrays of objects in the database.
DECISION_2: Section 5 (Core Values) row names are configurable per client at setup, then locked.
DECISION_3: Never show division errors — if no scores exist for a period, display blank or "—".
DECISION_4: Section weights (functional, org, self dev, developing others) must sum to 1.0.
DECISION_5: The Score Summary (Section 9) must auto-refresh whenever any score input changes.
DECISION_6: Each employee record maps to one full set of these sections per review cycle year.
DECISION_7: The PILOT period is mandatory. Q1 through Q4 are optional, filled progressively.
```
