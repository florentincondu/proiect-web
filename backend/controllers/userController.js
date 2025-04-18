const User = require('../models/User');
const asyncHandler = require('express-async-handler');




const getAllUsers = asyncHandler(async (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;


  const sortField = req.query.sortField || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortOrder };


  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex }
    ];
  }


  const users = await User.find(filter)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(limit);
  
  const total = await User.countDocuments(filter);

  res.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});




const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  res.json(user);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  const { status, blockReason, blockDuration, ...updateData } = req.body;
  

  if (status === 'blocked') {
    user.blockInfo = {
      isBlocked: true,
      reason: blockReason,
      blockedUntil: blockDuration ? new Date(Date.now() + parseInt(blockDuration) * 24 * 60 * 60 * 1000) : null,
      blockedBy: req.user._id,
      blockedAt: new Date()
    };
    user.status = 'blocked';
  } else if (status === 'active' && user.status === 'blocked') {
    user.blockInfo = {
      isBlocked: false,
      reason: null,
      blockedUntil: null,
      blockedBy: null,
      blockedAt: null
    };
    user.status = 'active';
  }
  

  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined) {
      user[key] = updateData[key];
    }
  });
  
  const updatedUser = await user.save();
  

  if (status === 'blocked') {
    try {
      const { createNotification } = require('./notificationController');
      await createNotification({
        user: user._id,
        type: 'account_blocked',
        title: 'Account Blocked',
        message: `Your account has been blocked. Reason: ${blockReason}`,
        data: {
          blockedUntil: user.blockInfo.blockedUntil,
          reason: blockReason
        }
      });
    } catch (error) {
      console.error('Failed to send block notification:', error);
    }
  }
  
  res.json(updatedUser);
});
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  await user.deleteOne();
  res.json({ message: 'User removed successfully' });
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
}; 