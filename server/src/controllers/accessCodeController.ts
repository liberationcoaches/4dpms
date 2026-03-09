import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { z } from 'zod';
import crypto from 'crypto';

const accessCodeSchema = z.object({
  accessCode: z.string().min(4).max(50),
  confirmCode: z.string(),
  useFingerprint: z.boolean().optional(),
});

/**
 * Set access code
 * POST /api/auth/access-code
 */
export async function setAccessCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // TODO: Get userId from auth token/session
    const userId = req.query.userId as string || req.body.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const validatedData = accessCodeSchema.parse(req.body);

    if (validatedData.accessCode !== validatedData.confirmCode) {
      res.status(400).json({
        status: 'error',
        message: 'Access codes do not match',
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

    // Hash the access code (in production, use bcrypt)
    const hashedCode = crypto.createHash('sha256').update(validatedData.accessCode).digest('hex');

    user.accessCode = hashedCode;
    user.useFingerprint = validatedData.useFingerprint || false;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Access code set successfully',
      data: {
        userId: user._id.toString(),
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

