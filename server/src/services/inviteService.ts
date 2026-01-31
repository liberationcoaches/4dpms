import crypto from 'crypto';
import { Invite, IInvite } from '../models/Invite';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Team } from '../models/Team';
import { generateTeamCode } from '../utils/codeGenerator';
import { CreateInviteInput, SignupWithInviteInput } from '../utils/validation';
import { IUser } from '../models/User';
import { sendNewMemberNotificationToCSA, sendNewMemberNotificationToSupervisor } from '../controllers/notificationController';

const INVITE_EXPIRY_DAYS = 7;
const SHORT_CODE_LENGTH = 6;

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create an invite. CSA/Boss creates for manager or employee in their org.
 */
export async function createInvite(
  createdByUserId: string,
  data: CreateInviteInput
): Promise<{ invite: IInvite; link: string; code: string }> {
  const creator = await User.findById(createdByUserId);
  if (!creator) throw new Error('User not found');

  const org = await Organization.findById(data.organizationId);
  if (!org) throw new Error('Organization not found');

  // CSA: must belong to this org. Boss: must be org boss. Manager: must be in org.
  const canCreate =
    creator.role === 'client_admin' && creator.organizationId?.toString() === data.organizationId ||
    creator.role === 'boss' && creator.organizationId?.toString() === data.organizationId && org.bossId?.toString() === createdByUserId ||
    creator.role === 'manager' && creator.organizationId?.toString() === data.organizationId;

  if (!canCreate) throw new Error('Not allowed to create invite for this organization');

  if (data.role === 'employee' && data.teamId) {
    const team = await Team.findById(data.teamId);
    if (!team || team.createdBy?.toString() === undefined) throw new Error('Team not found');
    const manager = await User.findById(team.createdBy);
    if (!manager || manager.organizationId?.toString() !== data.organizationId)
      throw new Error('Team does not belong to this organization');
  }

  let shortCode = generateShortCode();
  let exists = await Invite.findOne({ shortCode });
  let attempts = 0;
  while (exists && attempts < 20) {
    shortCode = generateShortCode();
    exists = await Invite.findOne({ shortCode });
    attempts++;
  }
  if (exists) throw new Error('Could not generate unique invite code');

  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invite = new Invite({
    token,
    shortCode,
    role: data.role,
    organizationId: data.organizationId,
    teamId: data.role === 'employee' ? data.teamId : undefined,
    createdBy: createdByUserId,
    expiresAt,
  });
  await invite.save();

  const link = `/auth/join/${token}`;
  return { invite, link, code: shortCode };
}

/**
 * Resolve invite by token or short code. Public. Returns role and display info.
 */
export async function resolveInvite(tokenOrCode: string): Promise<{
  valid: boolean;
  role?: string;
  organizationName?: string;
  teamName?: string;
  managerName?: string;
  token?: string;
  message?: string;
}> {
  const trimmed = tokenOrCode.trim();
  const isToken = trimmed.length > 10;
  const invite = await Invite.findOne(
    isToken ? { token: trimmed } : { shortCode: trimmed.toUpperCase() }
  ).populate('organizationId', 'name').populate('teamId', 'name createdBy');

  if (!invite) {
    return { valid: false, message: 'Invite not found' };
  }
  if (invite.usedAt) {
    return { valid: false, message: 'Invite already used' };
  }
  if (new Date() > invite.expiresAt) {
    return { valid: false, message: 'Invite expired' };
  }

  const org = invite.organizationId as any;
  let teamName: string | undefined;
  let managerName: string | undefined;
  if (invite.teamId) {
    const team = invite.teamId as any;
    teamName = team?.name;
    if (team?.createdBy) {
      const manager = await User.findById(team.createdBy).select('name');
      managerName = manager?.name;
    }
  }

  return {
    valid: true,
    role: invite.role,
    organizationName: org?.name,
    teamName,
    managerName,
    token: invite.token,
  };
}

/**
 * Create user from invite (sign up with invite). No role selection – role from invite.
 */
export async function createUserFromInvite(
  data: SignupWithInviteInput
): Promise<{ user: IUser; teamCode?: string }> {
  const tokenOrCode = data.inviteToken || data.inviteCode;
  if (!tokenOrCode) throw new Error('Invite link or code is required');

  const invite = await Invite.findOne(
    tokenOrCode.length > 10 ? { token: tokenOrCode.trim() } : { shortCode: tokenOrCode.trim().toUpperCase() }
  );
  if (!invite) throw new Error('Invite not found');
  if (invite.usedAt) throw new Error('Invite already used');
  if (new Date() > invite.expiresAt) throw new Error('Invite expired');

  const existing = await User.findOne({ $or: [{ email: data.email }, { mobile: data.mobile.replace(/\D/g, '') }] });
  if (existing) throw new Error('User with this email or mobile already exists');

  const org = await Organization.findById(invite.organizationId);
  if (!org) throw new Error('Organization not found');

  const mobile = data.mobile.replace(/\D/g, '');
  let user: IUser;
  let teamCode: string | undefined;

  if (invite.role === 'manager') {
    const teamCodeGenerated = await generateTeamCode();
    const team = new Team({
      name: `${data.name}'s Team`,
      code: teamCodeGenerated,
      createdBy: null as any,
      members: [],
      membersDetails: [],
    });
    user = new User({
      name: data.name,
      email: data.email,
      mobile,
      companyName: org.name,
      industry: org.type || 'Other',
      isMobileVerified: false,
      role: 'manager',
      hierarchyLevel: 2,
      organizationId: org._id,
      bossId: org.bossId,
      teamId: null as any,
    });
    await user.save();
    team.createdBy = user._id;
    team.members = [user._id];
    await team.save();
    (user as any).teamId = team._id;
    await user.save();
    org.managers.push(user._id);
    await org.save();
    teamCode = teamCodeGenerated;
  } else if (invite.role === 'employee') {
    if (!invite.teamId) throw new Error('Team is required for Member invite');
    const team = await Team.findById(invite.teamId);
    if (!team) throw new Error('Team not found');
    const manager = await User.findById(team.createdBy);
    if (!manager || !manager.organizationId) throw new Error('Team manager or organization not found');

    user = new User({
      name: data.name,
      email: data.email,
      mobile,
      companyName: org.name,
      industry: org.type || 'Other',
      isMobileVerified: false,
      role: 'employee',
      hierarchyLevel: 3,
      organizationId: org._id,
      bossId: org.bossId,
      managerId: manager._id,
      teamId: team._id,
    });
    await user.save();
    team.members.push(user._id);
    await team.save();
    await sendNewMemberNotificationToCSA(invite.organizationId, data.name.trim(), 'employee');
    if (team.createdBy) {
      await sendNewMemberNotificationToSupervisor(team.createdBy, data.name.trim());
    }
  } else {
    throw new Error('Invalid invite role');
  }

  invite.usedAt = new Date();
  invite.usedBy = user._id;
  await invite.save();

  return { user, teamCode };
}
