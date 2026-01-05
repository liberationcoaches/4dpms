import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  identifier: string; // email or mobile
  type: 'email' | 'mobile';
  otp: string;
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    identifier: {
      type: String,
      required: [true, 'Identifier is required'],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['email', 'mobile'],
      required: [true, 'OTP type is required'],
      index: true,
    },
    otp: {
      type: String,
      required: [true, 'OTP is required'],
      length: [6, 'OTP must be 6 digits'],
      match: [/^\d{6}$/, 'OTP must be 6 digits'],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-deletion
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
OTPSchema.index({ identifier: 1, type: 1, createdAt: -1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model<IOTP>('OTP', OTPSchema);

