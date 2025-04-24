const express = require('express');
const trainerController = require('../../controllers/trainer.controller');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const router = express.Router();

router.get('/members', auth('trainer'), trainerController.getTrainerMembers);
router.get('/member-requests', auth('trainer'), trainerController.getPendingMemberRequests);
router.post('/respond-request/:requestId', auth('trainer'), trainerController.respondToMemberRequest);
router.post('/create-workout-plan/:memberId', auth('trainer'), trainerController.createWorkoutPlan);
router.put('/update-session/:sessionId', auth('trainer'), trainerController.updateSession);
router.post('/create-session/:memberId', auth('trainer'), trainerController.createSession);
router.delete('/delete-session/:sessionId', auth('trainer'), trainerController.deleteSession);
router.post('/respond-session/:sessionId', auth('trainer'), trainerController.respondToSessionRequest);
router.get('/pending-sessions', auth('trainer'), trainerController.getPendingSessionRequests);
router.put('/complete-session/:sessionId', auth('trainer'), trainerController.completeSession);
router.post('/cancel-session/:sessionId', auth('trainer'), trainerController.cancelSession);
router.get('/sessions', auth('trainer'), trainerController.getSessionsByStatus);
router.put('/update-availability', auth('trainer'), trainerController.updateAvailability);
router.get('/mysessions', auth('trainer'), trainerController.getAllSessionsByTrainerId);
router.get('/:trainerId/availability', auth(), trainerController.getTrainerAvailability);
router.get('/', auth('trainer'), trainerController.getAllTrainers);
router.get('/availability', auth('trainer'), trainerController.getMyAvailability);
router.get('/stats', auth('trainer'), trainerController.getTrainerStats);
router.get('/session-stats', auth('trainer'), trainerController.getTrainerSessionStats);
module.exports = router;
