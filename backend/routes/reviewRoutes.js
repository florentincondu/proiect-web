const express = require('express');
const router = express.Router();
const { protect, admin, allowGuest } = require('../middleware/authMiddleware');
const {
  createReview,
  getHotelReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getUserReviews,
  getAdminReviews,
  updateReviewStatus,
  // New controllers
  addReaction,
  getReactions,
  addComment,
  getComments,
  deleteComment
} = require('../controllers/reviewController');

// Public routes
router.get('/hotel/:hotelId', getHotelReviews);
router.get('/:id/comments', getComments);
router.get('/:id/reactions', allowGuest, getReactions);

// Private routes
router.post('/', protect, createReview);
router.get('/user', protect, getUserReviews);
router.get('/:id', protect, getReviewById);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

// Reaction and comment routes
router.post('/:id/reaction', protect, addReaction);
router.post('/:id/comments', protect, addComment);
router.delete('/:reviewId/comments/:commentId', protect, deleteComment);

// Admin routes
router.get('/admin/all', protect, admin, getAdminReviews);
router.put('/admin/:id', protect, admin, updateReviewStatus);

module.exports = router; 