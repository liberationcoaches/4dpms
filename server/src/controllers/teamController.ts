import { Request, Response, NextFunction } from 'express';
import { Team } from '../models/Team';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { z } from 'zod';
import { generateAndSaveOTP } from '../services/authService';

const addMemberSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  mobile: z.string().regex(/^[0-9]{10}$/),
});

const joinTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  mobile: z.string().regex(/^[0-9]{10}$/),
  teamCode: z.string().min(4).max(8).trim().toUpperCase(),
  email: z.string().email().optional(),
});

const dimensionWeightsSchema = z.object({
  functional: z.number().int().min(0).max(100),
  organizational: z.number().int().min(0).max(100),
  selfDevelopment: z.number().int().min(0).max(100),
  developingOthers: z.number().int().min(0).max(100),
});

/**
 * Get team code
 * GET /api/team/code
 */
export async function getTeamCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Find team by user's teamId
    let team;
    if (user.teamId) {
      team = await Team.findById(user.teamId);
    } else {
      // Try to find team where user is a member
      team = await Team.findOne({ members: userId });
    }

    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'No team found for this user',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        teamCode: team.code,
        teamName: team.name,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get team members
 * GET /api/team/members
 */
export async function getTeamMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // TODO: Get userId from auth token/session
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Find team by user's teamId or find teams where user is a member
    let team;
    if (user.teamId) {
      team = await Team.findById(user.teamId);
    } else {
      team = await Team.findOne({ members: userId });
    }

    if (!team) {
      res.status(200).json({
        status: 'success',
        data: [],
      });
      return;
    }

    // Format team members data
    const members =
      team.membersDetails && team.membersDetails.length > 0
        ? team.membersDetails.map((m: any, idx: number) => ({
            _id: `${team._id}-${idx}`,
            name: m.name,
            mobile: m.mobile,
            role: m.role,
            functionalKRAs: m.functionalKRAs || [],
            organizationalKRAs: m.organizationalKRAs || [],
            selfDevelopmentKRAs: m.selfDevelopmentKRAs || [],
            developingOthersKRAs: m.developingOthersKRAs || [],
          }))
        : [];

    res.status(200).json({
      status: 'success',
      data: members,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add team member (basic info)
 * POST /api/team/members
 */
export async function addTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const validated = addMemberSchema.parse(req.body);

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Check if user is manager
    if (user.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can add team members',
      });
      return;
    }

    // Find or create team
    let team;
    if (user.teamId) {
      team = await Team.findById(user.teamId);
    } else {
      // Create a new team with generated code
      const code = `TEAM${Math.random().toString().slice(2, 6).toUpperCase()}`;
      team = new Team({
        name: `${user.name}'s Team`,
        code,
        createdBy: user._id,
        members: [user._id],
        membersDetails: [],
      });
      await team.save();
      user.teamId = team._id;
      await user.save();
    }

    if (!team) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to load team',
      });
      return;
    }

    team.membersDetails = team.membersDetails || [];
    team.membersDetails.push({
      name: validated.name,
      role: validated.role,
      mobile: validated.mobile,
    });

    await team.save();

    // Return the added member in the format expected by frontend
    const addedMemberIndex = team.membersDetails.length - 1;
    const addedMember = team.membersDetails[addedMemberIndex];

    res.status(201).json({
      status: 'success',
      message: 'Team member added successfully',
      data: {
        _id: `${team._id}-${addedMemberIndex}`,
        name: addedMember.name,
        role: addedMember.role,
        mobile: addedMember.mobile,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Join team by code
 * POST /api/auth/team-code
 */
export async function joinTeamByCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = joinTeamSchema.parse(req.body);

    // Find team by code
    const team = await Team.findOne({ code: validated.teamCode });

    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'Invalid team code',
      });
      return;
    }

    // Check if team member with this mobile already exists in team.membersDetails
    const existingMember = team.membersDetails?.find(
      (member) => member.mobile === validated.mobile
    );

    if (existingMember) {
      // Member already exists in team
      // Check if user account exists
      let user = await User.findOne({ mobile: validated.mobile });
      
      if (!user) {
        // Create user account for existing member
        user = new User({
          name: existingMember.name,
          email: validated.email || `${validated.mobile}@team.com`,
          mobile: validated.mobile,
          companyName: 'Team Member',
          industry: 'Other',
          isMobileVerified: false,
          role: 'employee', // Team member has employee role
        });
        user.teamId = team._id;
        await user.save();

        if (!team.members.includes(user._id)) {
          team.members.push(user._id);
          await team.save();
        }
      } else {
        // User exists, ensure they're in the team
        if (!user.teamId || user.teamId.toString() !== team._id.toString()) {
          user.teamId = team._id;
          await user.save();
        }
        if (!team.members.includes(user._id)) {
          team.members.push(user._id);
          await team.save();
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Welcome back!',
        data: {
          memberExists: true,
          memberName: existingMember.name,
          userId: user._id.toString(),
        },
      });
      return;
    }

    // Member doesn't exist in team - need to add them
    if (!validated.name) {
      res.status(400).json({
        status: 'error',
        message: 'Name is required',
      });
      return;
    }

    // If email is not provided, request it
    if (!validated.email) {
      res.status(200).json({
        status: 'success',
        message: 'Email required to complete sign up',
        data: {
          needsEmail: true,
          teamCode: validated.teamCode,
        },
      });
      return;
    }

    // Check if user with this mobile already exists
    let user = await User.findOne({ mobile: validated.mobile });

    if (user) {
      // User exists, update their info and add to team
      if (user.teamId && user.teamId.toString() !== team._id.toString()) {
        res.status(400).json({
          status: 'error',
          message: 'User is already a member of another team',
        });
        return;
      }
      user.name = validated.name;
      user.email = validated.email;
      user.teamId = team._id;
      // If user was admin but joining via team code, keep them as admin (they might have created their own team)
      // Only set to member if they don't have a role or if they're explicitly joining
      if (!user.role) {
        user.role = 'employee';
      }
      await user.save();
    } else {
      // Create new user
      user = new User({
        name: validated.name,
        email: validated.email,
        mobile: validated.mobile,
        companyName: 'Team Member',
        industry: 'Other',
        isEmailVerified: false,
        isMobileVerified: false,
        role: 'employee', // Team member has employee role
      });
      user.teamId = team._id;
      await user.save();
    }

    // Add member to team.membersDetails
    team.membersDetails = team.membersDetails || [];
    team.membersDetails.push({
      name: validated.name,
      role: 'Team Member',
      mobile: validated.mobile,
    });

    // Add user to team.members if not already there
    if (!team.members.includes(user._id)) {
      team.members.push(user._id);
    }

    await team.save();

    // Generate OTP for mobile
    const otp = await generateAndSaveOTP(validated.mobile, 'mobile');

    res.status(200).json({
      status: 'success',
      message: 'Team member added successfully. OTP sent to mobile.',
      data: {
        userId: user._id.toString(),
        mobile: validated.mobile,
        teamCode: validated.teamCode,
        // Remove in production:
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update team member (basic info)
 * PUT /api/team/members/:memberIndex
 */
export async function updateTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    const validated = addMemberSchema.partial().parse(req.body);

    const user = await User.findById(userId);
    if (!user || !user.teamId) {
      res.status(404).json({
        status: 'error',
        message: 'User or team not found',
      });
      return;
    }

    // Check if user is manager
    if (user.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can update team members',
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

    // Update member details
    if (validated.name) team.membersDetails[memberIndex].name = validated.name;
    if (validated.role) team.membersDetails[memberIndex].role = validated.role;
    if (validated.mobile) team.membersDetails[memberIndex].mobile = validated.mobile;

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Team member updated successfully',
      data: {
        _id: `${team._id}-${memberIndex}`,
        name: team.membersDetails[memberIndex].name,
        role: team.membersDetails[memberIndex].role,
        mobile: team.membersDetails[memberIndex].mobile,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete team member
 * DELETE /api/team/members/:memberIndex
 */
export async function deleteTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    const user = await User.findById(userId);
    if (!user || !user.teamId) {
      res.status(404).json({
        status: 'error',
        message: 'User or team not found',
      });
      return;
    }

    // Check if user is manager
    if (user.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can delete team members',
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

    // Remove member from array
    team.membersDetails.splice(memberIndex, 1);
    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Team member deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get dimension weights
 * GET /api/team/dimension-weights
 */
export async function getDimensionWeights(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Find team by user's teamId
    let team;
    if (user.teamId) {
      team = await Team.findById(user.teamId);
    } else {
      team = await Team.findOne({ members: userId });
    }

    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'No team found for this user',
      });
      return;
    }

    // Return dimension weights, fallback to organization weights, then default values
    let weights = team.dimensionWeights;
    
    // If team doesn't have weights, try to get from organization
    if (!weights && user.organizationId) {
      const organization = await Organization.findById(user.organizationId);
      if (organization && organization.dimensionWeights) {
        weights = organization.dimensionWeights;
        // Also update the team with organization weights for future use
        team.dimensionWeights = organization.dimensionWeights;
        await team.save();
      }
    }
    
    // Final fallback to default values
    if (!weights) {
      weights = {
        functional: 0,
        organizational: 0,
        selfDevelopment: 0,
        developingOthers: 0,
      };
    }

    res.status(200).json({
      status: 'success',
      data: weights,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update dimension weights
 * PUT /api/team/dimension-weights
 */
export async function updateDimensionWeights(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const validated = dimensionWeightsSchema.parse(req.body);

    // Validate that weights sum to 100%
    const total = validated.functional + validated.organizational + validated.selfDevelopment + validated.developingOthers;
    if (total !== 100) {
      res.status(400).json({
        status: 'error',
        message: `Dimension weights must sum to 100%. Current sum: ${total}%`,
      });
      return;
    }

    // Validate that first 3 dimensions are mandatory (must be > 0)
    if (validated.functional <= 0 || validated.organizational <= 0 || validated.selfDevelopment <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Functional, Organizational, and Self Development dimensions must have weights greater than 0%',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Check if user is client admin
    if (user.role !== 'client_admin') {
      res.status(403).json({
        status: 'error',
        message: 'Only Client Side Admins can update dimension weights',
      });
      return;
    }

    // Find team by user's teamId
    let team;
    if (user.teamId) {
      team = await Team.findById(user.teamId);
    } else {
      team = await Team.findOne({ members: userId });
    }

    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'No team found for this user',
      });
      return;
    }

    // Update dimension weights
    team.dimensionWeights = {
      functional: validated.functional,
      organizational: validated.organizational,
      selfDevelopment: validated.selfDevelopment,
      developingOthers: validated.developingOthers,
    };

    await team.save();

    res.status(200).json({
      status: 'success',
      message: 'Dimension weights updated successfully',
      data: team.dimensionWeights,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid dimension weights',
        errors: error.errors,
      });
      return;
    }
    next(error);
  }
}
