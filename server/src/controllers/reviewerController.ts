import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { ReviewCycle } from '../models/ReviewCycle';
import { ReviewLock } from '../models/ReviewLock';
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
        message: 'Reviewer is not assigned to this Member\'s organization',
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

    const reviewCycle = await ReviewCycle.findOne({
      organizationId: employee.organizationId,
      isActive: true,
    }).select('currentReviewPeriod r1Date r2Date r3Date r4Date r1Facilitator r2Facilitator r3Facilitator r4Facilitator').lean();

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
        reviewCycle: reviewCycle ? {
          currentReviewPeriod: reviewCycle.currentReviewPeriod ?? 1,
          r1Date: reviewCycle.r1Date,
          r2Date: reviewCycle.r2Date,
          r3Date: reviewCycle.r3Date,
          r4Date: reviewCycle.r4Date,
          r1Facilitator: reviewCycle.r1Facilitator,
          r2Facilitator: reviewCycle.r2Facilitator,
          r3Facilitator: reviewCycle.r3Facilitator,
          r4Facilitator: reviewCycle.r4Facilitator,
        } : null,
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
    const { reviewPeriod, scores } = req.body;
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
        message: 'Reviewer is not assigned to this Member\'s organization',
      });
      return;
    }

    // Only current review period is editable
    const reviewCycle = await ReviewCycle.findOne({
      organizationId: employee.organizationId,
      isActive: true,
    }).select('currentReviewPeriod').lean();
    const currentPeriod = reviewCycle?.currentReviewPeriod ?? 1;
    if (reviewPeriod !== currentPeriod) {
      res.status(403).json({
        status: 'error',
        message: `Only the current review period (R${currentPeriod}) can be edited. You attempted to submit for R${reviewPeriod}.`,
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

    // Validate total weights = 100%
    if (scores.functionalKRAs && Array.isArray(scores.functionalKRAs)) {
      const totalWeight = scores.functionalKRAs.reduce((sum: number, kra: any) => {
        const weight = reviewPeriod === 'pilot' 
          ? (kra.pilotWeight || 0)
          : (kra[`r${reviewPeriod}Weight`] || kra.weight || 0);
        return sum + weight;
      }, 0);

      if (Math.abs(totalWeight - 100) > 0.01) { // Allow small floating point differences
        res.status(400).json({
          status: 'error',
          message: `Total KRA weights must equal 100%. Current total: ${totalWeight.toFixed(2)}%`,
        });
        return;
      }
    }

    // Update functional KRAs (D1 - Only Dimension with KRAs)
    if (scores.functionalKRAs && Array.isArray(scores.functionalKRAs)) {
      const funcKRAs = member.functionalKRAs ?? [];
      scores.functionalKRAs.forEach((kraScore: any, index: number) => {
        if (!funcKRAs[index]) {
          // Create new KRA if doesn't exist
          if (!kraScore.kra || !kraScore.kra.trim()) {
            return; // Skip creating KRA without required field
          }
          funcKRAs.push({
            kra: kraScore.kra.trim(),
            kpis: (kraScore.kpis && Array.isArray(kraScore.kpis)) 
              ? kraScore.kpis.map((kpi: any) => ({
                  kpi: kpi.kpi || kpi,
                  target: kpi.target || '',
                }))
              : [],
            reportsGenerated: [],
            pilotWeight: 0,
            pilotScore: 0,
          });
        }
        const kra = funcKRAs[index];
        if (!kra) return; // Skip if KRA doesn't exist

        // Update KPIs if provided
        if (kraScore.kpis && Array.isArray(kraScore.kpis)) {
          kra.kpis = kraScore.kpis.map((kpi: any) => ({
            kpi: kpi.kpi || kpi,
            target: kpi.target || '',
          }));
        }

        // Update reports/proofs if provided
        if (kraScore.reportsGenerated && Array.isArray(kraScore.reportsGenerated)) {
          kra.reportsGenerated = kraScore.reportsGenerated.map((proof: any) => ({
            type: proof.type || 'drive_link',
            value: proof.value || proof,
            fileName: proof.fileName,
            uploadedAt: proof.uploadedAt ? new Date(proof.uploadedAt) : new Date(),
          }));
        }

        // Update Pilot Period
        if (kraScore.pilotWeight !== undefined) {
          kra.pilotWeight = Math.max(0, Math.min(100, kraScore.pilotWeight || 0));
        }
        if (kraScore.pilotScore !== undefined) {
          kra.pilotScore = Math.max(0, Math.min(5, kraScore.pilotScore || 0));
        }

        // Update Review Period data
        const periodKey = `r${reviewPeriod}` as 'r1' | 'r2' | 'r3' | 'r4';
        const weightKey = `${periodKey}Weight` as 'r1Weight' | 'r2Weight' | 'r3Weight' | 'r4Weight';
        const scoreKey = `${periodKey}Score` as 'r1Score' | 'r2Score' | 'r3Score' | 'r4Score';
        const perfKey = `${periodKey}ActualPerf` as 'r1ActualPerf' | 'r2ActualPerf' | 'r3ActualPerf' | 'r4ActualPerf';
        const reviewerKey = `${periodKey}ReviewedBy` as 'r1ReviewedBy' | 'r2ReviewedBy' | 'r3ReviewedBy' | 'r4ReviewedBy';

        if (kraScore.weight !== undefined || kraScore[weightKey] !== undefined) {
          const weight = kraScore.weight !== undefined ? kraScore.weight : kraScore[weightKey];
          (kra as any)[weightKey] = Math.max(0, Math.min(100, weight || 0));
        }
        
        if (kraScore.score !== undefined || kraScore[scoreKey] !== undefined) {
          const score = kraScore.score !== undefined ? kraScore.score : kraScore[scoreKey];
          (kra as any)[scoreKey] = Math.max(0, Math.min(5, score || 0));
        }
        
        if (kraScore.actualPerf !== undefined || kraScore[perfKey] !== undefined) {
          (kra as any)[perfKey] = kraScore.actualPerf || kraScore[perfKey] || '';
        }

        // Track reviewer for this period
        (kra as any)[reviewerKey] = reviewer._id;

        // Calculate average score
        const scores = [
          kra.pilotScore,
          kra.r1Score,
          kra.r2Score,
          kra.r3Score,
          kra.r4Score,
        ].filter((s): s is number => s !== undefined && s !== null && s > 0);
        
        kra.averageScore = scores.length > 0
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length
          : 0;
      });
      member.functionalKRAs = funcKRAs;
    }

    // Update organizational KRAs
    if (scores.organizationalKRAs && Array.isArray(scores.organizationalKRAs)) {
      const orgKRAs = member.organizationalKRAs ?? [];
      scores.organizationalKRAs.forEach((kraScore: any, index: number) => {
        if (!orgKRAs[index]) {
          // Only create new KRA if coreValues field is provided and not empty
          const coreValue = kraScore.coreValues || kraScore.coreValue;
          if (!coreValue || !coreValue.trim()) {
            // Skip creating KRA without required field
            return;
          }
          orgKRAs.push({
            coreValues: coreValue.trim(),
          });
        }
        const kra = orgKRAs[index];
        if (!kra) return; // Skip if KRA doesn't exist
        
        // Use reviewPeriod (1-4) to set the correct period fields
        if (reviewPeriod === 1) {
          kra.r1Score = kraScore.score || 0;
          kra.r1CriticalIncident = kraScore.criticalIncident || '';
        } else if (reviewPeriod === 2) {
          kra.r2Score = kraScore.score || 0;
          kra.r2CriticalIncident = kraScore.criticalIncident || '';
        } else if (reviewPeriod === 3) {
          kra.r3Score = kraScore.score || 0;
          kra.r3CriticalIncident = kraScore.criticalIncident || '';
        } else if (reviewPeriod === 4) {
          kra.r4Score = kraScore.score || 0;
          kra.r4CriticalIncident = kraScore.criticalIncident || '';
        }
      });
      member.organizationalKRAs = orgKRAs;
    }

    // Update self development KRAs
    if (scores.selfDevelopmentKRAs && Array.isArray(scores.selfDevelopmentKRAs)) {
      const selfDevKRAs = member.selfDevelopmentKRAs ?? [];
      scores.selfDevelopmentKRAs.forEach((kraScore: any, index: number) => {
        if (!selfDevKRAs[index]) {
          // Only create new KRA if areaOfConcern field is provided and not empty
          if (!kraScore.areaOfConcern || !kraScore.areaOfConcern.trim()) {
            // Skip creating KRA without required field
            return;
          }
          selfDevKRAs.push({
            areaOfConcern: kraScore.areaOfConcern.trim(),
            actionPlanInitiative: kraScore.actionPlanInitiative || '',
          });
        }
        const kra = selfDevKRAs[index];
        if (!kra) return; // Skip if KRA doesn't exist
        
        // Use reviewPeriod (1-4) to set the correct period fields
        if (reviewPeriod === 1) {
          kra.r1Score = kraScore.score || 0;
          kra.r1Reason = kraScore.reason || '';
        } else if (reviewPeriod === 2) {
          kra.r2Score = kraScore.score || 0;
          kra.r2Reason = kraScore.reason || '';
        } else if (reviewPeriod === 3) {
          kra.r3Score = kraScore.score || 0;
          kra.r3Reason = kraScore.reason || '';
        } else if (reviewPeriod === 4) {
          kra.r4Score = kraScore.score || 0;
          kra.r4Reason = kraScore.reason || '';
        }
      });
      member.selfDevelopmentKRAs = selfDevKRAs;
    }

    // Update developing others KRAs
    if (scores.developingOthersKRAs && Array.isArray(scores.developingOthersKRAs)) {
      const devOthersKRAs = member.developingOthersKRAs ?? [];
      scores.developingOthersKRAs.forEach((kraScore: any, index: number) => {
        if (!devOthersKRAs[index]) {
          // Only create new KRA if person field is provided and not empty
          if (!kraScore.person || !kraScore.person.trim()) {
            // Skip creating KRA without required field
            return;
          }
          devOthersKRAs.push({
            person: kraScore.person.trim(),
            areaOfDevelopment: kraScore.areaOfDevelopment || '',
          });
        }
        const kra = devOthersKRAs[index];
        if (!kra) return; // Skip if KRA doesn't exist
        
        // Use reviewPeriod (1-4) to set the correct period fields
        if (reviewPeriod === 1) {
          kra.r1Score = kraScore.score || 0;
          kra.r1Reason = kraScore.reason || '';
        } else if (reviewPeriod === 2) {
          kra.r2Score = kraScore.score || 0;
          kra.r2Reason = kraScore.reason || '';
        } else if (reviewPeriod === 3) {
          kra.r3Score = kraScore.score || 0;
          kra.r3Reason = kraScore.reason || '';
        } else if (reviewPeriod === 4) {
          kra.r4Score = kraScore.score || 0;
          kra.r4Reason = kraScore.reason || '';
        }
      });
      member.developingOthersKRAs = devOthersKRAs;
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

    // Validate review period
    if (!reviewPeriod || ![1, 2, 3, 4].includes(reviewPeriod)) {
      res.status(400).json({
        status: 'error',
        message: 'Valid review period (1-4) is required',
      });
      return;
    }

    // Check if already locked
    const existingLock = await ReviewLock.findOne({
      employeeId: employee._id,
      reviewPeriod,
    });

    if (existingLock) {
      res.status(400).json({
        status: 'error',
        message: `Review period R${reviewPeriod} is already locked for this employee`,
        data: {
          lockedAt: existingLock.lockedAt,
          lockedBy: existingLock.lockedBy,
        },
      });
      return;
    }

    // Lock all KRA scores for this period in the team member details
    const member = team.membersDetails[memberIndex];
    
    // Lock functional KRAs
    if (member.functionalKRAs) {
      member.functionalKRAs.forEach((kra) => {
        kra.isScoreLocked = true;
        kra.scoreLockedAt = new Date();
        kra.scoreLockedBy = new mongoose.Types.ObjectId(reviewerId);
      });
    }
    
    // Lock organizational KRAs
    if (member.organizationalKRAs) {
      member.organizationalKRAs.forEach((kra) => {
        kra.isScoreLocked = true;
        kra.scoreLockedAt = new Date();
        kra.scoreLockedBy = new mongoose.Types.ObjectId(reviewerId);
      });
    }
    
    // Lock self development KRAs
    if (member.selfDevelopmentKRAs) {
      member.selfDevelopmentKRAs.forEach((kra) => {
        kra.isScoreLocked = true;
        kra.scoreLockedAt = new Date();
        kra.scoreLockedBy = new mongoose.Types.ObjectId(reviewerId);
      });
    }
    
    // Lock developing others KRAs
    if (member.developingOthersKRAs) {
      member.developingOthersKRAs.forEach((kra) => {
        kra.isScoreLocked = true;
        kra.scoreLockedAt = new Date();
        kra.scoreLockedBy = new mongoose.Types.ObjectId(reviewerId);
      });
    }

    // Save the team with locked KRAs
    await team.save();

    // Create the review lock record
    const reviewLock = new ReviewLock({
      employeeId: employee._id,
      organizationId: employee.organizationId,
      teamId: team._id,
      reviewPeriod,
      lockedBy: reviewer._id,
      lockedAt: new Date(),
      functionalLocked: true,
      organizationalLocked: true,
      selfDevelopmentLocked: true,
      developingOthersLocked: true,
    });

    await reviewLock.save();

    res.status(200).json({
      status: 'success',
      message: 'Review locked successfully',
      data: {
        _id: reviewLock._id,
        employeeId: employee._id,
        reviewPeriod,
        lockedAt: reviewLock.lockedAt,
        lockedBy: reviewerId,
      },
    });
  } catch (error) {
    next(error);
  }
}

