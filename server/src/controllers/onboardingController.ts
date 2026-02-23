import { Request, Response } from 'express';
import { User } from '../models/User';
import { PlanYourGoals } from '../models/PlanYourGoals';

// GET /api/onboarding/status?userId=xxx
export const getOnboardingStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ status: 'error', message: 'userId is required' });
            return;
        }

        const user = await User.findById(userId).select('onboardingCompleted onboardingStep name role');
        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }

        res.json({
            status: 'success',
            data: {
                onboardingCompleted: user.onboardingCompleted,
                onboardingStep: user.onboardingStep,
                userName: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get onboarding status' });
    }
};

// PUT /api/onboarding/step?userId=xxx
export const updateOnboardingStep = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        const { step } = req.body;

        if (!userId) {
            res.status(400).json({ status: 'error', message: 'userId is required' });
            return;
        }
        if (step === undefined || step < 0 || step > 4) {
            res.status(400).json({ status: 'error', message: 'Step must be between 0 and 4' });
            return;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { onboardingStep: step },
            { new: true }
        ).select('onboardingCompleted onboardingStep');

        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }

        res.json({
            status: 'success',
            data: { onboardingStep: user.onboardingStep },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update onboarding step' });
    }
};

// PUT /api/onboarding/complete?userId=xxx
export const completeOnboarding = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ status: 'error', message: 'userId is required' });
            return;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { onboardingCompleted: true, onboardingStep: 4 },
            { new: true }
        ).select('onboardingCompleted onboardingStep');

        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }

        res.json({
            status: 'success',
            data: { onboardingCompleted: true },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to complete onboarding' });
    }
};

// POST /api/onboarding/pyg?userId=xxx
export const savePlanYourGoals = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        const { year, goals } = req.body;

        if (!userId) {
            res.status(400).json({ status: 'error', message: 'userId is required' });
            return;
        }
        if (!year) {
            res.status(400).json({ status: 'error', message: 'Year is required' });
            return;
        }

        const user = await User.findById(userId).select('organizationId');
        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }

        // Upsert: create or update PYG for this user + year
        const pyg = await PlanYourGoals.findOneAndUpdate(
            { userId, year },
            {
                userId,
                organizationId: user.organizationId,
                year,
                goals: goals || [],
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({
            status: 'success',
            data: pyg,
        });
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(409).json({ status: 'error', message: 'PYG for this year already exists' });
            return;
        }
        res.status(500).json({ status: 'error', message: 'Failed to save goals' });
    }
};

// GET /api/onboarding/pyg?userId=xxx&year=2026
export const getPlanYourGoals = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, year } = req.query;

        if (!userId) {
            res.status(400).json({ status: 'error', message: 'userId is required' });
            return;
        }

        const query: any = { userId };
        if (year) query.year = Number(year);

        const pyg = await PlanYourGoals.find(query).sort({ year: -1 });

        res.json({
            status: 'success',
            data: pyg,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get goals' });
    }
};
