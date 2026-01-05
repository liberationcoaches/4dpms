import { Router } from 'express';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
} from '../controllers/notificationController';

const router = Router();

router.get('/', getUserNotifications);
router.get('/count', getUnreadNotificationCount);
router.post('/', createNotification);
router.put('/:notificationId/read', markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);

export default router;

