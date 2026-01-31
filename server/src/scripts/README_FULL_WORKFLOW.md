# Full Workflow Seed Script

This script creates a complete test workflow with a full organizational hierarchy, KRAs, and scores for comprehensive testing.

## Structure Created

### Platform & Review Roles
- **1 Platform Admin**: `platform.admin@testworkflow.com`
- **1 Reviewer**: `reviewer@testworkflow.com`

### Organization Hierarchy
- **1 CSA (Client Side Admin)**: `csa.admin@testworkflow.com`
- **1 Owner Boss**: `owner.boss@testworkflow.com` (The main owner)
- **3 Additional Bosses**: 
  - Boss 1: `boss1@testworkflow.com` (3 Managers, 13 Employees)
  - Boss 2: `boss2@testworkflow.com` (2 Managers, 8 Employees)
  - Boss 3: `boss3@testworkflow.com` (1 Manager, 3 Employees)

### Employee Distribution

**Boss 1 Division:**
- Manager 1-1: 5 employees
- Manager 1-2: 4 employees
- Manager 1-3: 4 employees
- **Total: 13 employees**

**Boss 2 Division:**
- Manager 2-1: 4 employees
- Manager 2-2: 4 employees
- **Total: 8 employees**

**Boss 3 Division:**
- Manager 3-1: 3 employees
- **Total: 3 employees**

**Grand Total: 24 employees across 6 managers**

## KRAs and Scores

Each employee has been populated with:

### Functional KRAs (2-3 per employee)
- Multiple KPIs per KRA
- Pilot period with weight and score
- Review periods R1, R2, R3, R4 with:
  - Weights (10-100%)
  - Scores (0-5 scale)
  - Actual performance notes
- Calculated average scores

### Organizational KRAs (1-2 per employee)
- Core values (Integrity, Innovation, Teamwork, Excellence, Customer Focus, Accountability)
- Pilot period with critical incident
- Review periods R1-R4 with:
  - Scores (0-5 scale)
  - Critical incident descriptions
- Calculated average scores

### Self Development KRAs (1-2 per employee)
- Areas of concern (Technical Skills, Communication, Leadership, etc.)
- Action plan initiatives
- Pilot period with score and reason
- Review periods R1-R4 with:
  - Scores (0-5 scale)
  - Progress reasons
- Calculated average scores

### Developing Others KRAs (0-1 per employee)
- Person being mentored
- Area of development
- Pilot period with score and reason
- Review periods R1-R4 with:
  - Scores (0-5 scale)
  - Progress reasons
- Calculated average scores

## Dimension Weights

All organizations and teams are configured with:
- **Functional**: 50%
- **Organizational**: 30%
- **Self Development**: 15%
- **Developing Others**: 5%

## Running the Seed Script

### Prerequisites
1. Ensure MongoDB is running
2. Set up your `.env` file with `MONGODB_URI`

### Run the Script

```bash
cd server
npm run seed:workflow
```

Or directly with tsx:

```bash
cd server
npx tsx src/scripts/seedFullWorkflow.ts
```

## What Gets Created

- **37 Users Total:**
  - 1 Platform Admin
  - 1 Reviewer
  - 1 CSA
  - 1 Owner Boss
  - 3 Additional Bosses
  - 6 Managers
  - 24 Employees

- **4 Organizations:**
  - Main Organization (Owner Boss)
  - Boss 1 Division
  - Boss 2 Division
  - Boss 3 Division

- **6 Teams:**
  - One team per manager

- **KRAs:**
  - ~50-70 Functional KRAs
  - ~25-50 Organizational KRAs
  - ~25-50 Self Development KRAs
  - ~5-15 Developing Others KRAs

## Login Credentials

All users are created with:
- **Email**: As shown in the structure above
- **Mobile**: Auto-generated 10-digit numbers starting from 9000000000 (Platform Admin), 9000000001 (Reviewer), 9000000002 (CSA), etc.
- **Verification**: All users are pre-verified (isEmailVerified: true, isMobileVerified: true)
- **Status**: All users are active

## Testing the Workflow

After running the seed script, you can:

1. **Login as CSA** to:
   - View organization-wide analytics
   - Manage dimension weights
   - View all teams and employees

2. **Login as Owner Boss** to:
   - View all divisions
   - Manage organization settings
   - Review performance across all bosses

3. **Login as any Boss** to:
   - View their managers and teams
   - Review employee performance
   - Manage their division

4. **Login as any Manager** to:
   - View their team members
   - Add/edit KRAs
   - Review scores
   - Lock scores when ready

5. **Login as any Employee** to:
   - View their KRAs
   - See their scores across all dimensions
   - Track performance over review periods

## Notes

- All scores are randomly generated between 2.5-4.5 to simulate realistic performance
- Weights are randomly varied but kept within 10-100% range
- Average scores are automatically calculated using the same formulas as the production system
- All relationships (bossId, managerId, organizationId, teamId) are properly set up
- The script clears all existing data before seeding

## Troubleshooting

If you encounter errors:

1. **MongoDB Connection Error**: Ensure MongoDB is running and `MONGODB_URI` is correct
2. **Duplicate Key Error**: The script clears existing data first, but if it fails partway, you may need to manually clear collections
3. **Type Errors**: Ensure all dependencies are installed (`npm install`)

## Next Steps

After seeding:
1. Test the review workflow
2. Test score locking functionality
3. Test KRA editing (should only allow one edit)
4. Test calculations and averages
5. Test the hierarchy navigation
6. Test notifications and workflows
