import { Request, Response, NextFunction } from 'express';
import { Team } from '../models/Team';
import { User } from '../models/User';
import { z } from 'zod';
import {
  calculateOrganizationalAverage,
  calculateSelfDevelopmentAverage,
  calculateDevelopingOthersAverage,
} from '../utils/dimensionCalculations';

// Organizational Dimension schemas
const organizationalSchema = z.object({
  coreValue: z.string().min(1),
  pilotScore: z.number().optional(),
  pilotCriticalIncident: z.string().optional(),
  r1Score: z.number().optional(),
  r1CriticalIncident: z.string().optional(),
  r2Score: z.number().optional(),
  r2CriticalIncident: z.string().optional(),
  r3Score: z.number().optional(),
  r3CriticalIncident: z.string().optional(),
  r4Score: z.number().optional(),
  r4CriticalIncident: z.string().optional(),
});

// Self Development schemas
const selfDevelopmentSchema = z.object({
  areaOfConcern: z.string().min(1),
  actionPlanInitiative: z.string().optional(),
  pilotScore: z.number().optional(),
  pilotReason: z.string().optional(),
  r1Score: z.number().optional(),
  r1Reason: z.string().optional(),
  r2Score: z.number().optional(),
  r2Reason: z.string().optional(),
  r3Score: z.number().optional(),
  r3Reason: z.string().optional(),
  r4Score: z.number().optional(),
  r4Reason: z.string().optional(),
});

// Developing Others schemas
const developingOthersSchema = z.object({
  person: z.string().min(1),
  areaOfDevelopment: z.string().optional(),
  pilotScore: z.number().optional(),
  pilotReason: z.string().optional(),
  r1Score: z.number().optional(),
  r1Reason: z.string().optional(),
  r2Score: z.number().optional(),
  r2Reason: z.string().optional(),
  r3Score: z.number().optional(),
  r3Reason: z.string().optional(),
  r4Score: z.number().optional(),
  r4Reason: z.string().optional(),
});

/**
 * Add Organizational Dimension
 * POST /api/team/members/:memberIndex/organizational
 */
export async function addOrganizational(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const validated = organizationalSchema.parse(req.body);
    const average = calculateOrganizationalAverage(validated);
    const dimension = { ...validated, averageScore: average ?? undefined };

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

    if (!team.membersDetails[memberIndex].organizationalKRAs) {
      team.membersDetails[memberIndex].organizationalKRAs = [];
    }
    team.membersDetails[memberIndex].organizationalKRAs!.push(dimension as any);

    await team.save();

    res.status(201).json({
      status: 'success',
      message: 'Organizational dimension added successfully',
      data: dimension,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Organizational Dimension
 * PUT /api/team/members/:memberIndex/organizational/:dimensionIndex
 */
export async function updateOrganizational(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const memberIndex = parseInt(req.params.memberIndex);
    const dimensionIndex = parseInt(req.params.dimensionIndex);

    if (!userId || isNaN(memberIndex) || isNaN(dimensionIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID, member index, and dimension index are required',
      });
      return;
    }

    const validated = organizationalSchema.partial().parse(req.body);
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
    if (!member.organizationalKRAs || dimensionIndex >= member.organizationalKRAs.length) {
      res.status(404).json({
        status: 'error',
        message: 'Organizational dimension not found',
      });
      return;
    }

    const updated = { ...member.organizationalKRAs[dimensionIndex], ...validated };
    const average = calculateOrganizationalAverage(updated);
    member.organizationalKRAs[dimensionIndex] = { ...updated, averageScore: average ?? undefined } as any;

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Organizational dimension updated successfully',
      data: member.organizationalKRAs[dimensionIndex],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add Self Development
 * POST /api/team/members/:memberIndex/self-development
 */
export async function addSelfDevelopment(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const validated = selfDevelopmentSchema.parse(req.body);
    const average = calculateSelfDevelopmentAverage(validated);
    const development = { ...validated, averageScore: average ?? undefined };

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

    if (!team.membersDetails[memberIndex].selfDevelopmentKRAs) {
      team.membersDetails[memberIndex].selfDevelopmentKRAs = [];
    }
    team.membersDetails[memberIndex].selfDevelopmentKRAs!.push(development as any);

    await team.save();

    res.status(201).json({
      status: 'success',
      message: 'Self development added successfully',
      data: development,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Self Development
 * PUT /api/team/members/:memberIndex/self-development/:developmentIndex
 */
export async function updateSelfDevelopment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const memberIndex = parseInt(req.params.memberIndex);
    const developmentIndex = parseInt(req.params.developmentIndex);

    if (!userId || isNaN(memberIndex) || isNaN(developmentIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID, member index, and development index are required',
      });
      return;
    }

    const validated = selfDevelopmentSchema.partial().parse(req.body);
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
    if (!member.selfDevelopmentKRAs || developmentIndex >= member.selfDevelopmentKRAs.length) {
      res.status(404).json({
        status: 'error',
        message: 'Self development not found',
      });
      return;
    }

    const updated = { ...member.selfDevelopmentKRAs[developmentIndex], ...validated };
    const average = calculateSelfDevelopmentAverage(updated);
    member.selfDevelopmentKRAs[developmentIndex] = { ...updated, averageScore: average ?? undefined } as any;

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Self development updated successfully',
      data: member.selfDevelopmentKRAs[developmentIndex],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add Developing Others
 * POST /api/team/members/:memberIndex/developing-others
 */
export async function addDevelopingOthers(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const validated = developingOthersSchema.parse(req.body);
    const average = calculateDevelopingOthersAverage(validated);
    const developing = { ...validated, averageScore: average ?? undefined };

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

    if (!team.membersDetails[memberIndex].developingOthersKRAs) {
      team.membersDetails[memberIndex].developingOthersKRAs = [];
    }
    team.membersDetails[memberIndex].developingOthersKRAs!.push(developing as any);

    await team.save();

    res.status(201).json({
      status: 'success',
      message: 'Developing others added successfully',
      data: developing,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Developing Others
 * PUT /api/team/members/:memberIndex/developing-others/:developingIndex
 */
export async function updateDevelopingOthers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const memberIndex = parseInt(req.params.memberIndex);
    const developingIndex = parseInt(req.params.developingIndex);

    if (!userId || isNaN(memberIndex) || isNaN(developingIndex)) {
      res.status(400).json({
        status: 'error',
        message: 'User ID, member index, and developing index are required',
      });
      return;
    }

    const validated = developingOthersSchema.partial().parse(req.body);
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
    if (!member.developingOthersKRAs || developingIndex >= member.developingOthersKRAs.length) {
      res.status(404).json({
        status: 'error',
        message: 'Developing others not found',
      });
      return;
    }

    const updated = { ...member.developingOthersKRAs[developingIndex], ...validated };
    const average = calculateDevelopingOthersAverage(updated);
    member.developingOthersKRAs[developingIndex] = { ...updated, averageScore: average ?? undefined } as any;

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Developing others updated successfully',
      data: member.developingOthersKRAs[developingIndex],
    });
  } catch (error) {
    next(error);
  }
}


