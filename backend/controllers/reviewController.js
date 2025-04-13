const Review = require('../models/Review');
const User = require('../models/User');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Create a new review
 * @route   POST /api/reviews
 * @access  Private
 */
const createReview = asyncHandler(async (req, res) => {
  try {
    const { hotelId, rating, comment, title } = req.body;
    console.log('Creating review with data:', { hotelId, rating, comment, title });
    console.log('User creating review:', req.user?._id);

    if (!hotelId || !rating || !comment) {
      return res.status(400).json({
        message: 'Please provide hotelId, rating, and comment'
      });
    }

    // Check if user has already reviewed this hotel
    const existingReview = await Review.findOne({
      userId: req.user._id,
      hotelId
    });

    if (existingReview) {
      return res.status(400).json({
        message: 'You have already reviewed this hotel'
      });
    }

    const review = await Review.create({
      userId: req.user._id,
      hotelId,
      rating,
      title: title || `Review for ${hotelId}`,
      comment,
      status: 'approved' // Auto-approve for now
    });

    if (review) {
      console.log('Review created successfully:', review._id);
      return res.status(201).json({
        _id: review._id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        createdAt: review.createdAt,
        user: {
          _id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`
        }
      });
    } else {
      return res.status(400).json({
        message: 'Invalid review data'
      });
    }
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({
      message: 'Server error creating review',
      error: error.message
    });
  }
});

/**
 * @desc    Get all reviews for a hotel
 * @route   GET /api/reviews/hotel/:hotelId
 * @access  Public
 */
const getHotelReviews = asyncHandler(async (req, res) => {
  try {
    const { hotelId } = req.params;
    console.log('Getting reviews for hotelId:', hotelId);

    if (!hotelId) {
      return res.status(400).json({
        message: 'Hotel ID is required'
      });
    }

    // Log that we're about to query for reviews
    console.log('Querying for reviews with hotelId:', hotelId);

    // Find reviews for this hotel
    const reviews = await Review.find({ 
      hotelId, 
      status: 'approved' 
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName profileImage');

    console.log(`Found ${reviews.length} reviews`);

    // Get average rating 
    console.log('Getting average rating for hotelId:', hotelId);
    const ratingData = await Review.getAverageRating(hotelId);
    console.log('Rating data:', ratingData);

    // Format reviews with safe access to properties
    const formattedReviews = [];
    
    for (const review of reviews) {
      try {
        // Handle the case where userId might be null or undefined
        let user = { 
          _id: 'anonymous',
          name: 'Anonymous User',
          profileImage: null
        };
        
        if (review.userId) {
          user = {
            _id: review.userId._id ? review.userId._id.toString() : 'anonymous',
            name: (review.userId.firstName && review.userId.lastName) 
              ? `${review.userId.firstName} ${review.userId.lastName}`
              : 'Anonymous User',
            profileImage: review.userId.profileImage || null
          };
        }
        
        formattedReviews.push({
          _id: review._id,
          rating: review.rating,
          title: review.title || '',
          comment: review.comment,
          createdAt: review.createdAt,
          user: user,
          isVerifiedStay: review.isVerifiedStay || false
        });
      } catch (err) {
        console.error('Error processing review:', err);
        // Skip problematic reviews
      }
    }

    res.json({
      reviews: formattedReviews,
      averageRating: ratingData.averageRating,
      reviewCount: ratingData.reviewCount
    });
  } catch (error) {
    console.error('Error getting reviews:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error getting reviews',
      error: error.message
    });
  }
});

/**
 * @desc    Get a review by ID
 * @route   GET /api/reviews/:id
 * @access  Private
 */
const getReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('userId', 'firstName lastName profileImage');

  if (review) {
    res.json({
      _id: review._id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt,
      user: {
        _id: review.userId._id,
        name: `${review.userId.firstName} ${review.userId.lastName}`,
        profileImage: review.userId.profileImage
      },
      isVerifiedStay: review.isVerifiedStay
    });
  } else {
    res.status(404);
    throw new Error('Review not found');
  }
});

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment, title } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Check if the review belongs to the user
  if (review.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this review');
  }

  review.rating = rating || review.rating;
  review.comment = comment || review.comment;
  review.title = title || review.title;
  review.status = 'approved'; // Reset to approved if edited

  const updatedReview = await review.save();

  res.json({
    _id: updatedReview._id,
    rating: updatedReview.rating,
    title: updatedReview.title,
    comment: updatedReview.comment,
    createdAt: updatedReview.createdAt,
    updatedAt: updatedReview.updatedAt
  });
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
const deleteReview = asyncHandler(async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404);
      throw new Error('Review not found');
    }

    // Check if the review belongs to the user or user is admin
    if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized to delete this review');
    }

    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review removed' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      message: 'Server error deleting review',
      error: error.message
    });
  }
});

/**
 * @desc    Get all reviews for a user
 * @route   GET /api/reviews/user
 * @access  Private
 */
const getUserReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ userId: req.user._id })
    .sort({ createdAt: -1 });

  res.json(reviews);
});

/**
 * @desc    Admin: Get all reviews
 * @route   GET /api/reviews/admin
 * @access  Private/Admin
 */
const getAdminReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({})
    .sort({ createdAt: -1 })
    .populate('userId', 'firstName lastName email')
    .populate('hotelId', 'name');

  res.json(reviews);
});

/**
 * @desc    Admin: Update review status
 * @route   PUT /api/reviews/admin/:id
 * @access  Private/Admin
 */
const updateReviewStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  review.status = status || review.status;
  const updatedReview = await review.save();

  res.json(updatedReview);
});

/**
 * @desc    Add reaction (like/heart) to a review
 * @route   POST /api/reviews/:id/reaction
 * @access  Private
 */
const addReaction = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const userId = req.user._id;

    if (!type || !['likes', 'hearts'].includes(type)) {
      res.status(400);
      throw new Error('Valid reaction type (likes/hearts) is required');
    }

    const review = await Review.findById(id);
    if (!review) {
      res.status(404);
      throw new Error('Review not found');
    }

    // Initialize reactions object if it doesn't exist
    if (!review.reactions) {
      review.reactions = {
        likes: { count: 0, users: [] },
        hearts: { count: 0, users: [] }
      };
    }

    // Check if user already reacted with this type
    const hasReacted = review.reactions[type].users.some(user => 
      user.toString() === userId.toString()
    );

    if (hasReacted) {
      // Remove reaction if already exists (toggle)
      review.reactions[type].users = review.reactions[type].users
        .filter(user => user.toString() !== userId.toString());
      review.reactions[type].count = review.reactions[type].users.length;
      
      await review.save();
      
      res.json({
        success: true,
        message: `${type} reaction removed`,
        reactionCount: review.reactions[type].count,
        hasReacted: false
      });
    } else {
      // Add new reaction
      review.reactions[type].users.push(userId);
      review.reactions[type].count = review.reactions[type].users.length;
      
      await review.save();
      
      res.json({
        success: true,
        message: `${type} reaction added`,
        reactionCount: review.reactions[type].count,
        hasReacted: true
      });
    }
  } catch (error) {
    console.error(`Error adding reaction:`, error);
    res.status(500).json({
      message: 'Server error processing reaction',
      error: error.message
    });
  }
});

/**
 * @desc    Get reactions for a review
 * @route   GET /api/reviews/:id/reactions
 * @access  Public
 */
const getReactions = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    
    if (!review) {
      res.status(404);
      throw new Error('Review not found');
    }
    
    // Check if the user has reacted
    let userReactions = { likes: false, hearts: false };
    
    if (req.user) {
      const userId = req.user._id.toString();
      
      if (review.reactions) {
        userReactions.likes = review.reactions.likes.users.some(
          user => user.toString() === userId
        );
        userReactions.hearts = review.reactions.hearts.users.some(
          user => user.toString() === userId
        );
      }
    }
    
    res.json({
      likes: review.reactions?.likes?.count || 0,
      hearts: review.reactions?.hearts?.count || 0,
      userReactions
    });
  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({
      message: 'Server error getting reactions',
      error: error.message
    });
  }
});

/**
 * @desc    Add comment to a review
 * @route   POST /api/reviews/:id/comments
 * @access  Private
 */
const addComment = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    
    console.log('Adding comment to review ID:', id);
    console.log('Comment text:', text);
    console.log('User ID:', userId);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid review ID format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID format'
      });
    }
    
    if (!text) {
      console.error('Comment text is missing');
      res.status(400);
      throw new Error('Comment text is required');
    }
    
    const review = await Review.findById(id);
    if (!review) {
      console.error('Review not found with ID:', id);
      res.status(404);
      throw new Error('Review not found');
    }
    
    console.log('Review found:', review._id);
    
    // Initialize comments array if it doesn't exist
    if (!review.comments) {
      console.log('Initializing comments array');
      review.comments = [];
    }
    
    // Add new comment
    const newComment = {
      userId,
      text,
      createdAt: new Date()
    };
    
    review.comments.push(newComment);
    console.log('Comment added to review, saving...');
    await review.save();
    console.log('Review saved with new comment');
    
    // Return the new comment with user info
    const populatedReview = await Review.findById(id).populate({
      path: 'comments.userId',
      select: 'firstName lastName profileImage'
    });
    
    if (!populatedReview || !populatedReview.comments || populatedReview.comments.length === 0) {
      console.error('Failed to retrieve saved comment');
      return res.status(500).json({
        success: false,
        message: 'Comment was saved but could not be retrieved'
      });
    }
    
    const addedComment = populatedReview.comments[populatedReview.comments.length - 1];
    console.log('Comment retrieved successfully');
    
    res.status(201).json({
      success: true,
      comment: {
        _id: addedComment._id,
        text: addedComment.text,
        createdAt: addedComment.createdAt,
        user: {
          _id: addedComment.userId._id,
          name: `${addedComment.userId.firstName} ${addedComment.userId.lastName}`,
          profileImage: addedComment.userId.profileImage
        }
      }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      message: 'Server error adding comment',
      error: error.message
    });
  }
});

/**
 * @desc    Get comments for a review
 * @route   GET /api/reviews/:id/comments
 * @access  Public
 */
const getComments = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Getting comments for review ID:', id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid review ID format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID format'
      });
    }
    
    const review = await Review.findById(id).populate({
      path: 'comments.userId',
      select: 'firstName lastName profileImage'
    });
    
    if (!review) {
      console.error('Review not found with ID:', id);
      res.status(404);
      throw new Error('Review not found');
    }
    
    console.log('Review found:', review._id);
    console.log('Comments count:', review.comments?.length || 0);
    
    const formattedComments = (review.comments || []).map(comment => ({
      _id: comment._id,
      text: comment.text,
      createdAt: comment.createdAt,
      user: {
        _id: comment.userId._id,
        name: `${comment.userId.firstName} ${comment.userId.lastName}`,
        profileImage: comment.userId.profileImage
      }
    }));
    
    console.log('Formatted comments count:', formattedComments.length);
    
    res.json({
      success: true,
      comments: formattedComments
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({
      message: 'Server error getting comments',
      error: error.message
    });
  }
});

/**
 * @desc    Delete a comment
 * @route   DELETE /api/reviews/:reviewId/comments/:commentId
 * @access  Private
 */
const deleteComment = asyncHandler(async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const userId = req.user._id;
    
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404);
      throw new Error('Review not found');
    }
    
    // Find the comment index
    const commentIndex = review.comments.findIndex(
      comment => comment._id.toString() === commentId
    );
    
    if (commentIndex === -1) {
      res.status(404);
      throw new Error('Comment not found');
    }
    
    // Check if user is the comment owner or admin
    const isCommentOwner = review.comments[commentIndex].userId.toString() === userId.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isCommentOwner && !isAdmin) {
      res.status(403);
      throw new Error('Not authorized to delete this comment');
    }
    
    // Remove the comment
    review.comments.splice(commentIndex, 1);
    await review.save();
    
    res.json({
      success: true,
      message: 'Comment removed successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      message: 'Server error deleting comment',
      error: error.message
    });
  }
});

module.exports = {
  createReview,
  getHotelReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getUserReviews,
  getAdminReviews,
  updateReviewStatus,
  addReaction,
  getReactions,
  addComment,
  getComments,
  deleteComment
}; 