import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
  employeeId: mongoose.Types.ObjectId;
  addedBy: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  type: 'mid_cycle_note' | 'general' | 'positive' | 'constructive' | 'goal';
  content: string;
  reviewPeriod?: number; // 1-4 for which review period
  isPrivate: boolean; // If true, only visible to supervisor
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    type: {
      type: String,
      enum: ['mid_cycle_note', 'general', 'positive', 'constructive', 'goal'],
      default: 'general',
    },
    content: {
      type: String,
      required: [true, 'Feedback content is required'],
      trim: true,
      maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
    },
    reviewPeriod: {
      type: Number,
      min: 1,
      max: 4,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
FeedbackSchema.index({ employeeId: 1, createdAt: -1 });
FeedbackSchema.index({ employeeId: 1, type: 1 });
FeedbackSchema.index({ addedBy: 1, createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);
