import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Organization } from '../models/Organization';

/**
 * Subscription check middleware.
 *
 * - If the user has no organizationId (platform_admin, org_admin, etc.) → skip, call next().
 * - If the org subscription is 'expired' → 403 with SUBSCRIPTION_EXPIRED code.
 * - If 'trial' or 'active' → call next().
 */
export async function checkSubscription(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = req.query.userId as string | undefined;

        if (!userId) {
            // No userId — let downstream handlers return their own 400
            return next();
        }

        const user = await User.findById(userId).select('organizationId role').lean();

        if (!user) {
            return next(); // Unknown user — let the downstream controller handle it
        }

        // Roles without an org (platform_admin, org_admin) bypass the subscription check
        if (!user.organizationId) {
            return next();
        }

        const org = await Organization.findById(user.organizationId)
            .select('subscriptionStatus')
            .lean();

        if (!org) {
            return next(); // Org not found — let downstream decide
        }

        if ((org as any).subscriptionStatus === 'expired') {
            res.status(403).json({
                status: 'error',
                code: 'SUBSCRIPTION_EXPIRED',
                message: 'Your subscription has expired. Please contact support.',
            });
            return;
        }

        // 'trial' or 'active' → allow through
        return next();
    } catch (err) {
        return next(err);
    }
}
