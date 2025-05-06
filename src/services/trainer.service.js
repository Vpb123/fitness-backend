const { status } = require("http-status");
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { Member, TrainerRequest, Trainer, TrainingSession, WorkoutPlan } = require('../models');
const { isTrainerAvailable, getTrainerAvailabilityForDate } = require('../utils/trainerAvailibility');
const { createNotification } = require('./notification.service');
const moment = require('moment');
/**
 * Get all members assigned to a trainer
 * @param {ObjectId} trainerId - Trainer's ID
 * @returns {Promise<Array>}
 */
const getTrainerMembers = async (trainerId, memberId = null) => {

  const trainer = await Trainer.findOne({ _id: trainerId });
  if (!trainer) {
    throw new ApiError(status.NOT_FOUND, 'Trainer not found');
  }
  let members = []
  if (memberId !== null) {
    const member = await Member.findOne({ _id: memberId }).populate('userId', 'firstName lastName email profilephoto');
    members.push(member)

  } else {
    members = await Member.find({ currentTrainerId: trainerId }).populate('userId', 'firstName lastName email profilephoto');
  }

  const result = await Promise.all(
    members.map(async (member, index) => {
      const memberId = member._id;
      const workoutPlan = await WorkoutPlan.findOne({ memberId, trainerId }).select('_id').lean();
      const acceptedRequest = await TrainerRequest.findOne({
        memberId,
        trainerId,
        status: 'accepted',
      }).sort({ updatedAt: -1 });

      const joined = acceptedRequest?.updatedAt ?? member.createdAt;

      const [totalSessions, completedSessions] = await Promise.all([
        TrainingSession.countDocuments({ memberId, trainerId }),
        TrainingSession.countDocuments({ memberId, trainerId, status: 'completed' }),
      ]);

      const progress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      return {
        id: index + 1,
        _id: member._id,
        workoutPlanId: workoutPlan?._id || null,
        user: {
          name: `${member.userId.firstName} ${member.userId.lastName}`,
          email: member.userId.email,
          avatar: member.userId.profilephoto || 'https://i.pravatar.cc/150?img=1',
        },
        age: member.age,
        weight: member.weight,
        height: member.height,
        joined,
        progress,
      };
    })
  );

  return result;

};

const getPendingMemberRequests = async (trainerId) => {
  const requests = await TrainerRequest.find({ trainerId, status: 'pending' }).populate({
    path: 'memberId',
    select: 'age height weight userId',
    populate: {
      path: 'userId',
      select: 'firstName lastName email profilePhoto',
    },
  })
    .lean();

  const enrichedRequests = requests.map((req) => ({
    ...req,
    timeAgo: moment(req.createdAt).fromNow(),
  }));

  return enrichedRequests;
};

/**
 * Respond to a member's trainer request
 * @param {ObjectId} trainerId - Trainer's ID
 * @param {ObjectId} requestId - Request ID
 * @param {String} action - "accept", "reject", or "suggest"
 * @param {ObjectId} [alternativeTrainerId] - Alternative trainer (if suggesting)
 * @returns {Promise<Object>}
 */
const respondToMemberRequest = async (trainerId, requestId, action, alternativeTrainerId = null) => {
  const request = await TrainerRequest.findById(requestId).populate('memberId', 'userId');
  if (!request) {
    throw new ApiError(status.NOT_FOUND, 'Request not found');
  }
  if (request.status !== 'pending') {
    throw new ApiError(status.BAD_REQUEST, 'Request has already been processed');
  }
  const trainer = await Trainer.findById(trainerId).populate('userId', 'firstName lastName');
  if (!trainer) {
    throw new ApiError(status.NOT_FOUND, 'Trainer not found');
  }
  const trainerName = `${trainer.userId.firstName} ${trainer.userId.lastName}`;

  let message = '';
  if (action === 'accept') {
    await Member.findOneAndUpdate(
      { _id: request.memberId },
      { currentTrainerId: trainerId },
      { new: true }
    );

    request.status = 'accepted';
    message = `Your connection request has been accepted by ${trainerName}.`;
  } else if (action === 'reject') {
    request.status = 'rejected';
    message = `Your trainer connection request has been rejected by ${trainerName}.`;
  } else if (action === 'suggest') {
    if (!alternativeTrainerId) {
      throw new ApiError(status.BAD_REQUEST, 'Alternative trainer ID is required for suggestion');
    }
    const alternativeTrainer = await Trainer.findOne({ _id: alternativeTrainerId });
    if (!alternativeTrainer) {
      throw new ApiError(status.NOT_FOUND, 'Alternative trainer not found');
    }
    request.status = 'suggested';
    request.alternativeTrainerId = alternativeTrainerId;
    const suggestedTrainerName = `${alternativeTrainer.userId.firstName} ${alternativeTrainer.userId.lastName}`;
    message = `${trainerName} suggested your trainer connection request to ${suggestedTrainerName}.`;
  } else {
    throw new ApiError(status.BAD_REQUEST, 'Invalid action');
  }

  await request.save();

  await createNotification({
    userId: request.memberId.userId,
    message,
    type: 'request_response',
  });

  return request;
};

const createWorkoutPlan = async (trainerId, memberId, workoutData) => {
  const trainer = await Trainer.findOne({ _id: trainerId }).populate('userId', 'firstName lastName');
  if (!trainer) {
    throw new ApiError(status.NOT_FOUND, 'Trainer not found');
  }

  const member = await Member.findById(memberId).populate('userId').select('currentTrainerId');
  if (!member) {
    throw new ApiError(status.NOT_FOUND, 'Member not found');
  }

  if (member.currentTrainerId?.toString() !== trainerId.toString()) {
    throw new ApiError(status.FORBIDDEN, 'You are not assigned to this member');
  }

  if (new Date(workoutData.startDate) >= new Date(workoutData.endDate)) {
    throw new ApiError(status.BAD_REQUEST, 'Start date must be before end date');
  }

  if (!Array.isArray(workoutData.weeklySessions) || workoutData.weeklySessions.length === 0) {
    throw new ApiError(status.BAD_REQUEST, 'Weekly sessions data is required');
  }

  const totalWeeks = moment(workoutData.endDate).diff(moment(workoutData.startDate), 'weeks') + 1;

  if (workoutData.weeklySessions.length !== totalWeeks) {
    throw new ApiError(status.BAD_REQUEST, 'Weekly session count must match total weeks in the plan');
  }

  const workoutPlan = await WorkoutPlan.create({
    trainerId,
    memberId,
    goal: workoutData.goal,
    startDate: workoutData.startDate,
    endDate: workoutData.endDate,
    weeklySessions: workoutData.weeklySessions,
    status: 'active',
  });

  const sessionsToCreate = [];
  const baseStartDate = moment(workoutData.startDate);

  for (const [index, week] of workoutData.weeklySessions.entries()) {
    const weekStart = baseStartDate.clone().add(index, 'weeks');

    if (week.scheduleNow && Array.isArray(week.sessions)) {
      if (week.sessions.length !== week.sessionCount) {
        throw new ApiError(
          status.BAD_REQUEST,
          `Week ${index + 1} session count mismatch with provided sessions`
        );
      }

      week.sessions.forEach((sesh) => {
        sessionsToCreate.push({
          memberId,
          trainerId,
          workoutPlanId: workoutPlan._id,
          weekNumber: index + 1,
          scheduledDate: sesh.date,
          duration: sesh.duration,
          note: sesh.note,
          sessionType: sesh.sessionType,
          status: 'scheduled',
        });
      });
    } else {

      let scheduledCount = 0;
      let checkDate = weekStart.clone();
      let forceSchedule = false;

      while (scheduledCount < week.sessionCount) {
        let slot;
        if (!forceSchedule) {
          const availableSlots = await getTrainerAvailabilityForDate(
            trainerId,
            checkDate.format("YYYY-MM-DD") 
          );
          if (availableSlots.length > 0) {
            slot = availableSlots[0];
          }
        }

        if (slot) {
          const scheduledDate = moment(
            `${checkDate.format("YYYY-MM-DD")} ${slot.startTime}`,
            "YYYY-MM-DD HH:mm"
          );

          sessionsToCreate.push({
            memberId,
            trainerId,
            workoutPlanId: workoutPlan._id,
            weekNumber: index + 1,
            scheduledDate: scheduledDate.format("YYYY-MM-DD HH:mm"),
            duration: 1,
            note: '',
            sessionType: 'TBD',
            status: 'pending',
          });

          scheduledCount++;
          checkDate.add(1, 'day');
        } else {
          if (!forceSchedule && checkDate.isSameOrAfter(weekStart.clone().add(6, 'days'))) {
            forceSchedule = true;
            checkDate = weekStart.clone();
            continue;
          }

          if (forceSchedule) {
            const fallbackDate = checkDate.clone().hour(0).minute(0);
            sessionsToCreate.push({
              memberId,
              trainerId,
              workoutPlanId: workoutPlan._id,
              weekNumber: index + 1,
              scheduledDate: fallbackDate.format("YYYY-MM-DD HH:mm"),
              duration: 1,
              note: '',
              sessionType: week.sessionType,
              status: 'pending',
            });

            scheduledCount++;
            checkDate.add(1, 'day');
          } else {
            checkDate.add(1, 'day');
          }
        }
      }

    }
  }

  await TrainingSession.insertMany(sessionsToCreate);
  const trainerName = `${trainer.userId.firstName} ${trainer.userId.lastName}`;

  await createNotification({
    userId: member.userId,
    message: `Your workout plan has been created by ${trainerName}.`,
    type: 'workout_plan_created',
  });

  return { workoutPlan, sessions: sessionsToCreate };
};


/**
* Delete a training session
* @param {ObjectId} trainerId - Trainer's ID
* @param {ObjectId} sessionId - Session ID
* @returns {Promise<Object>}
*/
const deleteSession = async (trainerId, sessionId) => {
  const session = await TrainingSession.findById(sessionId).populate('memberId', 'userId');;
  if (!session) {
    throw new ApiError(status.NOT_FOUND, 'Session not found');
  }
  if (session.trainerId.toString() !== trainerId.toString()) {
    throw new ApiError(status.FORBIDDEN, 'You are not authorized to delete this session');
  }

  await createNotification({
    userId: session.memberId.userId,
    message: `Your ${session.status} training session has been cancelled by your trainer.`,
    type: 'trainer_cancelled_session',
  });

  await TrainingSession.findByIdAndDelete(sessionId);
  return { message: 'Session deleted successfully' };
};

const updateSession = async (trainerId, sessionId, updateData) => {
  const session = await TrainingSession.findById(sessionId).populate('memberId', 'userId');

  if (!session) {
    throw new ApiError(status.NOT_FOUND, 'Session not found');
  }
  if (session.trainerId.toString() !== trainerId.toString()) {
    throw new ApiError(status.FORBIDDEN, 'You are not authorized to edit this session');
  }


  const newDate = updateData.scheduledDate || session.scheduledDate;
  const newDuration = updateData.duration || session.duration;

  const isAvailable = await isTrainerAvailable(trainerId, new Date(newDate), newDuration);
  if (!isAvailable) throw new ApiError(status.BAD_REQUEST, 'Trainer is not available at this time');


  Object.assign(session, updateData);
  await session.save();

  await createNotification({
    userId: session.memberId.userId,
    message: 'Your training session has been updated.',
    type: 'session_updated',
  });

  return session;
};

const createSession = async (trainerId, memberId, sessionData) => {
  const { scheduledDate, duration, weekNumber } = sessionData;

 
  const available = await isTrainerAvailable(trainerId, scheduledDate, duration);
  if (!available) {
    throw new ApiError(status.BAD_REQUEST, 'Trainer is not available at this time');
  }

  const newSession = await TrainingSession.create({
    memberId,
    trainerId,
    workoutPlanId: sessionData.workoutPlanId,
    weekNumber,
    status: 'scheduled',
    scheduledDate,
    duration,
  });

  const member = await Member.findById(memberId).select('userId');

  await createNotification({
    userId: member.userId,
    message: 'A new training session has been scheduled for you.',
    type: 'session_created',
  });

  return newSession;
};

const respondToSessionRequest = async (trainerId, sessionId, action) => {
  const session = await TrainingSession.findById(sessionId).populate('memberId', 'userId');;
  if (!session) {
    throw new ApiError(status.NOT_FOUND, 'Session not found');
  }
  if (session.trainerId.toString() !== trainerId.toString()) {
    throw new ApiError(status.FORBIDDEN, 'You are not authorized to respond to this session');
  }
  if (session.status !== 'requested') {
    throw new ApiError(status.BAD_REQUEST, 'Session request is already processed');
  }
  console.log("date::", session.scheduledDate);
  if (action === 'approve') {
    const isAvailable = await isTrainerAvailable(trainerId, new Date(session.scheduledDate), session.duration);
    if (!isAvailable) throw new ApiError(status.BAD_REQUEST, 'You are not available at this time');

    session.status = 'scheduled';

  } else if (action === 'reject') {
    session.status = 'cancelled';

  } else {
    throw new ApiError(status.BAD_REQUEST, 'Invalid action. Use "approve" or "reject".');
  }

  await session.save();

  await createNotification({
    userId: session.memberId.userId,
    message: `Your session request has been ${action === 'approve' ? 'approved' : 'cancelled'}.`,
    type: 'session_request_response',
  });

  return session;
};

/**
* Get all pending session requests for a trainer
* @param {ObjectId} trainerId - Trainer's ID
* @returns {Promise<Array>}
*/
const getPendingSessionRequests = async (trainerId) => {
  const requests = await TrainingSession.find({
    trainerId,
    status: 'requested',
  })
    .populate({
      path: 'memberId',
      select: 'userId',
      populate: {
        path: 'userId', 
        select: 'firstName lastName email',
      },
    })
    .sort({ scheduledDate: 1 });

  return requests;
};

const getAllsessions = async (trainerId, type = null) => {
  const today = new Date();
  let query = { trainerId };

  if (type === 'upcoming') {
    query.scheduledDate = { $gte: today };
  }

  const requests = await TrainingSession.find(query)
    .populate('workoutPlanId', 'refId')
    .populate({
      path: 'memberId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email',
      },
    })
    .sort({ scheduledDate: 1 })
    .limit(type === 'upcoming' ? 10 : 0);

  return requests;
};

const completeSession = async (trainerId, sessionId, completionData) => {
  const session = await TrainingSession.findById(sessionId);
  if (!session) {
    throw new ApiError(status.NOT_FOUND, 'Session not found');
  }
  if (session.trainerId.toString() !== trainerId.toString()) {
    throw new ApiError(status.FORBIDDEN, 'You are not authorized to update this session');
  }
  if (session.status !== 'scheduled') {
    throw new ApiError(status.BAD_REQUEST, 'Only scheduled sessions can be marked as completed');
  }

  session.status = 'completed';
  session.actualHoursSpent = completionData.actualHoursSpent || session.duration;
  session.notes = completionData.notes || '';
  session.attended = completionData.attended || false;
  await session.save();
  return session;
};

const cancelSession = async (trainerId, sessionId) => {
  const session = await TrainingSession.findById(sessionId).populate('memberId', 'userId');;
  if (!session) {
    throw new ApiError(status.NOT_FOUND, 'Session not found');
  }

  if (session.status !== 'scheduled') {
    throw new ApiError(status.BAD_REQUEST, 'Only scheduled sessions can be cancelled');
  }

  session.status = 'cancelled';
  await session.save();

  await createNotification({
    userId: session.memberId.userId,
    message: 'Your scheduled training session has been cancelled by your trainer.',
    type: 'trainer_cancelled_session',
  });

  return session;
};

const getSessionsByFilters = async (filters) => {
  return await TrainingSession.find(filters)
    .populate('workoutPlanId', 'refId')
    .populate({
      path: 'memberId',
      select: 'userId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email',
      },
    })
    .sort({ scheduledDate: 1 });
};

const updateAvailability = async (trainerId, availabilityByDateArray, availabilityRecurringArray) => {
  console.log("trainerId", trainerId);
  const trainer = await Trainer.findOneAndUpdate(
    { _id: trainerId },
    {
      availabilityByDate: availabilityByDateArray,
      availabilityRecurring: availabilityRecurringArray,
    },
    { new: true }
  );

  if (!trainer) {
    throw new ApiError(status.NOT_FOUND, 'Trainer not found');
  }

  return trainer;

  if (!trainer) {
    throw new ApiError(status.NOT_FOUND, 'Trainer not found');
  }

  return trainer;
};

const getAllTrainers = async () => {
  const trainers = await Trainer.find({}).populate('userId', 'firstName lastName email profilePhoto');
  return trainers;
};

const getMyAvailability = async (trainerId) => {
  const trainer = await Trainer.findById(trainerId);
  if (!trainer) {
    throw new ApiError(status.NOT_FOUND, 'Trainer not found');
  }
  const availability = {};
  for (const entry of trainer.availabilityByDate || []) {
    availability[entry.date] = entry.slots.map(({ startTime, endTime }) => ({ startTime, endTime }));
  }

  const recurringAvailability = {};
  for (const entry of trainer.availabilityRecurring || []) {
    recurringAvailability[entry.dayOfWeek] = entry.slots.map(({ startTime, endTime }) => ({ startTime, endTime }));
  }
  return { availability, recurringAvailability };
};

const getTrainerStats = async (trainerId) => {

  const connectedMembersCount = await Member.countDocuments({ currentTrainerId: trainerId });

  const pendingConnectionsCount = await TrainerRequest.countDocuments({ trainerId, status: 'pending' });

  const pendingRequestsCount = await TrainingSession.countDocuments({
    trainerId,
    status: { $in: ['requested', 'pending'] },
  });

  const result = await TrainingSession.aggregate([
    { $match: { trainerId: new mongoose.Types.ObjectId(trainerId), status: 'completed' } },
    { $group: { _id: null, totalHours: { $sum: '$actualHoursSpent' } } },
  ]);

  const totalHoursSpent = result.length > 0 ? result[0].totalHours : 0;

  return {
    connectedMembers: connectedMembersCount,
    pendingConnections: pendingConnectionsCount,
    pendingRequests: pendingRequestsCount,
    totalHoursSpent,
  };

};

const getTrainerSessionStats = async (trainerId) => {
  const sessions = await TrainingSession.aggregate([
    {
      $match: {
        trainerId: new mongoose.Types.ObjectId(trainerId),
        status: 'completed',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$scheduledDate" },
        },
        sessions: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        sessions: 1,
      },
    },
  ]);

  return sessions;
};

module.exports = {
  getTrainerMembers,
  getPendingMemberRequests,
  respondToMemberRequest,
  createWorkoutPlan,
  updateSession,
  deleteSession,
  createSession,
  respondToSessionRequest,
  getPendingSessionRequests,
  completeSession,
  cancelSession,
  getSessionsByFilters,
  getAllsessions,
  updateAvailability,
  getAllTrainers,
  getMyAvailability,
  getTrainerStats,
  getTrainerSessionStats
};
