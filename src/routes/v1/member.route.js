const memberController = require('../../controllers/member.controller');
const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const router = express.Router();

router.get('/trainers', auth('member'), memberController.getAvailableTrainers);
router.post('/trainer-requests', auth('member'), memberController.sendTrainerRequest);
router.post('/request-session', auth('member'), memberController.requestTrainingSession);
router.delete('/sessions/:sessionId/cancel', auth('member'), memberController.cancelSession);
router.get('/sessions/upcoming', auth('member'), memberController.getUpcomingSessions);
router.get('/sessions/history', auth('member'), memberController.getSessionHistory);
router.get('/session-progress', auth('member'), memberController.getSessionProgress);
router.get('/workout-plan', auth('member'), memberController.getWorkoutPlan);
router.post('/reviews', auth('member'), memberController.leaveTrainerReview);
router.get('/getpendingsessions', auth('member'), memberController.getPendingSessionsByWeek);
router.post('/request-pending-session', auth('member'), memberController.requestPendingSession);
router.get('/get-details', auth('member'), memberController.getMemeberDetails);
router.get('/trainer-request-sent', auth('member'), memberController.getMemberTrainerRequests)

module.exports = router;