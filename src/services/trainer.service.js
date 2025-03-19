const { status } = require("http-status");
const ApiError = require('../utils/ApiError');
const { Member, TrainerRequest, Trainer, TrainingSession } = require('../models');

/**
 * Get all members assigned to a trainer
 * @param {ObjectId} trainerId - Trainer's ID
 * @returns {Promise<Array>}
 */
const getTrainerMembers = async (trainerId) => {
  // Fetch trainer profile to ensure trainer exists
  const trainer = await Trainer.findOne({ userId: trainerId });
  if (!trainer) {
    throw new ApiError(status.NOT_FOUND, 'Trainer not found');
  }

  const members = await Member.find({ currentTrainerId: trainerId }).populate('userId', 'name email');

  return members;
};

const getPendingMemberRequests = async (trainerId) => {
    
    const requests = await TrainerRequest.find({ trainerId, status: 'pending' })
      .populate('memberId', 'name email') 
      .populate('trainerId', 'name');
  
    return requests;
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
    const request = await TrainerRequest.findById(requestId);
    if (!request) {
      throw new ApiError(status.NOT_FOUND, 'Request not found');
    }
    if (request.status !== 'pending') {
      throw new ApiError(status.BAD_REQUEST, 'Request has already been processed');
    }
  
    if (action === 'accept') {
      await Member.findOneAndUpdate(
        { userId: request.memberId },
        { currentTrainerId: trainerId },
        { new: true }
      );
      request.status = 'accepted';
  
    } else if (action === 'reject') {
      request.status = 'rejected';
  
    } else if (action === 'suggest') {
      if (!alternativeTrainerId) {
        throw new ApiError(status.BAD_REQUEST, 'Alternative trainer ID is required for suggestion');
      }
      const alternativeTrainer = await Trainer.findOne({ userId: alternativeTrainerId });
      if (!alternativeTrainer) {
        throw new ApiError(status.NOT_FOUND, 'Alternative trainer not found');
      }
      request.status = 'suggested';
      request.alternativeTrainerId = alternativeTrainerId;
  
    } else {
      throw new ApiError(status.BAD_REQUEST, 'Invalid action');
    }
  
    await request.save();
    return request;
  };
  
  const createWorkoutPlan = async (trainerId, memberId, workoutData) => {
    const trainer = await Trainer.findOne({ userId: trainerId });
    if (!trainer) {
      throw new ApiError(status.NOT_FOUND, 'Trainer not found');
    }
  
    const member = await MemberProfile.findOne({ userId: memberId });
    if (!member) {
      throw new ApiError(status.NOT_FOUND, 'Member not found');
    }
    if (member.currentTrainerId.toString() !== trainerId.toString()) {
      throw new ApiError(status.FORBIDDEN, 'You are not assigned to this member');
    }
  
    // Validate dates
    if (new Date(workoutData.startDate) >= new Date(workoutData.endDate)) {
      throw new ApiError(status.BAD_REQUEST, 'Start date must be before end date');
    }
  
    // Validate weekly sessions structure
    if (!Array.isArray(workoutData.weeklySessions) || workoutData.weeklySessions.length === 0) {
      throw new ApiError(status.BAD_REQUEST, 'Weekly sessions data is required');
    }
  
    // Calculate total weeks between start and end date
    const totalWeeks = moment(workoutData.endDate).diff(moment(workoutData.startDate), 'weeks') + 1;
  
    if (workoutData.weeklySessions.length !== totalWeeks) {
      throw new ApiError(status.BAD_REQUEST, 'Weekly session count must match total weeks in the plan');
    }
  
    // Create workout plan
    const workoutPlan = await WorkoutPlan.create({
      trainerId,
      memberId,
      goal: workoutData.goal,
      startDate: workoutData.startDate,
      endDate: workoutData.endDate,
      weeklySessions: workoutData.weeklySessions,
      status: 'active',
    });
  
    // Auto-generate training sessions for each week
    const sessionsToCreate = [];
    let currentWeekStartDate = moment(workoutData.startDate);
  
    workoutData.weeklySessions.forEach((week, index) => {
      for (let i = 0; i < week.sessionCount; i++) {
        sessionsToCreate.push({
          memberId,
          trainerId,
          workoutPlanId: workoutPlan._id,
          weekNumber: index + 1,
          status: 'pending', 
          scheduledDate: null,
          duration: 60,
        });
      }
      currentWeekStartDate = currentWeekStartDate.add(1, 'week');
    });
  
    await TrainingSession.insertMany(sessionsToCreate);
  
    return { workoutPlan, sessions: sessionsToCreate };
  };

  /**
 * Delete a training session
 * @param {ObjectId} trainerId - Trainer's ID
 * @param {ObjectId} sessionId - Session ID
 * @returns {Promise<Object>}
 */
const deleteSession = async (trainerId, sessionId) => {
    const session = await TrainingSession.findById(sessionId);
    if (!session) {
      throw new ApiError(status.NOT_FOUND, 'Session not found');
    }
    if (session.trainerId.toString() !== trainerId.toString()) {
      throw new ApiError(status.FORBIDDEN, 'You are not authorized to delete this session');
    }
  
    await TrainingSession.findByIdAndDelete(sessionId);
    return { message: 'Session deleted successfully' };
  };

  const updateSession = async (trainerId, sessionId, updateData) => {
    const session = await TrainingSession.findById(sessionId);
    if (!session) {
      throw new ApiError(status.NOT_FOUND, 'Session not found');
    }
    if (session.trainerId.toString() !== trainerId.toString()) {
      throw new ApiError(status.FORBIDDEN, 'You are not authorized to edit this session');
    }
  
    // If scheduledDate or duration is being updated, check trainer availability
    if (updateData.scheduledDate || updateData.duration) {
      const newScheduledDate = updateData.scheduledDate || session.scheduledDate;
      const newDuration = updateData.duration || session.duration;
  
      // Check if trainer is available at the new time
      const available = await isTrainerAvailable(trainerId, new Date(newScheduledDate), newDuration);
      if (!available) {
        throw new ApiError(status.BAD_REQUEST, 'Trainer is not available at this time');
      }
    }
  
    Object.assign(session, updateData);
    await session.save();
  
    return session;
  };

  const createSession = async (trainerId, memberId, sessionData) => {
    const { scheduledDate, duration, weekNumber } = sessionData;
  
    // Check if trainer is available at the requested time
    const available = await isTrainerAvailable(trainerId, new Date(scheduledDate), duration);
    if (!available) {
      throw new ApiError(status.BAD_REQUEST, 'Trainer is not available at this time');
    }
  
    // Create a session
    const newSession = await TrainingSession.create({
      memberId,
      trainerId,
      workoutPlanId: sessionData.workoutPlanId,
      weekNumber,
      status: 'scheduled',
      scheduledDate,
      duration,
    });
  
    return newSession;
  };

  const isTrainerAvailable = async (trainerId, scheduledDate, duration) => {
    const trainer = await Trainer.findOne({ userId: trainerId });
    if (!trainer) {
      throw new ApiError(status.NOT_FOUND, 'Trainer not found');
    }
  
    // Convert to ISO time format
    const sessionDay = scheduledDate.toLocaleDateString('en-US', { weekday: 'long' });
    const sessionStartTime = scheduledDate.toISOString();
    const sessionEndTime = new Date(scheduledDate.getTime() + duration * 60000).toISOString();
  
    // Check if trainer is available on this day
    const availability = trainer.availability.find((slot) => slot.dayOfWeek === sessionDay);
    if (!availability) return false;
  
    const trainerStart = new Date(`1970-01-01T${availability.startTime}:00.000Z`).toISOString();
    const trainerEnd = new Date(`1970-01-01T${availability.endTime}:00.000Z`).toISOString();
  
    if (sessionStartTime < trainerStart || sessionEndTime > trainerEnd) {
      return false;
    }
  
    // Check if trainer already has a session at this time
    const overlappingSession = await TrainingSession.findOne({
      trainerId,
      scheduledDate: {
        $gte: new Date(sessionStartTime),
        $lt: new Date(sessionEndTime),
      },
      status: { $in: ['scheduled', 'requested'] }, // Exclude cancelled sessions
    });
  
    return !overlappingSession;
  };

  const respondToSessionRequest = async (trainerId, sessionId, action) => {
    const session = await TrainingSession.findById(sessionId);
    if (!session) {
      throw new ApiError(status.NOT_FOUND, 'Session not found');
    }
    if (session.trainerId.toString() !== trainerId.toString()) {
      throw new ApiError(status.FORBIDDEN, 'You are not authorized to respond to this session');
    }
    if (session.status !== 'requested') {
      throw new ApiError(status.BAD_REQUEST, 'Session request is already processed');
    }
  
    if (action === 'approve') {
      // Ensure trainer is available for this session before approving
      const available = await isTrainerAvailable(trainerId, new Date(session.scheduledDate), session.duration);
      if (!available) {
        throw new ApiError(status.BAD_REQUEST, 'Trainer is not available at this time');
      }
  
      session.status = 'scheduled';
  
    } else if (action === 'reject') {
      session.status = 'cancelled';
  
    } else {
      throw new ApiError(status.BAD_REQUEST, 'Invalid action. Use "approve" or "reject".');
    }
  
    await session.save();
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
      .populate('memberId', 'name email') // Get member details
      .sort({ scheduledDate: 1 }); // Sort by upcoming sessions first
  
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
  
    await session.save();
    return session;
  };
  
  const cancelSession = async (trainerId, sessionId) => {
    const session = await TrainingSession.findById(sessionId);
    if (!session) {
      throw new ApiError(status.NOT_FOUND, 'Session not found');
    }

    if (session.status !== 'scheduled') {
      throw new ApiError(status.BAD_REQUEST, 'Only scheduled sessions can be cancelled');
    }
  
    session.status = 'cancelled';
    await session.save();
  
    return session;
  };
  
  const getSessionsByStatus = async (trainerId, status) => {
    if (!['completed', 'scheduled'].includes(status)) {
      throw new ApiError(status.BAD_REQUEST, 'Invalid session status');
    }
  
    const sessions = await TrainingSession.find({
      trainerId,
      status,
    })
      .populate('memberId', 'name email') // Get member details
      .sort({ scheduledDate: 1 });
  
    return sessions;
  };

  const updateAvailability = async (trainerId, newAvailability) => {
    const trainer = await Trainer.findOne({ userId: trainerId });
    if (!trainer) {
      throw new ApiError(status.NOT_FOUND, 'Trainer not found');
    }
  
    // Check if any existing sessions conflict with the new availability
    const scheduledSessions = await TrainingSession.find({
      trainerId,
      status: 'scheduled',
    });
  
    for (const session of scheduledSessions) {
      const sessionDay = session.scheduledDate.toLocaleDateString('en-US', { weekday: 'long' });
      const sessionStartTime = session.scheduledDate;
      const sessionEndTime = new Date(sessionStartTime.getTime() + session.duration * 60000);
  
      // Check if this session falls into new availability
      const matchingAvailability = newAvailability.find((slot) => slot.dayOfWeek === sessionDay);
  
      if (!matchingAvailability) {
        throw new ApiError(
          status.BAD_REQUEST,
          `You have scheduled sessions on ${sessionDay}. Update denied.`
        );
      }
  
      const trainerStart = new Date(`1970-01-01T${matchingAvailability.startTime}:00.000Z`);
      const trainerEnd = new Date(`1970-01-01T${matchingAvailability.endTime}:00.000Z`);
  
      if (sessionStartTime < trainerStart || sessionEndTime > trainerEnd) {
        throw new ApiError(
          status.BAD_REQUEST,
          `Your new availability conflicts with an existing session on ${sessionDay}.`
        );
      }
    }
  
    // No conflicts, update availability
    trainer.availability = newAvailability;
    await trainer.save();
  
    return trainer;
  };

  const getAvailableTimeSlotsForRange = async (trainerId, startDate, endDate) => {
    const trainer = await Trainer.findOne({ userId: trainerId });
    if (!trainer) {
      throw new ApiError(status.NOT_FOUND, 'Trainer not found');
    }
  
    const availabilityMap = {};
  
    // Iterate through each date in the given range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  
      // Get trainer's availability for this day
      const availability = trainer.availability.find((slot) => slot.dayOfWeek === dayOfWeek);
      if (!availability) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue; // No availability for this day
      }
  
      const trainerStart = new Date(`1970-01-01T${availability.startTime}:00.000Z`);
      const trainerEnd = new Date(`1970-01-01T${availability.endTime}:00.000Z`);
  
      // Fetch already booked sessions for this trainer on this date
      const bookedSessions = await TrainingSession.find({
        trainerId,
        scheduledDate: {
          $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
          $lt: new Date(currentDate.setHours(23, 59, 59, 999)),
        },
        status: { $in: ['scheduled', 'requested'] },
      });
  
      // Convert booked sessions into time ranges
      const bookedRanges = bookedSessions.map((session) => {
        const startTime = new Date(session.scheduledDate);
        const endTime = new Date(startTime.getTime() + session.duration * 60000);
        return { start: startTime, end: endTime };
      });
  
      // Generate available time slots in 30-minute intervals
      const availableSlots = [];
      let currentTime = trainerStart;
  
      while (currentTime < trainerEnd) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000); // 30-minute slot
  
        // Check if this slot conflicts with any booked session
        const isBooked = bookedRanges.some((session) => 
          (slotStart >= session.start && slotStart < session.end) ||
          (slotEnd > session.start && slotEnd <= session.end)
        );
  
        if (!isBooked) {
          availableSlots.push(slotStart.toISOString()); // Store in ISO format
        }
  
        currentTime = slotEnd; // Move to next slot
      }
  
      // Store availability for this date
      availabilityMap[currentDate.toISOString().split('T')[0]] = availableSlots;
  
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    return availabilityMap;
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
  getSessionsByStatus,
  updateAvailability
};
