import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  mobile: string;
  companyName?: string;
  industry?: string;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  isActive: boolean;
  accessCode?: string;
  useFingerprint?: boolean;
  teamId?: mongoose.Types.ObjectId;
  role: 'platform_admin' | 'client_admin' | 'reviewer' | 'boss' | 'manager' | 'employee';
  hierarchyLevel?: number; // 0=Platform Admin, 0.5=Client Admin, 1=Boss, 2=Manager, 3=Employee
  organizationId?: mongoose.Types.ObjectId; // Link to organization
  reviewerId?: mongoose.Types.ObjectId; // For employees being reviewed
  managerId?: mongoose.Types.ObjectId; // Direct manager
  bossId?: mongoose.Types.ObjectId; // Organization boss
  createdBy?: mongoose.Types.ObjectId; // User who created this user (for hierarchy visibility)
  designation?: string; // Job title/designation
  grossSalary?: number; // Annual/Monthly gross salary used for hike calculations
  aboutMe?: string;
  educationalQualification?: string;
  skills?: string[];
  clientele?: string[];
  languages?: string[];
  onboardingCompleted: boolean; // Whether user completed the onboarding wizard
  onboardingStep: number; // Current step in onboarding (0-4)
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
      index: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Mobile number must be 10 digits'],
      index: true,
    },
    companyName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    industry: {
      type: String,
      required: false,
      trim: true,
      enum: [
        'Technology',
        'Healthcare',
        'Finance',
        'Education',
        'Manufacturing',
        'Retail',
        'Consulting',
        'Other',
      ],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false, // Users start as Pending, activated on first successful login
    },
    accessCode: {
      type: String,
      select: false, // Don't return in queries by default
    },
    useFingerprint: {
      type: Boolean,
      default: false,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    role: {
      type: String,
      enum: ['platform_admin', 'client_admin', 'reviewer', 'boss', 'manager', 'employee'],
      default: 'employee',
    },
    hierarchyLevel: {
      type: Number,
      min: 0,
      max: 3,
      required: false,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    bossId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters'],
    },
    grossSalary: {
      type: Number,
      default: 0,
      min: [0, 'Gross salary cannot be negative'],
    },
    aboutMe: {
      type: String,
      trim: true,
      maxlength: [1000, 'About Me cannot exceed 1000 characters'],
    },
    educationalQualification: {
      type: String,
      trim: true,
      maxlength: [500, 'Educational Qualification cannot exceed 500 characters'],
    },
    skills: {
      type: [String],
      default: [],
    },
    clientele: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: [],
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    onboardingStep: {
      type: Number,
      default: 0,
      min: 0,
      max: 4, // 0=not started, 1=videos, 2=PYG, 3=team members, 4=KRAs
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ mobile: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ role: 1 });
UserSchema.index({ organizationId: 1 });
UserSchema.index({ managerId: 1 });
UserSchema.index({ bossId: 1 });
UserSchema.index({ reviewerId: 1 });
UserSchema.index({ createdBy: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

