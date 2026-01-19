import mongoose, { Document, Schema } from 'mongoose';

// KPI Interface - Multiple KPIs per KRA
export interface IKPI {
  kpi: string; // KPI description/process
  target?: string; // Target for this KPI
}

// Proof/Report Interface - For verification
export interface IProof {
  type: 'drive_link' | 'file_upload'; // Type of proof
  value: string; // Drive link URL or file path/URL
  fileName?: string; // Original file name if uploaded
  uploadedAt?: Date; // When proof was uploaded
}

// Functional Dimension KRA (D1) - Only Dimension
export interface IFunctionalKRA {
  kra: string; // KRA description (Task/Goal for quarter)
  kpis: IKPI[]; // Multiple KPIs - how the KRA will be achieved
  reportsGenerated?: IProof[]; // Proof system - files or drive links
  
  // Edit tracking - KRA can only be edited ONCE after creation
  editCount?: number; // Number of times KRA has been edited (max 1 allowed)
  
  // Score lock - once locked, scores cannot be changed
  isScoreLocked?: boolean; // If true, scores are finalized
  scoreLockedAt?: Date; // When scores were locked
  scoreLockedBy?: mongoose.Types.ObjectId; // Who locked the scores
  
  // Pilot Period (Starting score)
  pilotWeight?: number; // Weight in pilot period
  pilotScore?: number; // Score 0-5 (can be decimal)
  
  // Review Period 1
  r1Weight?: number; // Can be different from pilot
  r1Score?: number; // Score 0-5 (can be decimal)
  r1ActualPerf?: string; // Actual performance notes
  r1ReviewedBy?: mongoose.Types.ObjectId; // Reviewer for R1
  
  // Review Period 2
  r2Weight?: number;
  r2Score?: number;
  r2ActualPerf?: string;
  r2ReviewedBy?: mongoose.Types.ObjectId; // Reviewer for R2
  
  // Review Period 3
  r3Weight?: number;
  r3Score?: number;
  r3ActualPerf?: string;
  r3ReviewedBy?: mongoose.Types.ObjectId; // Reviewer for R3
  
  // Review Period 4
  r4Weight?: number;
  r4Score?: number;
  r4ActualPerf?: string;
  r4ReviewedBy?: mongoose.Types.ObjectId; // Reviewer for R4
  
  // Calculated
  averageScore?: number; // Average across all review periods
}

// Organizational Dimension KRA
export interface IOrganizationalKRA {
  coreValues: string; // Changed from coreValue to match Excel "Core Values"
  
  // Edit tracking - KRA can only be edited ONCE after creation
  editCount?: number;
  isScoreLocked?: boolean;
  scoreLockedAt?: Date;
  scoreLockedBy?: mongoose.Types.ObjectId;
  
  // Pilot Period (no score, just critical incident based on Excel structure)
  pilotCriticalIncident?: string;
  // Review Period 1
  r1Score?: number;
  r1CriticalIncident?: string;
  // Review Period 2
  r2Score?: number;
  r2CriticalIncident?: string;
  // Review Period 3
  r3Score?: number;
  r3CriticalIncident?: string;
  // Review Period 4
  r4Score?: number;
  r4CriticalIncident?: string;
  // Calculated
  averageScore?: number;
}

// Self Development KRA
export interface ISelfDevelopmentKRA {
  areaOfConcern: string;
  actionPlanInitiative?: string;
  
  // Edit tracking - KRA can only be edited ONCE after creation
  editCount?: number;
  isScoreLocked?: boolean;
  scoreLockedAt?: Date;
  scoreLockedBy?: mongoose.Types.ObjectId;
  
  // Pilot Period
  pilotScore?: number;
  pilotReason?: string;
  // Review Period 1
  r1Score?: number;
  r1Reason?: string;
  // Review Period 2
  r2Score?: number;
  r2Reason?: string;
  // Review Period 3
  r3Score?: number;
  r3Reason?: string;
  // Review Period 4
  r4Score?: number;
  r4Reason?: string;
  // Calculated
  averageScore?: number;
}

// Developing Others KRA
export interface IDevelopingOthersKRA {
  person: string;
  areaOfDevelopment?: string;
  
  // Edit tracking - KRA can only be edited ONCE after creation
  editCount?: number;
  isScoreLocked?: boolean;
  scoreLockedAt?: Date;
  scoreLockedBy?: mongoose.Types.ObjectId;
  
  // Pilot Period
  pilotScore?: number;
  pilotReason?: string;
  // Review Period 1
  r1Score?: number;
  r1Reason?: string;
  // Review Period 2
  r2Score?: number;
  r2Reason?: string;
  // Review Period 3
  r3Score?: number;
  r3Reason?: string;
  // Review Period 4
  r4Score?: number;
  r4Reason?: string;
  // Calculated
  averageScore?: number;
}

export interface ITeamMemberDetail {
  name: string;
  role: string;
  mobile: string;
  // Functional Dimension KRAs (D1) - Only Dimension with KRAs
  functionalKRAs?: IFunctionalKRA[];
  // Note: Other dimensions (Organizational, Self Development, Developing Others) 
  // are kept for backward compatibility but KRAs are only in Functional Dimension
  organizationalKRAs?: IOrganizationalKRA[];
  selfDevelopmentKRAs?: ISelfDevelopmentKRA[];
  developingOthersKRAs?: IDevelopingOthersKRA[];
}

// Dimension Weights Configuration
export interface IDimensionWeights {
  functional: number; // Functional Dimension weight (0-100)
  organizational: number; // Organizational Dimension weight (0-100)
  selfDevelopment: number; // Self Development weight (0-100)
  developingOthers: number; // Developing Others weight (0-100, optional)
}

export interface ITeam extends Document {
  name: string;
  code: string;
  members: mongoose.Types.ObjectId[];
  membersDetails: ITeamMemberDetail[];
  dimensionWeights?: IDimensionWeights; // Dimension weights configuration
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [200, 'Team name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      required: [true, 'Team code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]{4,8}$/, 'Team code must be 4-8 alphanumeric characters'],
      index: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    membersDetails: [
      {
        name: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        mobile: { type: String, required: true, trim: true },
        // Functional Dimension KRAs (D1) - Only Dimension with KRAs
        functionalKRAs: [
          {
            kra: { type: String, required: true, trim: true },
            // Multiple KPIs per KRA
            kpis: [
              {
                kpi: { type: String, required: true, trim: true },
                target: { type: String, trim: true },
              },
            ],
            // Proof/Reports system - multiple files or drive links
            reportsGenerated: [
              {
                type: { 
                  type: String, 
                  enum: ['drive_link', 'file_upload'],
                  default: 'drive_link'
                },
                value: { type: String, required: true, trim: true },
                fileName: { type: String, trim: true },
                uploadedAt: { type: Date, default: Date.now },
              },
            ],
            // Edit tracking - KRA can only be edited ONCE after creation
            editCount: { type: Number, default: 0 },
            isScoreLocked: { type: Boolean, default: false },
            scoreLockedAt: { type: Date },
            scoreLockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            // Pilot Period
            pilotWeight: { type: Number, min: 0, max: 100, default: 0 },
            pilotScore: { type: Number, min: 0, max: 5, default: 0 },
            // Review Period 1
            r1Weight: { type: Number, min: 0, max: 100, default: 0 },
            r1Score: { type: Number, min: 0, max: 5, default: 0 },
            r1ActualPerf: { type: String, trim: true },
            r1ReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            // Review Period 2
            r2Weight: { type: Number, min: 0, max: 100, default: 0 },
            r2Score: { type: Number, min: 0, max: 5, default: 0 },
            r2ActualPerf: { type: String, trim: true },
            r2ReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            // Review Period 3
            r3Weight: { type: Number, min: 0, max: 100, default: 0 },
            r3Score: { type: Number, min: 0, max: 5, default: 0 },
            r3ActualPerf: { type: String, trim: true },
            r3ReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            // Review Period 4
            r4Weight: { type: Number, min: 0, max: 100, default: 0 },
            r4Score: { type: Number, min: 0, max: 5, default: 0 },
            r4ActualPerf: { type: String, trim: true },
            r4ReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            // Calculated
            averageScore: { type: Number, default: 0 },
          },
        ],
        // Organizational Dimension KRAs
        organizationalKRAs: [
          {
            coreValues: { type: String, required: true, trim: true },
            // Edit tracking
            editCount: { type: Number, default: 0 },
            isScoreLocked: { type: Boolean, default: false },
            scoreLockedAt: { type: Date },
            scoreLockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            pilotScore: { type: Number, default: 0 },
            pilotCriticalIncident: { type: String, trim: true },
            r1Score: { type: Number, default: 0 },
            r1CriticalIncident: { type: String, trim: true },
            r2Score: { type: Number, default: 0 },
            r2CriticalIncident: { type: String, trim: true },
            r3Score: { type: Number, default: 0 },
            r3CriticalIncident: { type: String, trim: true },
            r4Score: { type: Number, default: 0 },
            r4CriticalIncident: { type: String, trim: true },
            averageScore: { type: Number, default: 0 },
          },
        ],
        // Self Development KRAs
        selfDevelopmentKRAs: [
          {
            areaOfConcern: { type: String, required: true, trim: true },
            actionPlanInitiative: { type: String, trim: true },
            // Edit tracking
            editCount: { type: Number, default: 0 },
            isScoreLocked: { type: Boolean, default: false },
            scoreLockedAt: { type: Date },
            scoreLockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            pilotScore: { type: Number, default: 0 },
            pilotReason: { type: String, trim: true },
            r1Score: { type: Number, default: 0 },
            r1Reason: { type: String, trim: true },
            r2Score: { type: Number, default: 0 },
            r2Reason: { type: String, trim: true },
            r3Score: { type: Number, default: 0 },
            r3Reason: { type: String, trim: true },
            r4Score: { type: Number, default: 0 },
            r4Reason: { type: String, trim: true },
            averageScore: { type: Number, default: 0 },
          },
        ],
        // Developing Others KRAs
        developingOthersKRAs: [
          {
            person: { type: String, required: true, trim: true },
            areaOfDevelopment: { type: String, trim: true },
            // Edit tracking
            editCount: { type: Number, default: 0 },
            isScoreLocked: { type: Boolean, default: false },
            scoreLockedAt: { type: Date },
            scoreLockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            pilotScore: { type: Number, default: 0 },
            pilotReason: { type: String, trim: true },
            r1Score: { type: Number, default: 0 },
            r1Reason: { type: String, trim: true },
            r2Score: { type: Number, default: 0 },
            r2Reason: { type: String, trim: true },
            r3Score: { type: Number, default: 0 },
            r3Reason: { type: String, trim: true },
            r4Score: { type: Number, default: 0 },
            r4Reason: { type: String, trim: true },
            averageScore: { type: Number, default: 0 },
          },
        ],
      },
    ],
    dimensionWeights: {
      functional: { type: Number, min: 0, max: 100, default: 0 },
      organizational: { type: Number, min: 0, max: 100, default: 0 },
      selfDevelopment: { type: Number, min: 0, max: 100, default: 0 },
      developingOthers: { type: Number, min: 0, max: 100, default: 0 },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

TeamSchema.index({ code: 1 });
TeamSchema.index({ members: 1 });
TeamSchema.index({ 'membersDetails.mobile': 1 });

export const Team = mongoose.model<ITeam>('Team', TeamSchema);

