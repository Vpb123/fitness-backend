const { Trainer , TrainerRequest, Member, workoutPlan, TrainingSession } = require('../models/');
const { status } = require('http-status')
/**
 * Get paginated list of trainers with filters
 * @param {Object} filters
 * @param {Object} options
 * @returns {Promise<Object>} Paginated result
 */
const getAvailableTrainers = async (filters, options) => {
  const query = {};

  if (filters.specialization) {
    query.specializations = filters.specialization;
  }

  if (filters.minExperience) {
    query.experienceYears = { $gte: parseInt(filters.minExperience) };
  }

  if (filters.minRating) {
    query.rating = { $gte: parseFloat(filters.minRating) };
  }

  const trainers = await Trainer.paginate(query, {
    ...options,
    populate: { path: 'userId', select: 'name email' },
    sort: { rating: -1 }, // Optional default sorting
  });

  return trainers;
};



/**
 * Send a trainer request
 * @param {ObjectId} memberId - Logged-in member's userId
 * @param {Object} requestData - trainerId and goalDescription
 * @returns {Promise<TrainerRequest>}
 */
const sendTrainerRequest = async (memberId, requestData) => {
  const { trainerId, goalDescription } = requestData;

  // Check if the member already has a pending/accepted request
  const existingRequest = await TrainerRequest.findOne({
    memberId,
    trainerId,
    status: { $in: ['pending', 'accepted'] },
  });

  if (existingRequest) {
    throw new ApiError(status.BAD_REQUEST, 'You already have a pending or accepted request with this trainer');
  }

  const request = await TrainerRequest.create({
    memberId,
    trainerId,
    goalDescription,
  });

  return request;
};


/**
 * Member requests a session
 * @param {ObjectId} memberId - Logged-in member's user ID
 * @param {Object} sessionData - { scheduledDate, duration }
 * @returns {Promise<Object>}
 */
const requestTrainingSession = async (memberId, sessionData) => {
  const member = await Member.findOne({ userId: memberId });
  if (!member || !member.currentTrainerId) {
    throw new ApiError(status.BAD_REQUEST, 'You are not connected to any trainer');
  }

  if (member.subscriptionStatus !== 'active') {
    throw new ApiError(status.BAD_REQUEST, 'Your subscription is not active');
  }

  const workoutplan = await workoutPlan.findOne({
    memberId,
    trainerId: member.currentTrainerId,
    status: 'active',
  });

  if (!workoutplan) {
    throw new ApiError(status.BAD_REQUEST, 'No active workout plan with current trainer');
  }

  const weekNumber = getWeekNumberInWorkoutPlan(workoutplan.startDate, sessionData.scheduledDate);

  const session = await TrainingSession.create({
    memberId,
    trainerId: member.currentTrainerId,
    workoutPlanId: workoutplan._id,
    weekNumber,
    scheduledDate: sessionData.scheduledDate,
    duration: sessionData.duration,
    status: 'requested',
  });

  return session;
};


function getWeekNumberInWorkoutPlan(startDate, targetDate) {
  const msInDay = 1000 * 60 * 60 * 24;
  const diffInDays = Math.floor((new Date(targetDate) - new Date(startDate)) / msInDay);
  return Math.floor(diffInDays / 7) + 1;
}

const getSessionHistory = async (memberId) => {
    return TrainingSession.find({
      memberId,
      status: 'completed',
    })
      .populate('trainerId', 'userId')
      .sort({ scheduledDate: -1 });
  };

const getUpcomingSessions = async (memberId, statusFilter) => {
    const query = {
      memberId,
      status: { $in: ['requested', 'scheduled'] },
    };
  
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter;
    }
  
    return TrainingSession.find(query)
      .populate('trainerId', 'userId')
      .sort({ scheduledDate: 1 });
  };
  
const cancelSession = async (memberId, sessionId) => {
    const session = await TrainingSession.findById(sessionId);
    if (!session) {
      throw new ApiError(status.NOT_FOUND, 'Session not found');
    }
  
    if (session.memberId.toString() !== memberId.toString()) {
      throw new ApiError(status.FORBIDDEN, 'You are not allowed to cancel this session');
    }
  
    if (!['requested', 'scheduled'].includes(session.status)) {
      throw new ApiError(status.BAD_REQUEST, 'Only requested or scheduled sessions can be cancelled');
    }
  
    session.status = 'cancelled';
    await session.save();
  
    return session;
  };
  
  const getSessionProgress = async (memberId, period) => {
    const now = new Date();
    let startDate;
  
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case 'live':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0); // Start of today
        break;
      default:
        throw new ApiError(status.BAD_REQUEST, 'Invalid period. Use "week", "month", or "live".');
    }
  
    const sessions = await TrainingSession.find({
      memberId,
      status: 'completed',
      updatedAt: { $gte: startDate, $lte: now },
    });
  
    const totalHours = sessions.reduce((sum, session) => sum + (session.actualHoursSpent || 0), 0);
  
    return {
      period,
      totalHours,
      sessionCount: sessions.length,
    };
  };

const getWorkoutPlan = async (memberId) => {
    const workoutPlan = await WorkoutPlan.findOne({
      memberId,
      status: 'active',
    })
      .populate('trainerId', 'userId') // populate trainer basic info
      .lean();
  
    if (!workoutPlan) {
      throw new ApiError(status.NOT_FOUND, 'No active workout plan found');
    }
  
    // Count completed sessions under this plan
    const completedCount = await TrainingSession.countDocuments({
      workoutPlanId: workoutPlan._id,
      status: 'completed',
    });
  
    return {
      ...workoutPlan,
      completedSessions: completedCount,
    };
  };
  
  const leaveTrainerReview = async (memberId, reviewData) => {
    const { trainerId, rating, comment } = reviewData;
  
    const existingReview = await TrainerReview.findOne({ trainerId, memberId });
    if (existingReview) {
      throw new ApiError(status.BAD_REQUEST, 'You have already reviewed this trainer');
    }
  
    const review = await TrainerReview.create({
      trainerId,
      memberId,
      rating,
      comment,
    });
  
    return review;
  };

module.exports = {
    getAvailableTrainers,
    sendTrainerRequest,
    requestTrainingSession,
    getSessionHistory,
    getUpcomingSessions,
    cancelSession,
    getSessionProgress,
    getWorkoutPlan,
    leaveTrainerReview,
}
