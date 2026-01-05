# Seed Examples Data

This seed script populates the database with complete example data matching the scenarios in `SYSTEM_EXAMPLES.md`.

## Usage

Run the seed script:

```bash
cd server
npm run seed:examples
```

Or from root:

```bash
npm run seed:examples --workspace=server
```

## What Gets Created

The seed script creates:

1. **Platform Admin**
   - Email: `admin@platform.com`
   - Mobile: `9999999999`
   - Role: `platform_admin`

2. **Reviewer**
   - Name: Dr. Sarah Johnson
   - Email: `sarah.johnson@reviewer.com`
   - Mobile: `8888888888`
   - Role: `reviewer`

3. **Organization**
   - Name: TechCorp Solutions
   - Industry: Technology
   - Size: 150 employees
   - Subscription: Trial

4. **Boss**
   - Name: John Smith
   - Email: `john.smith@techcorp.com`
   - Mobile: `7777777777`
   - Role: `boss`

5. **Manager**
   - Name: Maria Garcia
   - Email: `maria.garcia@techcorp.com`
   - Mobile: `9876543210`
   - Role: `manager`

6. **Employees** (3 employees)
   - Alex Chen (`alex.chen@techcorp.com`) - Software Developer
   - Emily Rodriguez (`emily.r@techcorp.com`) - Senior Developer
   - David Kim (`david.kim@techcorp.com`) - Frontend Developer

7. **Review Cycle**
   - Frequency: Quarterly
   - Start Date: Jan 1, 2024
   - Current Period: 1
   - Next Review Date: Apr 1, 2024

8. **Team Data**
   - Team name: Engineering Team
   - Team code: TEAM1234
   - Member details with complete KRA scores for Period 1
   - Scores include:
     - Functional Dimension KRAs
     - Organizational Dimension KRAs
     - Self Development KRAs
     - Developing Others KRAs

9. **Sample Notifications**
   - Review period start notifications
   - Review completed notifications

## Testing the Frontend

After seeding, you can test the frontend by:

### Platform Admin
1. The organization "TechCorp Solutions" will appear at `/admin/dashboard`
2. You can see system analytics
3. Organization already has reviewer assigned

### Boss Dashboard
1. Use `userId` from the boss user (John Smith)
2. Visit `/dashboard/boss`
3. You'll see:
   - 1 manager (Maria Garcia)
   - 3 employees
   - Department comparisons
   - Organization overview

### Manager Dashboard
1. Use `userId` from the manager user (Maria Garcia)
2. Visit `/dashboard/manager`
3. You'll see:
   - 3 employees in the team
   - Team performance metrics
   - Top performers
   - Individual employee scores

### Employee Dashboard
1. Use `userId` from any employee (e.g., Alex Chen)
2. Visit `/dashboard/employee`
3. You'll see:
   - Current score (calculated from KRAs)
   - Historical trends
   - Feedback and comments
   - Next review date

### Reviewer Dashboard
1. Use `userId` from the reviewer user (Dr. Sarah Johnson)
2. Visit `/reviewer/dashboard`
3. You'll see:
   - List of all employees in TechCorp Solutions
   - Can click to enter/view scores

### Notifications
1. Use any user's `userId`
2. Visit `/dashboard/notifications`
3. You'll see sample notifications

## Getting User IDs

To get user IDs for testing, you can:

1. **Check MongoDB directly:**
   ```javascript
   db.users.find({ email: "john.smith@techcorp.com" })
   ```

2. **Use the list_users script** (if available)

3. **Login through the UI:**
   - The system stores `userId` in localStorage after login
   - Check browser console: `localStorage.getItem('userId')`

## Important Notes

- The seed script **deletes** existing data with matching emails before creating new data
- All users are created with verified emails and mobiles
- All users are active by default
- The review cycle is set to start on Jan 1, 2024 (adjust dates in script if needed)
- Scores are populated for Period 1 only
- Team code is: `TEAM1234`

## Customization

You can modify `server/src/scripts/seedExamples.ts` to:
- Add more employees
- Change dates
- Modify scores
- Add more organizations
- Create additional managers
- Add more notifications

## Clearing Seed Data

To remove the example data, you can either:

1. **Delete by email patterns:**
   ```javascript
   db.users.deleteMany({ email: { $regex: /@techcorp\.com|@platform\.com|@reviewer\.com/ } })
   db.organizations.deleteMany({ name: "TechCorp Solutions" })
   ```

2. **Run seed script again** (it clears matching data first)

3. **Manual deletion in MongoDB**

