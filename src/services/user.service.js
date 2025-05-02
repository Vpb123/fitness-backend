const { status } = require("http-status");
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { Trainer } = require('../models');
const { Member } = require('../models');
const { Admin } = require("../models");
/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(status.BAD_REQUEST, 'Email already taken');
  }
  const user = await User.create(userBody);

  if (user.role === 'member') {
    await Member.create({ userId: user.id, subscriptionStatus: 'active' });
  } else if (user.role === 'trainer') {
    await Trainer.create({ userId: user.id });
  }else if(user.role === 'admin'){
    await Admin.create({ userId: user.id})
  }

  return user;
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  const user= await User.findOne({ email });
  if (user.role === 'trainer') {
    const trainer = await Trainer.findOne({ userId: user._id });
    user.roleId = trainer?._id;     
    console.log("trainer", trainer);
  } else if (user.role === 'member') {
    const member = await Member.findOne({ userId: user._id });
    user.roleId = member?._id;
  } else if (user.role === 'admin') {
    const admin = await Admin.findOne({ userId: user._id });
    user.roleId = admin?._id;
  }
  return user;
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(status.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

const getUserProfileById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(status.NOT_FOUND, 'User not found');

  let profile = null;
  if (user.role === 'member') {
    profile = await Member.findOne({ userId }).populate({
      path: 'currentTrainerId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email profilePhoto',
      },
    });
  } else if (user.role === 'trainer') {
    profile = await Trainer.findOne({ userId }).select('-availabilityRecurring -availabilityByDate').populate([
      {
        path: 'reviews',     
        select: 'rating comment createdAt',  
        options: { sort: { createdAt: -1 } }, 
      },
      {
        path: 'TrainingCenter',
        select: 'name address contactNumber facilities',
      },
    ]);;
  } else if (user.role === 'admin') {
    profile = await Admin.findOne({ userId });
  }

  if (!profile) throw new ApiError(status.NOT_FOUND, 'Profile not found');
  if (!user.profilePhoto || user.profilePhoto.trim() === '') {
    const first = user.firstName;
    const last = user.lastName || '';
    user.profilePhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${first} ${last}`
    )}&background=random`;
  }

  return { user, profile };
};

const updateProfile = async (userId, updatedData) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
  
    user.firstName = updatedData.user.firstName || user.firstName;
    user.lastName = updatedData.user.lastName || user.lastName;
    user.email = updatedData.user.email || user.email;
  
    await user.save();
  
    if (user.role === 'trainer') {
      const trainerProfile = await Trainer.findOne({ userId: userId });
      if (!trainerProfile) {
        throw new Error('Trainer profile not found');
      }
  
      trainerProfile.age = updatedData.profile.age || trainerProfile.age;
      trainerProfile.about = updatedData.profile.about || trainerProfile.about;
      trainerProfile.experienceYears = updatedData.profile.experienceYears || trainerProfile.experienceYears;
      trainerProfile.specializations = updatedData.profile.specializations || trainerProfile.specializations;
  
      await trainerProfile.save();
    }
  
    return { message: 'Profile updated successfully' };
  };

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  getUserProfileById,
  updateProfile
};
