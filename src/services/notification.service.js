const Notification = require('../models/notification.model');

const createNotification = async ({ userId, message, type, link }) => {
  if (!userId || !message || !type) {
    throw new Error('Missing required notification fields');
  }

  const notification = await Notification.create({
    userId,
    message,
    type,
    link: link || null,
  });

  return notification;
};


const markAsRead = async (notificationId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new Error('Notification not found');
  }

  notification.status = 'read';
  await notification.save();

  return notification;
};


const clearAllForUser = async (userId) => {
  await Notification.deleteMany({ userId });
  return { message: 'All notifications cleared for the user' };
};


const deleteNotification = async (notificationId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new Error('Notification not found');
  }

  await notification.deleteOne();
  return { message: 'Notification deleted successfully' };
};


const getNotificationsForUser = async (userId) => {
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 });
  return notifications;
};

module.exports = {
  createNotification,
  markAsRead,
  clearAllForUser,
  deleteNotification,
  getNotificationsForUser,
};
