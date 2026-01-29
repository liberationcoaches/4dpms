import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { ReviewCycle } from '../models/ReviewCycle';
import { Organization } from '../models/Organization';
import mongoose from 'mongoose';

/**
 * Send invitation notification to a newly created user
 */
export async function sendInvitationNotification(
  user: any,
  inviterName: string
): Promise<void> {
  try {
    const notification = new Notification({
      userId: user._id,
      type: 'system',
      title: 'Welcome to 4DPMS!',
      message: `Hello ${user.name || 'there'}, you have been invited by ${inviterName} to join the Performance Management System. Please set your password to get started.`,
      isRead: false,
      metadata: {
        type: 'invitation',
        email: user.email,
        mobile: user.mobile,
      },
    });

    await notification.save();
  } catch (error) {
    console.error('Failed to send invitation notification:', error);
  }
}

/**
 * Send notifications when review period starts
 */
export async function sendReviewPeriodNotifications(
  organizationId: mongoose.Types.ObjectId,
  reviewPeriod: number
): Promise<void> {
  try {
    // Get all users in the organization
    const users = await User.find({
      organizationId,
      role: { $in: ['boss', 'manager', 'employee'] },
      isActive: true,
    });

    const notifications = users.map((user) => ({
      userId: user._id,
      type: 'review_period_start',
      title: `Review Period ${reviewPeriod} Started`,
      message: `A new review period (Period ${reviewPeriod}) has started. Please check your dashboard for details.`,
      isRead: false,
      metadata: {
        reviewPeriod,
        organizationId: organizationId.toString(),
      },
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Failed to send review period notifications:', error);
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const count = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({
      status: 'success',
      data: {
        count,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    const notifications = await Notification.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { notificationId } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid notification ID',
      });
      return;
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      res.status(404).json({
        status: 'error',
        message: 'Notification not found',
      });
      return;
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({
        status: 'error',
        message: 'User ID is required',
      });
      return;
    }

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a notification
 */
export async function createNotification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, type, title, message, metadata } = req.body;

    if (!userId || !type || !title || !message) {
      res.status(400).json({
        status: 'error',
        message: 'userId, type, title, and message are required',
      });
      return;
    }

    const notification = new Notification({
      userId,
      type,
      title,
      message,
      metadata: metadata || {},
      isRead: false,
    });

    await notification.save();

    res.status(201).json({
      status: 'success',
      message: 'Notification created',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Send notification when KRA is added
 */
export async function sendKRANotification(
  userId: mongoose.Types.ObjectId,
  kraType: string,
  addedBy: string
): Promise<void> {
  try {
    const typeMap: Record<string, string> = {
      'functional': 'Functional',
      'organizational': 'Organizational',
      'self-development': 'Self Development',
      'developing-others': 'Developing Others',
    };
    const itemLabelMap: Record<string, string> = {
      'functional': 'Functional KRA',
      'organizational': 'Core Value',
      'self-development': 'Area of Concern',
      'developing-others': 'Person (Developing Others)',
    };
    const itemLabel = itemLabelMap[kraType] || typeMap[kraType] || kraType;

    const notification = new Notification({
      userId,
      type: 'system',
      title: kraType === 'functional' ? 'New KRA Added' : 'New Item Added',
      message: `A new ${itemLabel} has been added to your profile by ${addedBy}. Please review it in your dashboard.`,
      isRead: false,
      metadata: {
        type: 'kra_added',
        kraType,
        addedBy,
      },
    });

    await notification.save();
  } catch (error) {
    console.error('Failed to send KRA notification:', error);
  }
}