const {notificationService} = require('../services');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { status } = require('http-status');


const markAsRead = catchAsync(async (req, res) => {
  const { notificationId } = req.params;

  const updatedNotification = await notificationService.markAsRead(notificationId);
  res.status(status.OK).send(updatedNotification);
});


const clearAllForUser = catchAsync(async (req, res) => {
  const userId = req.user._id; 

  const result = await notificationService.clearAllForUser(userId);
  res.status(status.OK).send(result);
});


const deleteNotification = catchAsync(async (req, res) => {
  const { notificationId } = req.params;

  const result = await notificationService.deleteNotification(notificationId);
  res.status(status.OK).send(result);
});


const getNotificationsForUser = catchAsync(async (req, res) => {
  const userId = req.user._id; 

  const notifications = await notificationService.getNotificationsForUser(userId);
  res.status(status.OK).send(notifications);
});

module.exports = {
  markAsRead,
  clearAllForUser,
  deleteNotification,
  getNotificationsForUser,
};
