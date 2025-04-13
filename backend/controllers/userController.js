const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  // Add pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Add sorting
  const sortField = req.query.sortField || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortOrder };

  // Add filtering
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

  // Execute query with count
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

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  res.json(user);
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Extract fields to update
  const {
    firstName,
    lastName,
    email,
    role,
    isVerified,
    status,
    notes
  } = req.body;
  
  // Update only provided fields
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (isVerified !== undefined) user.isVerified = isVerified;
  if (status !== undefined) user.status = status;
  if (notes !== undefined) user.notes = notes;
  
  // Add admin activity log
  user.activityLogs.push({
    action: 'profile_updated_by_admin',
    timestamp: new Date(),
    details: {
      adminId: req.user._id,
      changes: req.body
    }
  });
  
  // Keep only the last 100 logs
  if (user.activityLogs.length > 100) {
    user.activityLogs = user.activityLogs.slice(-100);
  }
  
  const updatedUser = await user.save();
  
  res.json({
    _id: updatedUser._id,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    email: updatedUser.email,
    role: updatedUser.role,
    isVerified: updatedUser.isVerified,
    status: updatedUser.status,
    notes: updatedUser.notes,
    message: 'User updated successfully'
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Check if user has any bookings or other important data before deletion
  // This is just a placeholder - implement actual checks based on your models
  // const hasBookings = await Booking.findOne({ userId: req.params.id });
  // if (hasBookings) {
  //   res.status(400);
  //   throw new Error('Cannot delete user with existing bookings');
  // }
  
  // Option 1: Hard delete
  await user.deleteOne();
  
  // Option 2: Soft delete (if you prefer)
  // user.status = 'deleted';
  // user.email = `deleted_${user._id}@example.com`;
  // user.isActive = false;
  // await user.save();
  
  res.json({ message: 'User removed successfully' });
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
}; 