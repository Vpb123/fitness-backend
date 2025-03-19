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
  }

  return User.create(userBody);
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
  return User.findOne({ email });
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
    profile = await Member.findOne({ userId }).populate('currentTrainerId');
  } else if (user.role === 'trainer') {
    profile = await Trainer.findOne({ userId });
  } else if (user.role === 'admin') {
    profile = await Admin.findOne({ userId });
  }

  if (!profile) throw new ApiError(status.NOT_FOUND, 'Profile not found');
  
  return { user, profile };
};


module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  getUserProfileById
};
