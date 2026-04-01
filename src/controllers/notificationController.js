// controllers/notificationController.js
import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  const userId = req.user.userId;

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(notifications);
};

export const getUnreadCount = async (req, res) => {
  const userId = req.user.userId;

  const count = await Notification.countDocuments({
    userId,
    isRead: false,
  });

  res.json({ count });
};

export const markAsRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, {
    isRead: true,
  });

  res.json({ success: true });
};
export const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.userId, isRead: false },
    { isRead: true },
  );

  res.json({ success: true });
};
