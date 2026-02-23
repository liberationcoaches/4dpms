import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewLock extends Document {
  employeeId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  reviewPeriod: number; // 1-4
  lockedBy: mongoose.Types.ObjectId;
  lockedAt: Date;
  // Which dimensions are locked
  functionalLocked: boolean;
  organizationalLocked: boolean;
  selfDevelopmentLocked: boolean;
  developingOthersLocked: boolean;
  // Optional comments
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewLockSchema = new Schema<IReviewLock>(
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
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    reviewPeriod: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lockedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    functionalLocked: {
      type: Boolean,
      default: true,
    },
    organizationalLocked: {
      type: Boolean,
      default: true,
    },
    selfDevelopmentLocked: {
      type: Boolean,
      default: true,
    },
    developingOthersLocked: {
      type: Boolean,
      default: true,
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [500, 'Comments cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: one lock per employee per review period
ReviewLockSchema.index({ employeeId: 1, reviewPeriod: 1 }, { unique: true });
ReviewLockSchema.index({ organizationId: 1, reviewPeriod: 1 });

export const ReviewLock = mongoose.model<IReviewLock>('ReviewLock', ReviewLockSchema);
