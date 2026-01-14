import { Request, Response, NextFunction } from 'express';
import { Team, IFunctionalKRA } from '../models/Team';
import { User } from '../models/User';
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

// Updated KRA Schema with new structure
const kraSchema = z.object({
  kra: z.string().min(1),
  kpis: z.array(kpiSchema).min(1, 'At least one KPI is required'),
  reportsGenerated: z.array(proofSchema).optional(),
  pilotWeight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
  pilotScore: z.number().min(0).max(5).optional(),
  pilotActualPerf: z.string().optional(),
  r1Weight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
  r1Score: z.number().min(0).max(5).optional(),
  r1ActualPerf: z.string().optional(),
  r1ReviewedBy: z.string().optional(),
  r2Weight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
  r2Score: z.number().min(0).max(5).optional(),
  r2ActualPerf: z.string().optional(),
  r2ReviewedBy: z.string().optional(),
  r3Weight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
  r3Score: z.number().min(0).max(5).optional(),
  r3ActualPerf: z.string().optional(),
  r3ReviewedBy: z.string().optional(),
  r4Weight: z.number().int().min(10).max(100).refine((val) => val % 10 === 0, {
    message: 'Weight must be a multiple of 10 (10, 20, 30, ..., 100)',
  }).optional(),
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
    const existingKRA = member.functionalKRAs[kraIndex];
    if (!existingKRA.kra) {
      res.status(400).json({
        status: 'error',
        message: 'Existing KRA is missing required field: kra',
      });
      return;
    }

    // Update KRA - preserve required fields if not provided in update
    const updatedKRA = {
      ...existingKRA,
      ...validatedKRA,
      // Ensure kra field is always present (use existing if not provided in update)
      kra: validatedKRA.kra || existingKRA.kra,
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
 * Delete KRA from team member
 * DELETE /api/team/members/:memberIndex/kras/:kraIndex
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

