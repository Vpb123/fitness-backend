const { Trainer, TrainerRequest, Member, WorkoutPlan, TrainingSession } = require('../models/');
const { status } = require('http-status');
const moment = require('moment');
const dayjs = require('dayjs');
const ApiError = require('../utils/ApiError');
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

  const trainers = await Trainer.paginate(query, options);

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
const getWeekNumberInWorkoutPlan = (planStartDate, sessionDate) => {
  return moment(sessionDate).diff(moment(planStartDate).startOf('day'), 'weeks') + 1;
};

const requestTrainingSession = async (memberId, sessionData) => {
  const member = await Member.findById(memberId);
  if (!member || !member.currentTrainerId) {
    throw new ApiError(status.BAD_REQUEST, 'You are not connected to any trainer');
  }

  if (member.subscriptionStatus !== 'active') {
    throw new ApiError(status.BAD_REQUEST, 'Your subscription is not active');
  }

  const workoutPlan = await WorkoutPlan.findOne({
    memberId,
    trainerId: member.currentTrainerId,
    status: 'active',
  });

  if (!workoutPlan) {
    throw new ApiError(status.BAD_REQUEST, 'No active workout plan with current trainer');
  }

  const sessionDate = moment(sessionData.scheduledDate).startOf('day');
  const planStart = moment(workoutPlan.startDate).startOf('day');
  const planEnd = moment(workoutPlan.endDate).endOf('day');

  if (!sessionDate.isBetween(planStart, planEnd, null, '[]')) {
    throw new ApiError(status.BAD_REQUEST, 'Scheduled date is outside the workout plan range');
  }

  const weekNumber = getWeekNumberInWorkoutPlan(planStart, sessionDate);

  const isValidWeek = workoutPlan.weeklySessions.some((w) => w.weekNumber === weekNumber);
  if (!isValidWeek) {
    throw new ApiError(status.BAD_REQUEST, `Week ${weekNumber} is not defined in the workout plan`);
  }

  const session = await TrainingSession.create({
    memberId,
    trainerId: member.currentTrainerId,
    workoutPlanId: workoutPlan._id,
    weekNumber,
    scheduledDate: sessionDate.toDate(),
    duration: sessionData.duration,
    note: sessionData.note || '',
    sessionType: 'TBD',
    status: 'requested',
  });

  return session;
};

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

  return TrainingSession.find(query).populate('trainerId', 'userId').sort({ scheduledDate: 1 });
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
    .populate('trainerId', 'userId')
    .lean();

  if (!workoutPlan) {
    throw new ApiError(status.NOT_FOUND, 'No active workout plan found');
  }

  const completedCount = await TrainingSession.countDocuments({
    workoutPlanId: workoutPlan._id,
    status: 'completed',
  });

  const baseStartDate = dayjs(workoutPlan.startDate);

  const enhancedWeeklySessions = workoutPlan.weeklySessions.map((session) => {
    const sessionStartDate = baseStartDate.add(session.weekNumber - 1, 'week').startOf('week');
    return {
      ...session,
      startDate: sessionStartDate.toISOString(),
    };
  });

  return {
    ...workoutPlan,
    completedSessions: completedCount,
    weeklySessions: enhancedWeeklySessions,
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

const getUpcomingPendingSessionsGroupedByWeek = async (memberId) => {
  const today = moment().startOf('day');

  const workoutPlan = await WorkoutPlan.findOne({
    memberId,
    status: 'active',
  }).select('weeklySessions startDate refId');

  if (!workoutPlan) return [];

  const startDate = moment(workoutPlan.startDate);

  const weeksSinceStart = today.diff(startDate, 'weeks');

  const upcomingWeeks = workoutPlan.weeklySessions.filter((week) => week.weekNumber > weeksSinceStart);

  const validWeekNumbers = upcomingWeeks.map((w) => w.weekNumber);

  const sessions = await TrainingSession.find({
    memberId,
    status: 'pending',
    scheduledDate: { $gte: today.toDate() },
    weekNumber: { $in: validWeekNumbers },
  })
    .select('weekNumber scheduledDate workoutPlanId')
    .sort({ weekNumber: 1 });

  // 5. Group sessions by weekNumber
  const groupedByWeek = {};
  sessions.forEach((session) => {
    const week = session.weekNumber;
    if (!groupedByWeek[week]) {
      groupedByWeek[week] = [];
    }
    groupedByWeek[week].push({
      _id: session._id,
      scheduledDate: session.scheduledDate,
      status: session.status,
      workoutPlanId: session.workoutPlanId,
    });
  });

  const result = validWeekNumbers.map((weekNumber) => {
    const sessions = groupedByWeek[weekNumber] || [];

    const pendingSessions = sessions.map((session, index) => ({
      sessionNumber: index + 1,
      sessionId: session._id,
      scheduledDate: session.scheduledDate,
      status: session.status,
      workoutPlanId: session.workoutPlanId,
    }));

    return {
      weekNumber,
      pendingSessions,
    };
  });

  return result;
};

const requestPendingSession = async (memberId, { sessionId, scheduledDate, note, type }) => {
  const session = await TrainingSession.findOne({
    _id: sessionId,
    memberId,
    status: 'pending',
  });

  if (!session) {
    throw new ApiError(status.NOT_FOUND, 'Pending session not found or already requested');
  }

  const today = moment().startOf('day');
  const scheduled = moment(scheduledDate).startOf('day');
  if (scheduled.isBefore(today)) {
    throw new ApiError(status.BAD_REQUEST, 'Scheduled date cannot be in the past');
  }

  session.scheduledDate = scheduledDate;
  session.note = note || '';
  session.status = 'requested';
  session.sessionType = type || 'TBD';
  await session.save();

  return session;
};

const getMemberDetails = async (memberId) => {
  const member = await Member.findById(memberId);

  if (!member) {
    throw new ApiError(status.NOT_FOUND, 'Member not found');
  }
  const trainer = await Trainer.findById(member.currentTrainerId).populate('userId');

  if (!trainer) {
    throw new ApiError(status.NOT_FOUND, 'Trainer not found');
  }
  
  return { result: trainer.userId.firstName + ' ' + trainer.userId.lastName, trainerId: member.currentTrainerId};

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
  getUpcomingPendingSessionsGroupedByWeek,
  requestPendingSession,
  getMemberDetails
};
