const { User, Member, Trainer, TrainingCenter } = require('../models');
const mongoose = require('mongoose');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Europe/London');

const { createNotification } = require('./notification.service')
const getAllUsers = async () => {
  const users = await User.find({ isDeleted: { $ne: true }, role: { $ne: 'admin' } }).lean();

  const existingUsers = [];
  const requestedUsers = [];
  let index = 1;

  for (const user of users) {
    const enrichedUser = {
      ...user,
      name: `${user.firstName} ${user.lastName}`,
      id: index,
    };

    if (user.role === 'member') {
      const member = await Member.findOne({ userId: user._id }).populate('currentTrainerId', 'userId');
      if (member) {
        enrichedUser.age =  member.age
        enrichedUser.weight = member.weight
        enrichedUser.height = member.height 
        if (member.currentTrainerId) {
          const trainerUser = await User.findById(member.currentTrainerId.userId);
          enrichedUser.currentTrainerName = trainerUser
            ? `${trainerUser.firstName} ${trainerUser.lastName}`
            : null;

          const center = await TrainingCenter.findOne({ trainers: member.currentTrainerId.userId }).select('name');
          enrichedUser.trainingCenterName = center?.name || null;
        }
      }
    }

    if (user.role === 'trainer') {
      const trainer = await Trainer.findOne({ userId: user._id });
      if (trainer) {
        enrichedUser.memberCount = await Member.countDocuments({ currentTrainerId: trainer._id });
        enrichedUser.speciality = trainer.specializations.join(', ') || '';
        const center = await TrainingCenter.findOne({ trainers: user._id }).select('name');
        enrichedUser.trainingCenterName = center?.name || null;
      }
    }

    if (user.isApproved) {
      existingUsers.push(enrichedUser);
    } else {
      requestedUsers.push(enrichedUser);
    }

    index += 1;
  }

  return { existingUsers, requestedUsers };
};


const getMonthlyGrowthStats = async () => {
 const startOfYear = dayjs().startOf('year').toDate();
const endOfYear = dayjs().endOf('year').toDate();

  const baseMatch = {
    createdAt: { $gte: startOfYear, $lte: endOfYear },
    isDeleted: { $ne: true },
    isApproved: true,
  };

  const [members, trainers] = await Promise.all([
    User.aggregate([
      { $match: { ...baseMatch, role: 'member' } },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
    ]),
    User.aggregate([
      { $match: { ...baseMatch, role: 'trainer' } },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Initialize counts for 12 months
  const membersData = Array(12).fill(0);
  const trainersData = Array(12).fill(0);

  members.forEach((m) => {
    membersData[m._id - 1] = m.count;
  });
  trainers.forEach((t) => {
    trainersData[t._id - 1] = t.count;
  });

  return {
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
    members: membersData,
    trainers: trainersData,
  };
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
     await createNotification({
        userId:userId ,
        message: `Account approved by Admin`,
        type: 'general',
      });
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
  const oneWeekAgo = dayjs().subtract(7, 'day').toDate();

  // Current counts
  const [totalMembers, totalTrainers, pendingApprovals, totalCenters] = await Promise.all([
    User.countDocuments({ role: 'member', isDeleted: { $ne: true }, isApproved: true }),
    User.countDocuments({ role: 'trainer', isDeleted: { $ne: true }, isApproved: true }),
    User.countDocuments({ isDeleted: false, isApproved: false }),
    TrainingCenter.countDocuments({ isDeleted: { $ne: true } }),
  ]);

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
    const centers = await TrainingCenter.find().populate('trainers', '_id').lean();
    return centers.map((center, index) => ({
      ...center,
      id:index+1,
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
     await createNotification({
        userId:trainerId ,
        message: `New Training center assigned by Admin`,
        type: 'center_assigned',
      });

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
  createTrainingCenter,
  getMonthlyGrowthStats
};
