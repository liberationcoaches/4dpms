import { Request, Response, NextFunction } from 'express';
import { Team, IFunctionalKRA } from '../models/Team';
import { User } from '../models/User';
import { z } from 'zod';
import { updateFunctionalKRAAverageScore, validateFunctionalKRA } from '../utils/kraCalculations';

const kraSchema = z.object({
  kra: z.string().min(1),
  kpiTarget: z.string().optional(),
  reportsGenerated: z.string().optional(),
  pilotWeight: z.number().optional(),
  pilotActualPerf: z.string().optional(),
  r1Weight: z.number().optional(),
  r1Score: z.number().optional(),
  r2Weight: z.number().optional(),
  r2Score: z.number().optional(),
  r3Weight: z.number().optional(),
  r3Score: z.number().optional(),
  r4Weight: z.number().optional(),
  r4Score: z.number().optional(),
  r1ActualPerf: z.string().optional(),
  r2ActualPerf: z.string().optional(),
  r3ActualPerf: z.string().optional(),
  r4ActualPerf: z.string().optional(),
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

    const validatedKRA = kraSchema.parse(req.body);
    const validation = validateFunctionalKRA(validatedKRA);

    if (!validation.valid) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid KRA data',
        errors: validation.errors,
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

