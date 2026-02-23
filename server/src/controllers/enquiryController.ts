import { Request, Response } from 'express';
import { Enquiry } from '../models/Enquiry';

/**
 * Submit a new enquiry
 * POST /api/enquiry
 */
export const submitEnquiry = async (req: Request, res: Response) => {
  try {
    const { email, name, company, message } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
      });
    }

    // Check if enquiry from this email already exists (optional - for duplicate detection)
    const existingEnquiry = await Enquiry.findOne({ 
      email: email.toLowerCase(),
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
    });

    if (existingEnquiry) {
      return res.status(200).json({
        status: 'success',
        message: 'Enquiry already submitted. We will get back to you soon.',
        data: { id: existingEnquiry._id },
      });
    }

    // Create new enquiry
    const enquiry = new Enquiry({
      email: email.toLowerCase(),
      name,
      company,
      message,
      status: 'pending',
    });

    await enquiry.save();

    return res.status(201).json({
      status: 'success',
      message: 'Enquiry submitted successfully. We will get back to you soon.',
      data: { id: enquiry._id },
    });
  } catch (error) {
    console.error('Error submitting enquiry:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to submit enquiry. Please try again.',
    });
  }
};

/**
 * Get all enquiries (admin only)
 * GET /api/enquiry
 */
export const getEnquiries = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const enquiries = await Enquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Enquiry.countDocuments(filter);

    return res.status(200).json({
      status: 'success',
      data: enquiries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch enquiries',
    });
  }
};

/**
 * Update enquiry status (admin only)
 * PUT /api/enquiry/:id
 */
export const updateEnquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({
        status: 'error',
        message: 'Enquiry not found',
      });
    }

    if (status) {
      enquiry.status = status;
    }
    if (notes !== undefined) {
      enquiry.notes = notes;
    }

    await enquiry.save();

    return res.status(200).json({
      status: 'success',
      message: 'Enquiry updated successfully',
      data: enquiry,
    });
  } catch (error) {
    console.error('Error updating enquiry:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update enquiry',
    });
  }
};
