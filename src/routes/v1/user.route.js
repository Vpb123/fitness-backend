const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = express.Router();


// router.get('/:userId',auth(), validate(userValidation.getUser), userController.getUser)
// router.patch('/:userId',auth(), validate(userValidation.updateUser), userController.updateUser)
// router.delete('/:userId',auth(), validate(userValidation.deleteUser), userController.deleteUser);

router.put('/profile',auth(), userController.updateProfile);
router.get('/profile', auth(), userController.getUserProfile);
router.post('/profile-photo', auth(), upload.single('profilePhoto'), userController.uploadProfilePhoto);

module.exports = router;
