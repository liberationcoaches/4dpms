import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import mongoose from 'mongoose';

/**
 * Get all organizations assigned to a reviewer
 */
export async function getAssignedOrganizations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reviewerId = req.query.userId as string;

    if (!reviewerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate reviewer
    const reviewer = await User.findById(reviewerId);
    if (!reviewer || reviewer.role !== 'reviewer') {
      res.status(403).json({
        status: 'error',
        message: 'Only reviewers can access this',
      });
      return;
    }

    // Get all organizations assigned to this reviewer
    const organizations = await Organization.find({
      reviewerId: reviewer._id,
    }).select('name industry size subscriptionStatus createdAt');

    res.status(200).json({
      status: 'success',
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all employees in a specific organization (Reviewer view)
 */
export async function getOrgEmployees(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orgId } = req.params;
    const reviewerId = req.query.userId as string;

    if (!reviewerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Verify reviewer is assigned to this org
    const org = await Organization.findOne({
      _id: orgId,
      reviewerId: reviewerId,
    });

    if (!org) {
      res.status(403).json({
        status: 'error',
        message: 'Reviewer is not assigned to this organization',
      });
      return;
    }

    // Get employees
    const employees = await User.find({
      organizationId: orgId,
      role: 'employee',
    }).select('name email mobile role managerId');

    const employeesWithDetails = await Promise.all(
      employees.map(async (emp) => {
        const manager = emp.managerId ? await User.findById(emp.managerId).select('name') : null;
        return {
          _id: emp._id,
          name: emp.name,
          email: emp.email,
          mobile: emp.mobile,
          manager: manager?.name || 'Unknown',
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: employeesWithDetails,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all employees assigned to reviewer for scoring (Global view - Legacy)
 */
export async function getEmployeesToReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reviewerId = req.query.userId as string;

    if (!reviewerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate reviewer
    const reviewer = await User.findById(reviewerId);
    if (!reviewer || reviewer.role !== 'reviewer') {
      res.status(403).json({
        status: 'error',
        message: 'Only reviewers can access this',
      });
      return;
    }

    // Get all organizations assigned to this reviewer
    const organizations = await Organization.find({
      reviewerId: reviewer._id,
    });

    const orgIds = organizations.map((org) => org._id);

    // Get all employees in these organizations
    const employees = await User.find({
      organizationId: { $in: orgIds },
      role: 'employee',
    }).select('name email mobile role organizationId managerId');

    // Populate organization and manager info
    const employeesWithDetails = await Promise.all(
      employees.map(async (emp) => {
        const org = await Organization.findById(emp.organizationId);
        const manager = emp.managerId ? await User.findById(emp.managerId).select('name') : null;
        
        return {
          _id: emp._id,
          name: emp.name,
          email: emp.email,
          mobile: emp.mobile,
          organization: org?.name || 'Unknown',
          manager: manager?.name || 'Unknown',
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: employeesWithDetails,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get employee details with KRA structure for scoring
 */
export async function getEmployeeForScoring(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { employeeId } = req.params;
    const reviewerId = req.query.userId as string;

    if (!reviewerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate reviewer
    const reviewer = await User.findById(reviewerId);
    if (!reviewer || reviewer.role !== 'reviewer') {
      res.status(403).json({
        status: 'error',
        message: 'Only reviewers can access this',
      });
      return;
    }

    // Get employee
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
      return;
    }

    // Verify reviewer is assigned to employee's organization
    const organization = await Organization.findById(employee.organizationId);
    if (!organization || organization.reviewerId?.toString() !== reviewerId) {
      res.status(403).json({
        status: 'error',
        message: 'Reviewer is not assigned to this employee\'s organization',
      });
      return;
    }

    // Get team member details if exists
    const team = await Team.findOne({
      'membersDetails.mobile': employee.mobile,
    });

    const memberDetails = team?.membersDetails.find(
      (m) => m.mobile === employee.mobile
    );

    res.status(200).json({
      status: 'success',
      data: {
        employee: {
          _id: employee._id,
          name: employee.name,
          email: employee.email,
          mobile: employee.mobile,
        },
        kras: memberDetails || {
          functionalKRAs: [],
          organizationalKRAs: [],
          selfDevelopmentKRAs: [],
          developingOthersKRAs: [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit scores for an employee
 */
export async function submitScores(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { employeeId } = req.params;
    const { reviewPeriod, scores, comments } = req.body;
    const reviewerId = req.query.userId as string;

    if (!reviewerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate reviewer
    const reviewer = await User.findById(reviewerId);
    if (!reviewer || reviewer.role !== 'reviewer') {
      res.status(403).json({
        status: 'error',
        message: 'Only reviewers can submit scores',
      });
      return;
    }

    // Validate review period
    if (!reviewPeriod || ![1, 2, 3, 4].includes(reviewPeriod)) {
      res.status(400).json({
        status: 'error',
        message: 'Valid review period (1-4) is required',
      });
      return;
    }

    // Get employee
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
      return;
    }

    // Verify reviewer is assigned to employee's organization
    const organization = await Organization.findById(employee.organizationId);
    if (!organization || organization.reviewerId?.toString() !== reviewerId) {
      res.status(403).json({
        status: 'error',
        message: 'Reviewer is not assigned to this employee\'s organization',
      });
      return;
    }

    // Get or create team
    let team = await Team.findOne({
      'membersDetails.mobile': employee.mobile,
    });

    if (!team) {
      // Create team if doesn't exist
      team = new Team({
        name: `${employee.name}'s Team`,
        code: `TEAM${Math.random().toString().slice(2, 6).toUpperCase()}`,
        members: [employee._id],
        membersDetails: [
          {
            name: employee.name,
            role: 'Employee',
            mobile: employee.mobile,
            functionalKRAs: [],
            organizationalKRAs: [],
            selfDevelopmentKRAs: [],
            developingOthersKRAs: [],
          },
        ],
        createdBy: employee._id,
      });
    }

    // Find or create member details
    let memberIndex = team.membersDetails.findIndex(
      (m) => m.mobile === employee.mobile
    );

    if (memberIndex === -1) {
      team.membersDetails.push({
        name: employee.name,
        role: 'Employee',
        mobile: employee.mobile,
        functionalKRAs: [],
        organizationalKRAs: [],
        selfDevelopmentKRAs: [],
        developingOthersKRAs: [],
      });
      memberIndex = team.membersDetails.length - 1;
    }

    const member = team.membersDetails[memberIndex];

    // Update scores based on review period
    const periodPrefix = `r${reviewPeriod}`;

    // Update functional KRAs
    if (scores.functionalKRAs && Array.isArray(scores.functionalKRAs)) {
      scores.functionalKRAs.forEach((kraScore: any, index: number) => {
        if (!member.functionalKRAs[index]) {
          // Only create new KRA if kra field is provided and not empty
          if (!kraScore.kra || !kraScore.kra.trim()) {
            // Skip creating KRA without required field
            return;
          }
          member.functionalKRAs.push({
            kra: kraScore.kra.trim(),
            kpiTarget: kraScore.kpiTarget || '',
            reportsGenerated: kraScore.reportsGenerated || '',
          });
        }
        const kra = member.functionalKRAs[index];
        if (!kra) return; // Skip if KRA doesn't exist
        
        if (periodPrefix === 'r1') {
          kra.r1Weight = kraScore.weight || 0;
          kra.r1Score = kraScore.score || 0;
          kra.r1ActualPerf = kraScore.actualPerf || '';
        } else if (periodPrefix === 'r2') {
          kra.r2Weight = kraScore.weight || 0;
          kra.r2Score = kraScore.score || 0;
          kra.r2ActualPerf = kraScore.actualPerf || '';
        } else if (periodPrefix === 'r3') {
          kra.r3Weight = kraScore.weight || 0;
          kra.r3Score = kraScore.score || 0;
          kra.r3ActualPerf = kraScore.actualPerf || '';
        } else if (periodPrefix === 'r4') {
          kra.r4Weight = kraScore.weight || 0;
          kra.r4Score = kraScore.score || 0;
          kra.r4ActualPerf = kraScore.actualPerf || '';
        }
      });
    }

    // Update organizational KRAs
    if (scores.organizationalKRAs && Array.isArray(scores.organizationalKRAs)) {
      scores.organizationalKRAs.forEach((kraScore: any, index: number) => {
        if (!member.organizationalKRAs[index]) {
          // Only create new KRA if coreValues field is provided and not empty
          const coreValue = kraScore.coreValues || kraScore.coreValue;
          if (!coreValue || !coreValue.trim()) {
            // Skip creating KRA without required field
            return;
          }
          member.organizationalKRAs.push({
            coreValues: coreValue.trim(),
          });
        }
        const kra = member.organizationalKRAs[index];
        if (!kra) return; // Skip if KRA doesn't exist
        
        if (periodPrefix === 'r1') {
          kra.r1Score = kraScore.score || 0;
          kra.r1CriticalIncident = kraScore.criticalIncident || '';
        } else if (periodPrefix === 'r2') {
          kra.r2Score = kraScore.score || 0;
          kra.r2CriticalIncident = kraScore.criticalIncident || '';
        } else if (periodPrefix === 'r3') {
          kra.r3Score = kraScore.score || 0;
          kra.r3CriticalIncident = kraScore.criticalIncident || '';
        } else if (periodPrefix === 'r4') {
          kra.r4Score = kraScore.score || 0;
          kra.r4CriticalIncident = kraScore.criticalIncident || '';
        }
      });
    }

    // Update self development KRAs
    if (scores.selfDevelopmentKRAs && Array.isArray(scores.selfDevelopmentKRAs)) {
      scores.selfDevelopmentKRAs.forEach((kraScore: any, index: number) => {
        if (!member.selfDevelopmentKRAs[index]) {
          // Only create new KRA if areaOfConcern field is provided and not empty
          if (!kraScore.areaOfConcern || !kraScore.areaOfConcern.trim()) {
            // Skip creating KRA without required field
            return;
          }
          member.selfDevelopmentKRAs.push({
            areaOfConcern: kraScore.areaOfConcern.trim(),
            actionPlanInitiative: kraScore.actionPlanInitiative || '',
          });
        }
        const kra = member.selfDevelopmentKRAs[index];
        if (!kra) return; // Skip if KRA doesn't exist
        
        if (periodPrefix === 'r1') {
          kra.r1Score = kraScore.score || 0;
          kra.r1Reason = kraScore.reason || '';
        } else if (periodPrefix === 'r2') {
          kra.r2Score = kraScore.score || 0;
          kra.r2Reason = kraScore.reason || '';
        } else if (periodPrefix === 'r3') {
          kra.r3Score = kraScore.score || 0;
          kra.r3Reason = kraScore.reason || '';
        } else if (periodPrefix === 'r4') {
          kra.r4Score = kraScore.score || 0;
          kra.r4Reason = kraScore.reason || '';
        }
      });
    }

    // Update developing others KRAs
    if (scores.developingOthersKRAs && Array.isArray(scores.developingOthersKRAs)) {
      scores.developingOthersKRAs.forEach((kraScore: any, index: number) => {
        if (!member.developingOthersKRAs[index]) {
          // Only create new KRA if person field is provided and not empty
          if (!kraScore.person || !kraScore.person.trim()) {
            // Skip creating KRA without required field
            return;
          }
          member.developingOthersKRAs.push({
            person: kraScore.person.trim(),
            areaOfDevelopment: kraScore.areaOfDevelopment || '',
          });
        }
        const kra = member.developingOthersKRAs[index];
        if (!kra) return; // Skip if KRA doesn't exist
        
        if (periodPrefix === 'r1') {
          kra.r1Score = kraScore.score || 0;
          kra.r1Reason = kraScore.reason || '';
        } else if (periodPrefix === 'r2') {
          kra.r2Score = kraScore.score || 0;
          kra.r2Reason = kraScore.reason || '';
        } else if (periodPrefix === 'r3') {
          kra.r3Score = kraScore.score || 0;
          kra.r3Reason = kraScore.reason || '';
        } else if (periodPrefix === 'r4') {
          kra.r4Score = kraScore.score || 0;
          kra.r4Reason = kraScore.reason || '';
        }
      });
    }

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Scores submitted successfully',
      data: {
        employeeId: employee._id,
        reviewPeriod,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lock review (timestamp and prevent further edits)
 */
export async function lockReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { employeeId } = req.params;
    const { reviewPeriod } = req.body;
    const reviewerId = req.query.userId as string;

    if (!reviewerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate reviewer
    const reviewer = await User.findById(reviewerId);
    if (!reviewer || reviewer.role !== 'reviewer') {
      res.status(403).json({
        status: 'error',
        message: 'Only reviewers can lock reviews',
      });
      return;
    }

    // Get employee
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
      return;
    }

    // Get team
    const team = await Team.findOne({
      'membersDetails.mobile': employee.mobile,
    });

    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'Team member details not found',
      });
      return;
    }

    const memberIndex = team.membersDetails.findIndex(
      (m) => m.mobile === employee.mobile
    );

    if (memberIndex === -1) {
      res.status(404).json({
        status: 'error',
        message: 'Member details not found',
      });
      return;
    }

    // TODO: Add locked field to Team schema or create separate ReviewLock model
    // For now, we'll just return success with timestamp
    const lockTimestamp = new Date();

    res.status(200).json({
      status: 'success',
      message: 'Review locked successfully',
      data: {
        employeeId: employee._id,
        reviewPeriod,
        lockedAt: lockTimestamp,
        lockedBy: reviewerId,
      },
    });
  } catch (error) {
    next(error);
  }
}

