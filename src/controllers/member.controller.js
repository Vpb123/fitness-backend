
const { memberService } = require('../services');
const catchAsync = require('../utils/catchAsync');


const getAvailableTrainers = catchAsync(async (req, res) => {
    const { specialization, minExperience, minRating, page = 1, limit = 10 } = req.query;
  
    const filters = {
      specialization,
      minExperience,
      minRating,
    };
  
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };
  
    const result = await memberService.getAvailableTrainers(filters, options);
  
    res.status(200).json(result);
  });

  const sendTrainerRequest = catchAsync(async (req, res) => {
    const memberId = req.user.id;
    const request = await memberService.sendTrainerRequest(memberId, req.body);
    res.status(201).json({
      message: 'Trainer request sent successfully',
      request,
    });
  });

const requestTrainingSession = catchAsync(async (req, res) => {
    const memberId = req.user.id;
    const session = await memberService.requestTrainingSession(memberId, req.body);
  
    res.status(201).json({
      message: 'Session request sent to trainer',
      session,
    });
  });

const getSessionHistory = catchAsync(async (req, res) => {
    const memberId = req.user.id;
    const sessions = await memberService.getSessionHistory(memberId);
    res.status(200).json({ sessions });
});
  
const getUpcomingSessions = catchAsync(async (req, res) => {
    const memberId = req.user.id;
    const status = req.query.status || 'all';
  
    const sessions = await memberService.getUpcomingSessions(memberId, status);
    res.status(200).json({ sessions });
});

const cancelSession = catchAsync(async (req, res) => {
    const memberId = req.user.id;
    const { sessionId } = req.params;
  
    const session = await memberService.cancelSession(memberId, sessionId);
    res.status(200).json({ message: 'Session cancelled', session });
  });
  
const getSessionProgress = catchAsync(async (req, res) => {
    const memberId = req.user.id;
    const { period } = req.query;
  
    const result = await memberService.getSessionProgress(memberId, period);
    res.status(200).json(result);
  });

const getWorkoutPlan = catchAsync(async (req, res) => {
    const memberId = req.user.id;
    const plan = await memberService.getWorkoutPlan(memberId);
  
    res.status(200).json({
      message: 'Workout plan fetched successfully',
      plan,
    });
  });
  
  const leaveTrainerReview = catchAsync(async (req, res) => {
    const memberId = req.user.id;
    const review = await memberService.leaveTrainerReview(memberId, req.body);
  
    res.status(201).json({
      message: 'Review submitted successfully',
      review,
    });
  });
    
module.exports = {
    getAvailableTrainers,
    sendTrainerRequest,
    requestTrainingSession,
    getSessionHistory,
    getUpcomingSessions,
    cancelSession,
    getSessionProgress,
    getWorkoutPlan,
    leaveTrainerReview
}