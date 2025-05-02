const express = require('express');
const adminController = require('../../controllers/admin.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/users', auth('admin'), adminController.getAllUsers);

router.post('/users/:userId/approval', auth('admin'), adminController.approveOrDeclineUser);
router.get('/stats', auth('admin'), adminController.getStats);
router.get('/training-centers', auth('admin'), adminController.getTrainingCenters);
router.post('/training-centers', auth('admin'), adminController.addTrainingCenter);
router.put('/training-centers/:centerId', auth('admin'), adminController.editTrainingCenter);
router.post('/training-centers/assign-trainer', auth('admin'), adminController.assignTrainer);

module.exports = router;
