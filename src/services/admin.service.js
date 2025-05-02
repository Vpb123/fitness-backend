const { User, Member, Trainer, TrainingCenter } = require('../models');
const mongoose = require('mongoose');
const moment = require('moment');

const getAllUsers = async () => {
  const users = await User.find({ isDeleted: { $ne: true }, role: { $ne: 'admin' } }).lean();

  const existingUsers = [];
  const requestedUsers = [];
  let index=1
  for (const user of users) {
    const enrichedUser = { ...user, name: `${user.firstName} ${user.lastName}`, id:index};

    if (user.role === 'member') {
      const member = await Member.findOne({ userId: user._id }).populate('currentTrainerId', 'userId');
      if (member) {
        enrichedUser.memberDetails = {
          age: member.age,
          height: member.height,
          weight: member.weight,
        };

        if (member.currentTrainerId) {
          // Get trainer user name
          const trainerUser = await User.findById(member.currentTrainerId.userId);
          enrichedUser.currentTrainerName = trainerUser
            ? `${trainerUser.firstName} ${trainerUser.lastName}`
            : null;

          // Get training center of trainer
          const center = await TrainingCenter.findOne({ trainers: member.currentTrainerId._id }).select('name');
          enrichedUser.trainingCenterName = center?.name || null;
        }
      }
    }

    if (user.role === 'trainer') {
      const trainer = await Trainer.findOne({ userId: user._id })
        .populate('trainingCenter', 'name');

      if (trainer) {
        const memberCount = await Member.countDocuments({ currentTrainerId: trainer._id });
        enrichedUser.memberCount = memberCount;
        enrichedUser.specialty = trainer.specialty || '';
        enrichedUser.trainingCenterName = trainer.trainingCenter?.name || null;
      }
    }

    if (user.isApproved) {
      existingUsers.push(enrichedUser);
    } else {
      requestedUsers.push(enrichedUser);
    }
    index+=1;
  }

  return { existingUsers, requestedUsers };
};


const approveOrDeclineUser = async (userId, action) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(status.NOT_FOUND, 'User not found or already removed');
  }

  if (user.isApproved && action === 'approve') {
    throw new ApiError(status.BAD_REQUEST, 'User is already approved');
  }

  if (action === 'approve') {
    user.isApproved = true;
    await user.save();
    return { message: 'User approved successfully' };
  }

  if (action === 'decline') {
    user.isDeleted = true;
    await user.save();
    return { message: 'User declined and marked as deleted' };
  }

  throw new ApiError(status.BAD_REQUEST, 'Invalid action');
};

const getAdminStats = async () => {
  const oneWeekAgo = moment().subtract(7, 'days').toDate();

  // Current counts
  const [totalMembers, totalTrainers, pendingApprovals, totalCenters] = await Promise.all([
    User.countDocuments({ role: 'member', isDeleted: { $ne: true }, isApproved: true }),
    User.countDocuments({ role: 'trainer', isDeleted: { $ne: true }, isApproved: true }),
    User.countDocuments({ isDeleted: { $ne: true }, isApproved: false }),
    TrainingCenter.countDocuments({ isDeleted: { $ne: true } }),
  ]);

  // Previous week counts
  const [membersLastWeek, trainersLastWeek] = await Promise.all([
    User.countDocuments({
      role: 'member',
      isDeleted: { $ne: true },
      isApproved: true,
      createdAt: { $lt: oneWeekAgo },
    }),
    User.countDocuments({
      role: 'trainer',
      isDeleted: { $ne: true },
      isApproved: true,
      createdAt: { $lt: oneWeekAgo },
    }),
  ]);

  return {
    totalMembers,
    totalTrainers,
    pendingApprovals,
    totalCenters,
    memberDelta: totalMembers - membersLastWeek,
    trainerDelta: totalTrainers - trainersLastWeek,
  };
};

const getAllTrainingCenters = async () => {
    const centers = await TrainingCenter.find().populate('trainers', 'userId').lean();
  
    return centers.map(center => ({
      ...center,
      trainerCount: center.trainers?.length || 0,
    }));
  };

  const assignTrainerToCenter = async (centerId, trainerId) => {
    const center = await TrainingCenter.findById(centerId);
    if (!center) throw new ApiError(404, 'Training center not found');
    if (!center.trainers.includes(trainerId)) {
      center.trainers.push(trainerId);
      await center.save();
    }
    return center;
  };
  
  const updateTrainingCenter = async (centerId, updateData) => {
    const updated = await TrainingCenter.findByIdAndUpdate(centerId, updateData, { new: true });
    if (!updated) throw new ApiError(404, 'Training center not found');
    return updated;
  };
  const createTrainingCenter = async (data) => {
    const center = await TrainingCenter.create(data);
    return center;
  };
    
module.exports = {
  getAllUsers,
  approveOrDeclineUser,
  getAdminStats,
  assignTrainerToCenter,
  getAllTrainingCenters,
  updateTrainingCenter,
  createTrainingCenter
};
