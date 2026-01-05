import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  code: string; // Organization code (given to managers)
  type: string;
  employeeSize: string;
  bossId: mongoose.Types.ObjectId; // The boss who created this organization
  reviewerId?: mongoose.Types.ObjectId; // Reviewer assigned to this organization
  managers: mongoose.Types.ObjectId[]; // Managers in this organization
  subscriptionStatus?: string; // Subscription status: 'active', 'trial', 'expired'
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [200, 'Organization name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      required: [true, 'Organization code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]{6,8}$/, 'Organization code must be 6-8 alphanumeric characters'],
      index: true,
    },
    type: {
      type: String,
      required: false,
      trim: true,
    },
    employeeSize: {
      type: String,
      required: false,
      trim: true,
    },
    bossId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Boss ID is required'],
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    managers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trial', 'expired'],
      default: 'trial',
    },
  },
  {
    timestamps: true,
  }
);

OrganizationSchema.index({ code: 1 });
OrganizationSchema.index({ bossId: 1 });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
