import mongoose, { Document, Schema } from 'mongoose';

export interface IEnquiry extends Document {
  email: string;
  name?: string;
  company?: string;
  message?: string;
  status: 'pending' | 'contacted' | 'converted' | 'closed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'converted', 'closed'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup by email and status
enquirySchema.index({ email: 1 });
enquirySchema.index({ status: 1 });
enquirySchema.index({ createdAt: -1 });

export const Enquiry = mongoose.model<IEnquiry>('Enquiry', enquirySchema);
