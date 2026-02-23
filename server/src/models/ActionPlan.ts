import mongoose, { Document, Schema } from 'mongoose';

export interface IActionPlanItem {
  description: string;
  targetDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: Date;
}

export interface IActionPlan extends Document {
  employeeId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  reviewPeriod: number; // 1-4 for which review period this plan was created
  items: IActionPlanItem[];
  acknowledgedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActionPlanSchema = new Schema<IActionPlan>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    reviewPeriod: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    items: [
      {
        description: {
          type: String,
          required: true,
          trim: true,
          maxlength: [500, 'Action item description cannot exceed 500 characters'],
        },
        targetDate: {
          type: Date,
        },
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          default: 'pending',
        },
        completedAt: {
          type: Date,
        },
      },
    ],
    acknowledgedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
ActionPlanSchema.index({ employeeId: 1, reviewPeriod: 1 });
ActionPlanSchema.index({ employeeId: 1, createdAt: -1 });

export const ActionPlan = mongoose.model<IActionPlan>('ActionPlan', ActionPlanSchema);
