const {status} = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: 'di3ipwceg',
  api_key: '865599372593673',
  api_secret: 'UC-wN3nkbigQ9A4C3HTiYrV3Svk'
});


const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(status.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const uploadProfilePhoto = catchAsync(async (req, res) => {
  const file = req.file;
  const user = req.user;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const uploadFromBuffer = () => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'profile_photos',
          public_id: `user_${user._id}`,
          overwrite: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  };

  const result = await uploadFromBuffer();

  const updatedUser = await userService.updateUserById(user._id, {
    profilePhoto: result.secure_url,
  });

  res.status(200).json({
    message: 'Profile photo uploaded successfully',
    user: updatedUser,
  });
});


const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(status.NO_CONTENT).send();
});

const getUserProfile = catchAsync(async (req, res) => {
  console.log("req.user", req.user);
  const  userId  = req.user._id;

  const { user, profile } = await userService.getUserProfileById(userId);
  
  res.status(status.OK).json({ user, profile });
});


module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserProfile,
  uploadProfilePhoto
};
