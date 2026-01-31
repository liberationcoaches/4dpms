import mongoose, { Document, Schema } from 'mongoose';

export interface IInvite extends Document {
  token: string;
  shortCode: string;
  role: 'boss' | 'manager' | 'employee';
  organizationId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId; // required for employee
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  usedAt?: Date;
  usedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['boss', 'manager', 'employee'],
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      required: false,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { timestamps: true }
);

InviteSchema.index({ token: 1 });
InviteSchema.index({ shortCode: 1 });
InviteSchema.index({ expiresAt: 1 });

export const Invite = mongoose.model<IInvite>('Invite', InviteSchema);
