import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { Feedback } from '../models/Feedback';
import mongoose from 'mongoose';

/**
 * Add mid-cycle notes (Manager only)
 */
export async function addMidCycleNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { employeeId, note, reviewPeriod } = req.body;
    const managerId = req.query.userId as string;

    if (!managerId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors can add mid-cycle notes',
      });
      return;
    }

    if (!employeeId || !note) {
      res.status(400).json({
        status: 'error',
        message: 'Employee ID and note are required',
      });
      return;
    }

    // Get employee
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
      return;
    }

    // Verify employee is under this manager
    if (employee.reportsTo?.toString() !== managerId) {
      res.status(403).json({
        status: 'error',
        message: 'Employee is not under your management',
      });
      return;
    }

    // Get team
    const team = await Team.findOne({
      'membersDetails.mobile': employee.mobile,
    });

    if (!team) {
      res.status(404).json({
        status: 'error',
        message: 'Team member details not found',
      });
      return;
    }

    const memberIndex = team.membersDetails.findIndex(
      (m) => m.mobile === employee.mobile
    );

    if (memberIndex === -1) {
      res.status(404).json({
        status: 'error',
        message: 'Member details not found',
      });
      return;
    }

    // Store the mid-cycle note in Feedback collection
    const feedback = new Feedback({
      employeeId: employee._id,
      addedBy: manager._id,
      organizationId: employee.organizationId,
      type: 'mid_cycle_note',
      content: note,
      reviewPeriod: reviewPeriod || 1,
      isPrivate: true, // Mid-cycle notes are typically supervisor-only
    });

    await feedback.save();

    res.status(200).json({
      status: 'success',
      message: 'Mid-cycle note added successfully',
      data: {
        _id: feedback._id,
        employeeId: employee._id,
        managerId: manager._id,
        note,
        reviewPeriod: reviewPeriod || 1,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get feedback/notes for an employee
 */
export async function getEmployeeFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { employeeId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Get target user (subject of feedback)
    const employee = await User.findById(employeeId);
    if (!employee) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Check access: user can see their own feedback; manager can see their team's feedback
    const isOwnFeedback = userId === employeeId;
    if (!isOwnFeedback) {
      if (user.role === 'employee') {
        res.status(403).json({
          status: 'error',
          message: 'You can only view your own feedback',
        });
        return;
      }
      if (user.role === 'manager' && employee.reportsTo?.toString() !== userId) {
        res.status(403).json({
          status: 'error',
          message: 'You can only view feedback for your team members',
        });
        return;
      }
    }

    // Build query based on user role
    const query: any = { employeeId: employee._id };

    // Employees can only see non-private feedback
    if (user.role === 'employee') {
      query.isPrivate = false;
    }

    // Fetch feedback from database
    const feedbackList = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .populate('addedBy', 'name role')
      .lean();

    // Separate mid-cycle notes from general feedback
    const midCycleNotes = feedbackList.filter(f => f.type === 'mid_cycle_note');
    const generalFeedback = feedbackList.filter(f => f.type !== 'mid_cycle_note');

    res.status(200).json({
      status: 'success',
      data: {
        employeeId: employee._id,
        feedback: generalFeedback,
        notes: midCycleNotes,
        total: feedbackList.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add feedback comment (Manager or Boss)
 */
export async function addFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { employeeId, comment, type } = req.body;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user || !['manager', 'boss'].includes(user.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Only Supervisors and Admins can add feedback',
      });
      return;
    }

    if (!employeeId || !comment) {
      res.status(400).json({
        status: 'error',
        message: 'Employee ID and comment are required',
      });
      return;
    }

    // Get employee
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
      return;
    }

    // Verify access
    if (user.role === 'manager' && employee.reportsTo?.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'Employee is not under your management',
      });
      return;
    }

    // Validate feedback type
    const validTypes = ['general', 'positive', 'constructive', 'goal'];
    const feedbackType = validTypes.includes(type) ? type : 'general';

    // Store feedback in database
    const feedback = new Feedback({
      employeeId: employee._id,
      addedBy: user._id,
      organizationId: employee.organizationId,
      type: feedbackType,
      content: comment,
      isPrivate: false, // General feedback is visible to employee
    });

    await feedback.save();

    res.status(200).json({
      status: 'success',
      message: 'Feedback added successfully',
      data: {
        _id: feedback._id,
        employeeId: employee._id,
        comment,
        type: feedbackType,
        addedBy: user._id,
        addedByName: user.name,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

