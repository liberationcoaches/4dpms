import mongoose, { Document, Schema } from 'mongoose';

// Functional Dimension KRA
export interface IFunctionalKRA {
  kra: string;
  kpiTarget?: string;
  reportsGenerated?: string;
  // Pilot Period
  pilotWeight?: number;
  pilotActualPerf?: string;
  // Review Period 1
  r1Weight?: number;
  r1Score?: number;
  r1ActualPerf?: string;
  // Review Period 2
  r2Weight?: number;
  r2Score?: number;
  r2ActualPerf?: string;
  // Review Period 3
  r3Weight?: number;
  r3Score?: number;
  r3ActualPerf?: string;
  // Review Period 4
  r4Weight?: number;
  r4Score?: number;
  r4ActualPerf?: string;
  // Calculated
  averageScore?: number;
}

// Organizational Dimension KRA
export interface IOrganizationalKRA {
  coreValues: string; // Changed from coreValue to match Excel "Core Values"
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
  // Functional Dimension KRAs
  functionalKRAs?: IFunctionalKRA[];
  // Organizational Dimension KRAs
  organizationalKRAs?: IOrganizationalKRA[];
  // Self Development KRAs
  selfDevelopmentKRAs?: ISelfDevelopmentKRA[];
  // Developing Others KRAs
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
        // Functional Dimension KRAs
        functionalKRAs: [
          {
            kra: { type: String, required: true, trim: true },
            kpiTarget: { type: String, trim: true },
            reportsGenerated: { type: String, trim: true },
            pilotWeight: { type: Number, default: 0 },
            pilotActualPerf: { type: String, trim: true },
            r1Weight: { type: Number, default: 0 },
            r1Score: { type: Number, default: 0 },
            r1ActualPerf: { type: String, trim: true },
            r2Weight: { type: Number, default: 0 },
            r2Score: { type: Number, default: 0 },
            r2ActualPerf: { type: String, trim: true },
            r3Weight: { type: Number, default: 0 },
            r3Score: { type: Number, default: 0 },
            r3ActualPerf: { type: String, trim: true },
            r4Weight: { type: Number, default: 0 },
            r4Score: { type: Number, default: 0 },
            r4ActualPerf: { type: String, trim: true },
            averageScore: { type: Number, default: 0 },
          },
        ],
        // Organizational Dimension KRAs
        organizationalKRAs: [
          {
            coreValues: { type: String, required: true, trim: true },
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

