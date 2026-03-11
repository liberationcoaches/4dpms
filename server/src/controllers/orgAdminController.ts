import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Invite } from '../models/Invite';
import { sendInviteEmail } from '../utils/emailService';

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

async function ensureUniqueShortCode(): Promise<string> {
  let shortCode = generateShortCode();
  let exists = await Invite.findOne({ shortCode });
  let attempts = 0;
  while (exists && attempts < 20) {
    shortCode = generateShortCode();
    exists = await Invite.findOne({ shortCode });
    attempts++;
  }
  if (exists) throw new Error('Could not generate unique invite code');
  return shortCode;
}

async function ensureUniqueOrgInviteCode(): Promise<string> {
  let code = generateShortCode();
  let exists = await Organization.findOne({ inviteCode: code });
  let attempts = 0;
  while (exists && attempts < 20) {
    code = generateShortCode();
    exists = await Organization.findOne({ inviteCode: code });
    attempts++;
  }
  if (exists) throw new Error('Could not generate unique org invite code');
  return code;
}

function mapRoleToBackend(role: string): 'boss' | 'manager' | 'employee' {
  const r = (role || '').trim().toLowerCase();
  if (r === 'executive' || r === 'boss') return 'boss';
  if (r === 'supervisor' || r === 'manager') return 'manager';
  return 'employee';
}

/**
 * Ensure the caller is org_admin with an organization
 */
async function getOrgAdminContext(userId: string): Promise<{ orgAdmin: mongoose.Document; org: mongoose.Document }> {
  const orgAdmin = await User.findById(userId);
  if (!orgAdmin || orgAdmin.role !== 'org_admin') {
    throw new Error('Only org admins can perform this action');
  }
  if (!orgAdmin.organizationId) {
    throw new Error('Org admin must be associated with an organization');
  }
  const org = await Organization.findById(orgAdmin.organizationId);
  if (!org) {
    throw new Error('Organization not found');
  }
  return { orgAdmin: orgAdmin as mongoose.Document, org: org as mongoose.Document };
}

/**
 * Ensure the caller is org_admin, boss, or manager with an organization (for invite flows)
 */
async function getOrgContextForInvite(userId: string): Promise<{ orgAdmin: mongoose.Document | null; org: mongoose.Document; caller: mongoose.Document }> {
  const caller = await User.findById(userId);
  if (!caller || !caller.organizationId) {
    throw new Error('User must be associated with an organization');
  }
  const allowedRoles = ['org_admin', 'boss', 'manager'];
  if (!allowedRoles.includes(caller.role || '')) {
    throw new Error('Only Org Admin, Executive, or Supervisor can invite members');
  }
  const org = await Organization.findById(caller.organizationId);
  if (!org) {
    throw new Error('Organization not found');
  }
  const orgAdmin = caller.role === 'org_admin' ? caller : await User.findOne({ organizationId: org._id, role: 'org_admin' });
  return { orgAdmin: orgAdmin as mongoose.Document, org: org as mongoose.Document, caller: caller as mongoose.Document };
}

/**
 * GET /api/org-admin/members
 */
export async function getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    const { orgAdmin, org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;
    const orgAdminObj = orgAdmin as any;

    const users = await User.find({
      organizationId: orgId,
      role: { $in: ['boss', 'manager', 'employee'] },
    })
      .populate('reportsTo', 'name')
      .select('name email mobile designation reportsTo role isActive createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const members = users.map((u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      designation: u.designation,
      reportsTo: u.reportsTo,
      role: u.role || 'employee',
      status: u.isActive ? 'active' : 'invited',
    }));

    res.status(200).json({
      status: 'success',
      data: {
        members,
        orgAdmin: { _id: orgAdminObj._id.toString(), name: orgAdminObj.name },
      },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/org-admin/members
 * Create a new member and send invite email
 */
export async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }

    const { name, email, mobile, designation, reportsTo, role } = req.body;
    if (!name?.trim() || !email?.trim()) {
      res.status(400).json({ status: 'error', message: 'Name and email are required' });
      return;
    }

    const mobileTrimmed = typeof mobile === 'string' ? mobile.replace(/\D/g, '').slice(0, 10) : '';
    if (mobileTrimmed.length !== 10) {
      res.status(400).json({ status: 'error', message: 'Valid 10-digit mobile number is required' });
      return;
    }

    const validRoles = ['boss', 'manager', 'employee'];
    const validatedRole = role && validRoles.includes(role) ? role : 'employee';
    const hierarchyLevel = validatedRole === 'boss' ? 1 : validatedRole === 'manager' ? 2 : 3;

    const { orgAdmin, org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;
    const orgAdminId = (orgAdmin as any)._id;

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { mobile: mobileTrimmed },
      ],
    });
    if (existingUser) {
      res.status(400).json({ status: 'error', message: 'User with this email or mobile already exists' });
      return;
    }

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobileTrimmed,
      designation: designation?.trim() || undefined,
      role: validatedRole,
      hierarchyLevel,
      organizationId: orgId,
      reportsTo: reportsTo && mongoose.Types.ObjectId.isValid(reportsTo) ? reportsTo : undefined,
      createdBy: orgAdminId,
      isActive: false,
      isMobileVerified: false,
    });
    await newUser.save();

    // Create Invite record
    const token = generateInviteToken();
    const shortCode = await ensureUniqueShortCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invite = new Invite({
      token,
      shortCode,
      role: validatedRole,
      organizationId: orgId,
      createdBy: orgAdminId,
      expiresAt,
    });
    await invite.save();

    // Build invite link and send email (must NOT fail the request)
    const baseUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const inviteLink = `${baseUrl}/auth/join/${token}`;

    try {
      await sendInviteEmail({
        to: newUser.email,
        recipientName: newUser.name,
        orgName: (org as any).name,
        inviterName: (orgAdmin as any).name,
        inviteLink,
        shortCode,
      });
    } catch (emailErr) {
      console.error('[orgAdminController] Failed to send invite email:', emailErr);
      // Continue - email failure must NOT fail the request
    }

    res.status(201).json({
      status: 'success',
      message: 'Member added successfully',
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        designation: newUser.designation,
        reportsTo: newUser.reportsTo,
        status: 'invited',
      },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/org-admin/members/invite
 * Create member, send invite email, return inviteCode and inviteLink
 */
export async function inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }

    const { name, email, mobile, designation, department, role, reportsTo } = req.body;
    if (!name?.trim() || !email?.trim()) {
      res.status(400).json({ status: 'error', message: 'Name and email are required' });
      return;
    }

    const mobileTrimmed = typeof mobile === 'string' ? mobile.replace(/\D/g, '').slice(0, 10) : '';
    if (mobileTrimmed.length !== 10) {
      res.status(400).json({ status: 'error', message: 'Valid 10-digit mobile number is required' });
      return;
    }

    const { org, caller } = await getOrgContextForInvite(userId);
    const orgId = (org as any)._id;
    const creatorId = (caller as any)._id;

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { mobile: mobileTrimmed },
      ],
    });
    if (existingUser) {
      res.status(400).json({ status: 'error', message: 'User with this email or mobile already exists' });
      return;
    }

    const memberRole = role && ['boss', 'manager', 'employee'].includes(role) ? role : 'employee';
    const hierarchyLevel = memberRole === 'boss' ? 1 : memberRole === 'manager' ? 2 : 3;

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobileTrimmed,
      designation: designation?.trim() || undefined,
      role: memberRole,
      hierarchyLevel,
      organizationId: orgId,
      reportsTo: reportsTo && mongoose.Types.ObjectId.isValid(reportsTo) ? reportsTo : undefined,
      createdBy: creatorId,
      isActive: false,
      isMobileVerified: false,
    });
    await newUser.save();

    const token = generateInviteToken();
    const shortCode = await ensureUniqueShortCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invite = new Invite({
      token,
      shortCode,
      role: memberRole,
      organizationId: orgId,
      invitedUserId: newUser._id,
      createdBy: creatorId,
      expiresAt,
    });
    await invite.save();

    const baseUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const inviteLink = `${baseUrl}/auth/join?invite=${token}`;

    try {
      await sendInviteEmail({
        to: newUser.email,
        recipientName: newUser.name,
        orgName: (org as any).name,
        inviterName: (caller as any).name,
        inviteLink,
        shortCode,
      });
    } catch (emailErr) {
      console.error('[orgAdminController] Failed to send invite email:', emailErr);
    }

    res.status(201).json({
      status: 'success',
      message: 'Member added successfully',
      data: {
        _id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        designation: newUser.designation,
        reportsTo: newUser.reportsTo,
        status: 'invited',
        inviteCode: shortCode,
        inviteLink,
      },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/org-admin/members/bulk-invite
 * Bulk add members from CSV data
 */
export async function bulkInviteMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    const { members } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      res.status(400).json({ status: 'error', message: 'members array is required' });
      return;
    }

    const { orgAdmin, org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;
    const orgAdminId = (orgAdmin as any)._id;
    const baseUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');

    const success: { name: string; email: string; inviteCode: string }[] = [];
    const failed: { row: number; reason: string }[] = [];

    for (let i = 0; i < members.length; i++) {
      const row = i + 1;
      const m = members[i];
      const name = (m?.name || '').trim();
      const email = (m?.email || '').trim().toLowerCase();
      const mobile = typeof m?.mobile === 'string' ? m.mobile.replace(/\D/g, '').slice(0, 10) : '';

      if (!name || !email) {
        failed.push({ row, reason: 'Name and email are required' });
        continue;
      }
      if (mobile.length !== 10) {
        failed.push({ row, reason: 'Valid 10-digit mobile is required' });
        continue;
      }

      const validatedRole = mapRoleToBackend(m?.role || '');
      const reportsTo = m?.reportsTo && mongoose.Types.ObjectId.isValid(m.reportsTo) ? m.reportsTo : undefined;

      const existingUser = await User.findOne({
        $or: [{ email }, { mobile }],
      });
      if (existingUser) {
        failed.push({ row, reason: 'User with this email or mobile already exists' });
        continue;
      }

      try {
        const newUser = new User({
          name,
          email,
          mobile,
          designation: (m?.designation || '').trim() || undefined,
          role: validatedRole,
          hierarchyLevel: validatedRole === 'boss' ? 1 : validatedRole === 'manager' ? 2 : 3,
          organizationId: orgId,
          reportsTo,
          createdBy: orgAdminId,
          isActive: false,
          isMobileVerified: false,
        });
        await newUser.save();

        const token = generateInviteToken();
        const shortCode = await ensureUniqueShortCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

        const invite = new Invite({
          token,
          shortCode,
          role: validatedRole,
          organizationId: orgId,
          createdBy: orgAdminId,
          expiresAt,
        });
        await invite.save();

        const inviteLink = `${baseUrl}/auth/join/${token}`;
        try {
          await sendInviteEmail({
            to: newUser.email,
            recipientName: newUser.name,
            orgName: (org as any).name,
            inviterName: (orgAdmin as any).name,
            inviteLink,
            shortCode,
          });
        } catch (emailErr) {
          console.error('[orgAdminController] Bulk invite email failed:', emailErr);
        }

        success.push({ name: newUser.name, email: newUser.email, inviteCode: shortCode });
      } catch (err) {
        failed.push({ row, reason: (err as Error).message || 'Failed to create member' });
      }
    }

    res.status(200).json({
      status: 'success',
      data: { success, failed },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/org-admin/members/invite-link
 * Send invite link to email (uses org invite code)
 */
export async function sendInviteLink(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const { email } = req.body;
    if (!userId || !email?.trim()) {
      res.status(400).json({ status: 'error', message: 'userId and email are required' });
      return;
    }

    const { org, caller } = await getOrgContextForInvite(userId);
    const orgObj = org as any;
    const baseUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');

    const normalizedEmail = email.trim().toLowerCase();

    let inviteCode = orgObj.inviteCode;
    if (!inviteCode) {
      inviteCode = await ensureUniqueOrgInviteCode();
      await Organization.findByIdAndUpdate(orgObj._id, { inviteCode });
    }

    const inviteLink = `${baseUrl}/auth/join?code=${inviteCode}`;
    try {
      await sendInviteEmail({
        to: normalizedEmail,
        recipientName: normalizedEmail.split('@')[0],
        orgName: orgObj.name,
        inviterName: (caller as any).name,
        inviteLink,
        shortCode: inviteCode,
      });
    } catch (emailErr) {
      console.error('[orgAdminController] Invite link email failed:', emailErr);
      res.status(500).json({ status: 'error', message: 'Failed to send email' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Invite link sent',
      data: { email: normalizedEmail },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/org-admin/invite-code?userId=USERID
 * Returns org's invite code (generates if not exists)
 */
export async function getInviteCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }

    const { org } = await getOrgContextForInvite(userId);
    const orgObj = org as any;

    if (!orgObj.inviteCode) {
      const newCode = await ensureUniqueOrgInviteCode();
      await Organization.findByIdAndUpdate(orgObj._id, { inviteCode: newCode });
      orgObj.inviteCode = newCode;
    }

    res.status(200).json({
      status: 'success',
      data: { inviteCode: orgObj.inviteCode, orgName: orgObj.name },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/org-admin/invite-code/regenerate?userId=USERID
 * Generates new org invite code
 */
export async function regenerateInviteCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }

    const { org } = await getOrgContextForInvite(userId);
    const newCode = await ensureUniqueOrgInviteCode();
    await Organization.findByIdAndUpdate((org as any)._id, { inviteCode: newCode });

    res.status(200).json({
      status: 'success',
      data: { inviteCode: newCode },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/org-admin/members/:memberId/resend-invite
 * Resend invite email to a pending member
 */
export async function resendInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const { memberId } = req.params;
    if (!userId || !memberId) {
      res.status(400).json({ status: 'error', message: 'userId and memberId are required' });
      return;
    }

    const { org, caller } = await getOrgContextForInvite(userId);
    const orgId = (org as any)._id;

    const member = await User.findOne({ _id: memberId, organizationId: orgId });
    if (!member) {
      res.status(404).json({ status: 'error', message: 'Member not found' });
      return;
    }
    if (member.isActive) {
      res.status(400).json({ status: 'error', message: 'Member is already active' });
      return;
    }

    const invite = await Invite.findOne({ invitedUserId: memberId }).sort({ createdAt: -1 });
    if (!invite || invite.usedAt) {
      res.status(400).json({ status: 'error', message: 'No pending invite found for this member' });
      return;
    }
    if (new Date() > invite.expiresAt) {
      res.status(400).json({ status: 'error', message: 'Invite has expired' });
      return;
    }

    const baseUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const inviteLink = `${baseUrl}/auth/join?invite=${invite.token}`;

    try {
      await sendInviteEmail({
        to: member.email,
        recipientName: member.name,
        orgName: (org as any).name,
        inviterName: (caller as any).name,
        inviteLink,
        shortCode: invite.shortCode,
      });
    } catch (emailErr) {
      console.error('[orgAdminController] Resend invite email failed:', emailErr);
      res.status(500).json({ status: 'error', message: 'Failed to send email' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Invite email resent',
      data: { inviteCode: invite.shortCode, inviteLink },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only Org Admin')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * PUT /api/org-admin/members/:id
 */
export async function updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const { id } = req.params;
    if (!userId || !id) {
      res.status(400).json({ status: 'error', message: 'userId and member id are required' });
      return;
    }

    const { org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;

    const user = await User.findOne({ _id: id, organizationId: orgId });
    if (!user) {
      res.status(404).json({ status: 'error', message: 'Member not found' });
      return;
    }

    const { name, email, mobile, designation, reportsTo, role } = req.body;
    if (name?.trim()) user.name = name.trim();
    if (email?.trim()) user.email = email.toLowerCase().trim();
    if (mobile !== undefined) {
      const m = typeof mobile === 'string' ? mobile.replace(/\D/g, '').slice(0, 10) : '';
      if (m.length === 10) user.mobile = m;
    }
    if (designation !== undefined) user.designation = designation?.trim() || undefined;
    if (reportsTo !== undefined) {
      user.reportsTo = reportsTo && mongoose.Types.ObjectId.isValid(reportsTo) ? reportsTo : undefined;
    }
    if (role && ['boss', 'manager', 'employee'].includes(role)) {
      user.role = role;
      user.hierarchyLevel = role === 'boss' ? 1 : role === 'manager' ? 2 : 3;
    }
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Member updated',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        designation: user.designation,
        reportsTo: user.reportsTo,
        status: user.isActive ? 'active' : 'invited',
      },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * PATCH /api/org-admin/members/:memberId/reports-to
 */
export async function updateMemberReportsTo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const { memberId } = req.params;
    const { reportsTo } = req.body;

    if (!userId || !memberId) {
      res.status(400).json({ status: 'error', message: 'userId and memberId are required' });
      return;
    }

    const { org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;

    const user = await User.findOne({ _id: memberId, organizationId: orgId });
    if (!user) {
      res.status(404).json({ status: 'error', message: 'Member not found' });
      return;
    }

    user.reportsTo = reportsTo && mongoose.Types.ObjectId.isValid(reportsTo) ? reportsTo : undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Reports to updated',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        designation: user.designation,
        reportsTo: user.reportsTo,
        status: user.isActive ? 'active' : 'invited',
      },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/org-admin/members/:id
 */
export async function deleteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const { id } = req.params;
    if (!userId || !id) {
      res.status(400).json({ status: 'error', message: 'userId and member id are required' });
      return;
    }

    const { org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;

    const user = await User.findOne({ _id: id, organizationId: orgId });
    if (!user) {
      res.status(404).json({ status: 'error', message: 'Member not found' });
      return;
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ status: 'success', message: 'Member removed' });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/org-admin/stats
 */
export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    const { org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;

    const totalMembers = await User.countDocuments({
      organizationId: orgId,
      role: { $in: ['boss', 'manager', 'employee'] },
    });
    const pendingInvites = await User.countDocuments({
      organizationId: orgId,
      role: { $in: ['boss', 'manager', 'employee'] },
      isActive: false,
    });

    const { ReviewCycle } = await import('../models/ReviewCycle');
    const activeCycle = await ReviewCycle.findOne({
      organizationId: orgId,
      isActive: true,
    }).lean();

    const periodLabel = activeCycle
      ? `R${(activeCycle as any).currentReviewPeriod ?? 1}`
      : 'None';

    res.status(200).json({
      status: 'success',
      data: {
        totalMembers,
        pendingInvites,
        activeReviewPeriod: periodLabel,
        activeReviewPeriodEnd: (activeCycle as any)?.nextReviewDate,
        coreValuesCount: 0,
      },
    });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/org-admin/activity
 */
export async function getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    const { org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;

    const recentUsers = await User.find({ organizationId: orgId, role: { $in: ['boss', 'manager', 'employee'] } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name createdAt')
      .lean();

    const activity = recentUsers.map((u: any) => ({
      _id: u._id,
      action: 'Member added',
      description: `${u.name} joined the organization`,
      createdAt: u.createdAt,
      type: 'member_added',
    }));

    res.status(200).json({ status: 'success', data: activity });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/org-admin/tree
 */
export async function getTree(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    const { orgAdmin, org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;
    const orgAdminObj = orgAdmin as any;

    const users = await User.find({
      organizationId: orgId,
      role: { $in: ['boss', 'manager', 'employee'] },
    })
      .populate('reportsTo', 'name')
      .select('name designation role reportsTo')
      .lean();

    const roleLabels: Record<string, string> = { boss: 'Executive', manager: 'Supervisor', employee: 'Member' };
    const idToNode: Record<string, { id: string; name: string; designation?: string; role?: string; roleLabel?: string; children: any[] }> = {};
    users.forEach((u: any) => {
      idToNode[u._id.toString()] = {
        id: u._id.toString(),
        name: u.name,
        designation: u.designation,
        role: u.role,
        roleLabel: roleLabels[u.role] || u.role,
        children: [],
      };
    });

    let root: any = null;
    users.forEach((u: any) => {
      const node = idToNode[u._id.toString()];
      const reportsToId = u.reportsTo?._id?.toString?.() ?? u.reportsTo;
      if (!reportsToId || !idToNode[reportsToId]) {
        if (!root) root = node;
        return;
      }
      idToNode[reportsToId].children.push(node);
    });

    if (!root && users.length > 0) {
      root = idToNode[users[0]._id.toString()];
    }

    res.status(200).json({ status: 'success', data: root });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/org-admin/core-values
 */
export async function getCoreValues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    await getOrgAdminContext(userId);
    res.status(200).json({ status: 'success', data: [] });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * POST /api/org-admin/core-values
 */
export async function addCoreValue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    await getOrgAdminContext(userId);
    res.status(501).json({ status: 'error', message: 'Core values model not yet implemented' });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * PUT /api/org-admin/core-values/:id
 */
export async function updateCoreValue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    await getOrgAdminContext(userId);
    res.status(501).json({ status: 'error', message: 'Core values model not yet implemented' });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/org-admin/core-values/:id
 */
export async function deleteCoreValue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    await getOrgAdminContext(userId);
    res.status(501).json({ status: 'error', message: 'Core values model not yet implemented' });
  } catch (error) {
    if ((error as Error).message?.includes('Only org admins')) {
      res.status(403).json({ status: 'error', message: (error as Error).message });
      return;
    }
    next(error);
  }
}
