import { Request, Response, NextFunction } from 'express';
import { createInvite as createInviteService, resolveInvite as resolveInviteService } from '../services/inviteService';
import { createInviteSchema } from '../utils/validation';

/**
 * Create invite (CSA / Boss / Manager). Returns link and short code.
 * POST /api/invites?userId=xxx
 */
export async function createInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ status: 'error', message: 'userId is required' });
      return;
    }
    const validated = createInviteSchema.parse(req.body);
    const { invite, link, code } = await createInviteService(userId, validated);

    res.status(201).json({
      status: 'success',
      message: 'Invite created.',
      data: {
        inviteId: invite._id,
        role: invite.role,
        link: `${process.env.CLIENT_URL || ''}${link}`.trim() || link,
        code,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resolve invite by token or code. Public.
 * GET /api/invites/resolve?token=xxx or GET /api/invites/resolve?code=XXX
 */
export async function resolveInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = (req.query.token as string) || undefined;
    const code = (req.query.code as string) || undefined;
    const tokenOrCode = token || code;
    if (!tokenOrCode) {
      res.status(400).json({ status: 'error', message: 'Token or code is required' });
      return;
    }
    const result = await resolveInviteService(tokenOrCode);
    if (!result.valid) {
      res.status(404).json({ status: 'error', message: result.message || 'Invalid invite' });
      return;
    }
    res.status(200).json({
      status: 'success',
      data: {
        valid: true,
        role: result.role,
        organizationName: result.organizationName,
        teamName: result.teamName,
        managerName: result.managerName,
        token: result.token,
        invitedUserId: result.invitedUserId,
        invitedUserEmail: result.invitedUserEmail,
      },
    });
  } catch (error) {
    next(error);
  }
}
