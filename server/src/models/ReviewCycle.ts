import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewCycle extends Document {
  organizationId: mongoose.Types.ObjectId;
  frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  startDate: Date;
  nextReviewDate: Date;
  currentReviewPeriod: number; // 1, 2, 3, 4
  isActive: boolean;
  // Quarterly dates (R1–R4) for display in KRA screens
  r1Date?: Date;
  r2Date?: Date;
  r3Date?: Date;
  r4Date?: Date;
  // LCPL Facilitator per quarter
  r1Facilitator?: string;
  r2Facilitator?: string;
  r3Facilitator?: string;
  r4Facilitator?: string;
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
    r1Date: { type: Date },
    r2Date: { type: Date },
    r3Date: { type: Date },
    r4Date: { type: Date },
    r1Facilitator: { type: String, trim: true },
    r2Facilitator: { type: String, trim: true },
    r3Facilitator: { type: String, trim: true },
    r4Facilitator: { type: String, trim: true },
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

