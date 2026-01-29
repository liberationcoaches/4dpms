import { Request, Response, NextFunction } from 'express';
import { Team, IFunctionalKRA } from '../models/Team';
import { User } from '../models/User';
import { ReviewCycle } from '../models/ReviewCycle';
import { z } from 'zod';
import { updateFunctionalKRAAverageScore, validateFunctionalKRA } from '../utils/kraCalculations';

// KPI Schema
const kpiSchema = z.object({
  kpi: z.string().min(1),
  target: z.string().optional(),
});

// Proof/Report Schema
const proofSchema = z.object({
  type: z.enum(['drive_link', 'file_upload']),
  value: z.string().min(1),
  fileName: z.string().optional(),
  uploadedAt: z.string().optional(),
});

// Updated KRA Schema with new structure (kpis optional for backward compatibility)
const kraSchema = z.object({
  kra: z.string().min(1),
  kpis: z.array(kpiSchema).optional(), // Made optional - will be populated from kpiTarget if not provided
  reportsGenerated: z.array(proofSchema).optional(),
  pilotWeight: z.number().min(0).max(100).optional(), // Relaxed validation
  pilotScore: z.number().min(0).max(5).optional(),
  pilotActualPerf: z.string().optional(),
  r1Weight: z.number().min(0).max(100).optional(),
  r1Score: z.number().min(0).max(5).optional(),
  r1ActualPerf: z.string().optional(),
  r1ReviewedBy: z.string().optional(),
  r2Weight: z.number().min(0).max(100).optional(),
  r2Score: z.number().min(0).max(5).optional(),
  r2ActualPerf: z.string().optional(),
  r2ReviewedBy: z.string().optional(),
  r3Weight: z.number().min(0).max(100).optional(),
  r3Score: z.number().min(0).max(5).optional(),
  r3ActualPerf: z.string().optional(),
  r3ReviewedBy: z.string().optional(),
  r4Weight: z.number().min(0).max(100).optional(),
  r4Score: z.number().min(0).max(5).optional(),
  r4ActualPerf: z.string().optional(),
  r4ReviewedBy: z.string().optional(),
  // Legacy fields for backward compatibility
  kpiTarget: z.string().optional(),
});

/**
 * Add KRA to team member
 * POST /api/team/members/:memberIndex/kras
 */
export async function addKRA(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const memberIndex = parseInt(req.params.memberIndex);

    if (!userId || isNaN(memberIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID and member index are required',
      });
      return;
    }

    // Parse and validate KRA data
    let validatedKRA: any;
    try {
      validatedKRA = kraSchema.parse(req.body);
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid KRA data',
        errors: error.errors || error.message,
      });
      return;
    }

    // Handle backward compatibility: convert old structure to new
    if (!validatedKRA.kpis || !Array.isArray(validatedKRA.kpis)) {
      // Convert old kpiTarget to new kpis array
      validatedKRA.kpis = validatedKRA.kpiTarget
        ? [{ kpi: validatedKRA.kpiTarget, target: '' }]
        : [{ kpi: '', target: '' }];
    }

    // Handle backward compatibility: convert old reportsGenerated string to array
    if (!validatedKRA.reportsGenerated || !Array.isArray(validatedKRA.reportsGenerated)) {
      if (typeof validatedKRA.reportsGenerated === 'string' && validatedKRA.reportsGenerated.trim()) {
        validatedKRA.reportsGenerated = [{
          type: 'drive_link',
          value: validatedKRA.reportsGenerated,
          uploadedAt: new Date().toISOString(),
        }];
      } else {
        validatedKRA.reportsGenerated = [];
      }
    }

    const user = await User.findById(userId);
    if (!user || !user.teamId) {
      res.status(404).json({
        status: 'error',
        message: 'User or team not found',
      });
      return;
    }

    const team = await Team.findById(user.teamId);
    if (!team || !team.membersDetails || memberIndex >= team.membersDetails.length) {
      res.status(404).json({
        status: 'error',
        message: 'Team or member not found',
      });
      return;
    }

    // Ensure pilotScore is set (default to 0 if not provided)
    if (validatedKRA.pilotScore === undefined) {
      validatedKRA.pilotScore = 0;
    }

    // Ensure pilotWeight is set and is a multiple of 10 (default to 10 if not provided)
    if (validatedKRA.pilotWeight === undefined) {
      validatedKRA.pilotWeight = 10;
    } else {
      // Round to nearest multiple of 10
      validatedKRA.pilotWeight = Math.round(validatedKRA.pilotWeight / 10) * 10;
      validatedKRA.pilotWeight = Math.max(10, Math.min(100, validatedKRA.pilotWeight));
    }

    // Calculate average score
    const kraWithAverage = updateFunctionalKRAAverageScore(validatedKRA as IFunctionalKRA);

    // Add KRA to member
    if (!team.membersDetails[memberIndex].functionalKRAs) {
      team.membersDetails[memberIndex].functionalKRAs = [];
    }
    team.membersDetails[memberIndex].functionalKRAs!.push(kraWithAverage);

    await team.save();

    res.status(201).json({
      status: 'success',
      message: 'KRA added successfully',
      data: kraWithAverage,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update KRA for team member
 * PUT /api/team/members/:memberIndex/kras/:kraIndex
 * 
 * Rules:
 * - KRA details (kra, kpis) can only be edited ONCE after creation
 * - Scores can be saved multiple times until locked
 * - Once isScoreLocked is true, nothing can be changed
 */
export async function updateKRA(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const memberIndex = parseInt(req.params.memberIndex);
    const kraIndex = parseInt(req.params.kraIndex);

    if (!userId || isNaN(memberIndex) || isNaN(kraIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID, member index, and KRA index are required',
      });
      return;
    }

    const validatedKRA = kraSchema.partial().parse(req.body);
    const user = await User.findById(userId);
    if (!user || !user.teamId) {
      res.status(404).json({
        status: 'error',
        message: 'User or team not found',
      });
      return;
    }

    const team = await Team.findById(user.teamId);
    if (!team || !team.membersDetails || memberIndex >= team.membersDetails.length) {
      res.status(404).json({
        status: 'error',
        message: 'Team or member not found',
      });
      return;
    }

    const member = team.membersDetails[memberIndex];
    if (!member.functionalKRAs || kraIndex >= member.functionalKRAs.length) {
      res.status(404).json({
        status: 'error',
        message: 'KRA not found',
      });
      return;
    }

    // Ensure existing KRA has required fields
    const existingKRA = member.functionalKRAs[kraIndex] as any;
    if (!existingKRA.kra) {
      res.status(400).json({
        status: 'error',
        message: 'Existing KRA is missing required field: kra',
      });
      return;
    }

    // Check if scores are locked - if locked, no changes allowed
    if (existingKRA.isScoreLocked) {
      res.status(403).json({
        status: 'error',
        message: 'This KRA has been finalized and cannot be modified',
      });
      return;
    }

    // Check if trying to edit KRA details (kra, kpis) - only allowed once
    const isEditingKRADetails = validatedKRA.kra || validatedKRA.kpis;
    if (isEditingKRADetails && (existingKRA.editCount || 0) >= 1) {
      res.status(403).json({
        status: 'error',
        message: 'KRA details can only be edited once. This KRA has already been edited.',
      });
      return;
    }

    // Only current review period is editable for scores
    const organizationId = user.organizationId ?? (await User.findById(team.createdBy).select('organizationId').then((b) => b?.organizationId));
    const reviewCycle = organizationId
      ? await ReviewCycle.findOne({ organizationId, isActive: true }).select('currentReviewPeriod').lean()
      : null;
    const currentPeriod = reviewCycle?.currentReviewPeriod ?? 1;
    const allowedPeriodPrefix = `r${currentPeriod}` as 'r1' | 'r2' | 'r3' | 'r4';
    const periodScoreKeys = ['r1Score', 'r2Score', 'r3Score', 'r4Score', 'r1Weight', 'r2Weight', 'r3Weight', 'r4Weight', 'r1ActualPerf', 'r2ActualPerf', 'r3ActualPerf', 'r4ActualPerf', 'r1ReviewedBy', 'r2ReviewedBy', 'r3ReviewedBy', 'r4ReviewedBy'] as const;
    const filteredUpdate: Record<string, unknown> = { ...validatedKRA };
    periodScoreKeys.forEach((key) => {
      if (key in filteredUpdate && !key.startsWith(allowedPeriodPrefix)) {
        delete filteredUpdate[key];
      }
    });
    // Also disallow pilot score/weight if not current period (pilot is not R1-R4)
    if (currentPeriod !== 0) {
      delete filteredUpdate.pilotScore;
      delete filteredUpdate.pilotWeight;
      delete filteredUpdate.pilotActualPerf;
    }

    // Update KRA - preserve required fields if not provided in update (use filtered update for period-based editing)
    const updatedKRA = {
      ...existingKRA,
      ...filteredUpdate,
      // Ensure kra field is always present (use existing if not provided in update)
      kra: validatedKRA.kra || existingKRA.kra,
      // Increment edit count if KRA details were modified
      editCount: isEditingKRADetails ? (existingKRA.editCount || 0) + 1 : (existingKRA.editCount || 0),
    };

    // Recalculate average score
    const kraWithAverage = updateFunctionalKRAAverageScore(updatedKRA as IFunctionalKRA);
    member.functionalKRAs[kraIndex] = kraWithAverage;

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'KRA updated successfully',
      data: kraWithAverage,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lock/Finalize KRA scores - once locked, scores cannot be changed
 * POST /api/team/members/:memberIndex/kras/:kraIndex/lock
 */
export async function lockKRAScores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const memberIndex = parseInt(req.params.memberIndex);
    const kraIndex = parseInt(req.params.kraIndex);

    if (!userId || isNaN(memberIndex) || isNaN(kraIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID, member index, and KRA index are required',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user || !user.teamId) {
      res.status(404).json({
        status: 'error',
        message: 'User or team not found',
      });
      return;
    }

    const team = await Team.findById(user.teamId);
    if (!team || !team.membersDetails || memberIndex >= team.membersDetails.length) {
      res.status(404).json({
        status: 'error',
        message: 'Team or member not found',
      });
      return;
    }

    const member = team.membersDetails[memberIndex];
    if (!member.functionalKRAs || kraIndex >= member.functionalKRAs.length) {
      res.status(404).json({
        status: 'error',
        message: 'KRA not found',
      });
      return;
    }

    const existingKRA = member.functionalKRAs[kraIndex] as any;
    
    // Check if already locked
    if (existingKRA.isScoreLocked) {
      res.status(400).json({
        status: 'error',
        message: 'This KRA is already finalized',
      });
      return;
    }

    // Lock the scores
    existingKRA.isScoreLocked = true;
    existingKRA.scoreLockedAt = new Date();
    existingKRA.scoreLockedBy = userId;

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'KRA scores have been finalized and locked',
      data: existingKRA,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete KRA from team member
 * DELETE /api/team/members/:memberIndex/kras/:kraIndex
 * 
 * Note: Cannot delete locked KRAs
 */
export async function deleteKRA(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const memberIndex = parseInt(req.params.memberIndex);
    const kraIndex = parseInt(req.params.kraIndex);

    if (!userId || isNaN(memberIndex) || isNaN(kraIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID, member index, and KRA index are required',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user || !user.teamId) {
      res.status(404).json({
        status: 'error',
        message: 'User or team not found',
      });
      return;
    }

    const team = await Team.findById(user.teamId);
    if (!team || !team.membersDetails || memberIndex >= team.membersDetails.length) {
      res.status(404).json({
        status: 'error',
        message: 'Team or member not found',
      });
      return;
    }

    const member = team.membersDetails[memberIndex];
    if (!member.functionalKRAs || kraIndex >= member.functionalKRAs.length) {
      res.status(404).json({
        status: 'error',
        message: 'KRA not found',
      });
      return;
    }

    // Check if KRA is locked - cannot delete locked KRAs
    const existingKRA = member.functionalKRAs[kraIndex] as any;
    if (existingKRA.isScoreLocked) {
      res.status(403).json({
        status: 'error',
        message: 'Cannot delete a finalized KRA',
      });
      return;
    }

    member.functionalKRAs.splice(kraIndex, 1);
    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'KRA deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

