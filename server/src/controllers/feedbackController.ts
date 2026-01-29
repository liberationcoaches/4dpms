import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Team } from '../models/Team';
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
    if (employee.managerId?.toString() !== managerId) {
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

    // TODO: Add midCycleNotes field to Team schema or create separate Feedback model
    // For now, we'll store in a metadata field or extend the schema
    // This is a placeholder implementation

    res.status(200).json({
      status: 'success',
      message: 'Mid-cycle note added successfully',
      data: {
        employeeId: employee._id,
        managerId: manager._id,
        note,
        reviewPeriod: reviewPeriod || 1,
        createdAt: new Date(),
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

    // Get employee
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
      return;
    }

    // Check access: employee can see their own feedback, manager can see their team's feedback
    if (user.role === 'employee' && user._id.toString() !== employeeId) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own feedback',
      });
      return;
    }

    if (user.role === 'manager' && employee.managerId?.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view feedback for your team members',
      });
      return;
    }

    // TODO: Fetch actual feedback/notes from database
    // For now, return placeholder
    res.status(200).json({
      status: 'success',
      data: {
        employeeId: employee._id,
        feedback: [],
        notes: [],
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
    if (user.role === 'manager' && employee.managerId?.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'Employee is not under your management',
      });
      return;
    }

    // TODO: Store feedback in database
    res.status(200).json({
      status: 'success',
      message: 'Feedback added successfully',
      data: {
        employeeId: employee._id,
        comment,
        type: type || 'general',
        addedBy: user._id,
        addedByName: user.name,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
}

