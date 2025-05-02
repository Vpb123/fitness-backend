const catchAsync = require('../utils/catchAsync');
const adminService = require('../services/admin.service');
const { status } = require('http-status');

const getAllUsers = catchAsync(async (req, res) => {
  const { existingUsers, requestedUsers } = await adminService.getAllUsers();

  res.status(200).json({
    existingUsers,
    requestedUsers,
  });
});


const approveOrDeclineUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { action } = req.body;

  if (!['approve', 'decline'].includes(action)) {
    return res.status(status.BAD_REQUEST).json({ message: 'Invalid action' });
  }

  const result = await adminService.approveOrDeclineUser(userId, action);
  res.status(status.OK).json(result);
});

const getStats = catchAsync(async (req, res) => {
    const stats = await adminService.getAdminStats();
  
    res.status(200).json({
      message: 'Admin stats fetched successfully',
      stats,
    });
  });

  const getTrainingCenters = catchAsync(async (req, res) => {
    const centers = await adminService.getAllTrainingCenters();
    res.status(200).json({ centers });
  });

  const assignTrainer = catchAsync(async (req, res) => {
    const { centerId, trainerId } = req.body;
    const updatedCenter = await adminService.assignTrainerToCenter(centerId, trainerId);
    res.status(200).json({ message: 'Trainer assigned to center', center: updatedCenter });
  });
  
  const editTrainingCenter = catchAsync(async (req, res) => {
    const { centerId } = req.params;
    const updated = await adminService.updateTrainingCenter(centerId, req.body);
    res.status(200).json({ message: 'Training center updated', center: updated });
  });

  const addTrainingCenter = catchAsync(async (req, res) => {
    const newCenter = await adminService.createTrainingCenter(req.body);
    res.status(201).json({ message: 'Training center created successfully', center: newCenter });
  });
  
module.exports = {
  getAllUsers,
  approveOrDeclineUser,
  getTrainingCenters,
  getStats,
  assignTrainer,
  addTrainingCenter,
  editTrainingCenter
};
