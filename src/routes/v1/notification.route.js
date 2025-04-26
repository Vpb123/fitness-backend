const express = require('express');
const auth = require('../../middlewares/auth'); 
const notificationController = require('../../controllers/notification.controller');

const router = express.Router();

router.get('/', auth(), notificationController.getNotificationsForUser);

router.patch('/:notificationId/read', auth(), notificationController.markAsRead);

router.delete('/:notificationId', auth(), notificationController.deleteNotification);

router.delete('/clear-all', auth(), notificationController.clearAllForUser);

module.exports = router;
