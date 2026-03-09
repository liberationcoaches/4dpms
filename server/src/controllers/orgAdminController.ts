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
 * GET /api/org-admin/members
 */
export async function getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    const { org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;

    const users = await User.find({
      organizationId: orgId,
      role: { $in: ['boss', 'manager', 'employee'] },
    })
      .populate('reportsTo', 'name')
      .select('name email mobile designation reportsTo isActive createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const members = users.map((u: any) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      designation: u.designation,
      reportsTo: u.reportsTo,
      status: u.isActive ? 'active' : 'invited',
    }));

    res.status(200).json({ status: 'success', data: members });
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

    const { name, email, mobile, designation, reportsTo } = req.body;
    if (!name?.trim() || !email?.trim()) {
      res.status(400).json({ status: 'error', message: 'Name and email are required' });
      return;
    }

    const mobileTrimmed = typeof mobile === 'string' ? mobile.replace(/\D/g, '').slice(0, 10) : '';
    if (mobileTrimmed.length !== 10) {
      res.status(400).json({ status: 'error', message: 'Valid 10-digit mobile number is required' });
      return;
    }

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
      role: 'employee',
      hierarchyLevel: 3,
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
      role: 'employee',
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

    const { name, email, mobile, designation, reportsTo } = req.body;
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
    const { org } = await getOrgAdminContext(userId);
    const orgId = (org as any)._id;

    const users = await User.find({
      organizationId: orgId,
      role: { $in: ['boss', 'manager', 'employee'] },
    })
      .populate('reportsTo', 'name')
      .select('name designation reportsTo')
      .lean();

    const idToNode: Record<string, { id: string; name: string; designation?: string; children: any[] }> = {};
    users.forEach((u: any) => {
      idToNode[u._id.toString()] = {
        id: u._id.toString(),
        name: u.name,
        designation: u.designation,
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
