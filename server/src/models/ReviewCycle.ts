import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewCycle extends Document {
  organizationId: mongoose.Types.ObjectId;
  frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  startDate: Date;
  nextReviewDate: Date;
  currentReviewPeriod: number; // 1, 2, 3, 4
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewCycleSchema = new Schema<IReviewCycle>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'biannual', 'annual'],
      required: [true, 'Review frequency is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    nextReviewDate: {
      type: Date,
      required: [true, 'Next review date is required'],
    },
    currentReviewPeriod: {
      type: Number,
      min: 1,
      max: 4,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ReviewCycleSchema.index({ organizationId: 1 });
ReviewCycleSchema.index({ nextReviewDate: 1 });
ReviewCycleSchema.index({ isActive: 1 });

export const ReviewCycle = mongoose.model<IReviewCycle>('ReviewCycle', ReviewCycleSchema);

