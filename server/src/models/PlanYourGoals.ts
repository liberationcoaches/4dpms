import mongoose, { Document, Schema } from 'mongoose';

export interface IGoalBreakdown {
    period: string; // e.g., 'Q1', 'Q2', 'Q3', 'Q4' or 'Month 1' ... 'Month 12'
    target: string;
    status: 'not_started' | 'in_progress' | 'completed';
}

export interface IGoal {
    name: string;
    description: string;
    target: string;
    timeline: 'yearly' | 'quarterly' | 'monthly';
    breakdowns: IGoalBreakdown[];
    status: 'draft' | 'active' | 'completed';
}

export interface IPlanYourGoals extends Document {
    userId: mongoose.Types.ObjectId;
    organizationId?: mongoose.Types.ObjectId;
    year: number;
    goals: IGoal[];
    createdAt: Date;
    updatedAt: Date;
}

const GoalBreakdownSchema = new Schema<IGoalBreakdown>(
    {
        period: {
            type: String,
            required: true,
            trim: true,
        },
        target: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'completed'],
            default: 'not_started',
        },
    },
    { _id: false }
);

const GoalSchema = new Schema<IGoal>(
    {
        name: {
            type: String,
            required: [true, 'Goal name is required'],
            trim: true,
            maxlength: [200, 'Goal name cannot exceed 200 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        target: {
            type: String,
            required: [true, 'Target is required'],
            trim: true,
            maxlength: [500, 'Target cannot exceed 500 characters'],
        },
        timeline: {
            type: String,
            enum: ['yearly', 'quarterly', 'monthly'],
            default: 'quarterly',
        },
        breakdowns: [GoalBreakdownSchema],
        status: {
            type: String,
            enum: ['draft', 'active', 'completed'],
            default: 'draft',
        },
    },
    { _id: true }
);

const PlanYourGoalsSchema = new Schema<IPlanYourGoals>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: false,
        },
        year: {
            type: Number,
            required: [true, 'Year is required'],
        },
        goals: [GoalSchema],
    },
    {
        timestamps: true,
    }
);

// Compound index: one PYG per user per year
PlanYourGoalsSchema.index({ userId: 1, year: 1 }, { unique: true });

export const PlanYourGoals = mongoose.model<IPlanYourGoals>('PlanYourGoals', PlanYourGoalsSchema);
