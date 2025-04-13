const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');

// Get user profile (enhanced with more details)
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      profileImage: user.profileImage,
      companyName: user.companyName,
      companyAddress: user.companyAddress,
      companyPhone: user.companyPhone,
      companyEmail: user.companyEmail,
      companyDescription: user.companyDescription,
      subscription: user.bePartOfUs, // Use bePartOfUs from your schema
      preferences: user.preferences,
      statistics: user.statistics,
      security: user.security,
      badges: user.badges,
      recentActivity: user.recentActivity,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      name, email, phone, address, profileImage,
      companyName, companyAddress, companyPhone, companyEmail, companyDescription,
      preferences
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.profileImage = profileImage || user.profileImage;
    user.companyName = companyName || user.companyName;
    user.companyAddress = companyAddress || user.companyAddress;
    user.companyPhone = companyPhone || user.companyPhone;
    user.companyEmail = companyEmail || user.companyEmail;
    user.companyDescription = companyDescription || user.companyDescription;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available subscription plans
router.get('/subscriptions/plans', async (req, res) => {
  try {
    const plans = {
      free: {
        name: 'Free',
        price: 0,
        description: 'Basic access to booking system',
        features: ['Search and book accommodations', 'Save favorites', 'Standard notifications'],
        limitations: ['No property listing', 'Limited statistics', 'No priority support'],
      },
      pro: {
        name: 'Pro',
        price: 49.99,
        description: 'List properties with admin approval',
        features: [
          'All Free features',
          'Add properties (with admin approval)',
          'Manage approved properties',
          'Basic statistics',
          'Priority support',
        ],
      },
      premium: {
        name: 'Premium',
        price: 99.99,
        description: 'Advanced features for professional hosts',
        features: [
          'All Pro features',
          'Fast property approval',
          'Promoted listings',
          'Advanced statistics',
          'Custom branding',
          'Direct bookings',
          'Loyalty program',
        ],
        mostPopular: true,
      },
    };
    res.json(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change subscription
router.post('/subscriptions/change', protect, async (req, res) => {
  try {
    const { subscription, duration } = req.body;

    if (!['free', 'pro', 'premium'].includes(subscription)) {
      return res.status(400).json({ message: 'Invalid subscription type' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (duration || 1));

    const features = {
      free: {
        searchAndBook: true,
        favorites: true,
        standardNotifications: true,
        addProperties: false,
        manageProperties: false,
        basicStatistics: false,
        prioritySupport: false,
        optimizationTips: false,
        fastApproval: false,
        promotedListings: false,
        advancedStatistics: false,
        customBranding: false,
        directBookings: false,
        loyaltyProgram: false,
      },
      pro: {
        searchAndBook: true,
        favorites: true,
        standardNotifications: true,
        addProperties: true,
        manageProperties: true,
        basicStatistics: true,
        prioritySupport: true,
        optimizationTips: true,
        fastApproval: false,
        promotedListings: false,
        advancedStatistics: false,
        customBranding: false,
        directBookings: false,
        loyaltyProgram: false,
      },
      premium: {
        searchAndBook: true,
        favorites: true,
        standardNotifications: true,
        addProperties: true,
        manageProperties: true,
        basicStatistics: true,
        prioritySupport: true,
        optimizationTips: true,
        fastApproval: true,
        promotedListings: true,
        advancedStatistics: true,
        customBranding: true,
        directBookings: true,
        loyaltyProgram: true,
      },
    };

    user.bePartOfUs = {
      type: subscription,
      startDate,
      endDate,
      features: features[subscription],
    };

    user.recentActivity.unshift({
      type: 'subscription',
      description: `Changed to ${subscription} plan for ${duration || 1} month(s)`,
      timestamp: new Date(),
    });

    await user.save();
    res.json({
      message: `Subscription changed to ${subscription}`,
      subscription: user.bePartOfUs,
    });
  } catch (error) {
    console.error('Change subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update security settings
router.put('/security', protect, async (req, res) => {
  try {
    const { twoFactorEnabled, emailNotifications } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof twoFactorEnabled === 'boolean') user.security.twoFactorEnabled = twoFactorEnabled;
    if (typeof emailNotifications === 'boolean') user.security.emailNotifications = emailNotifications;

    await user.save();
    res.json(user.security);
  } catch (error) {
    console.error('Update security error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint for admin to get user bookings
router.get('/admin/users/:id/bookings', protect, admin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find all bookings for this user
    const bookings = await Booking.find({ user: userId })
      .populate('hotel', 'name location images')
      .populate('room', 'name type price')
      .sort({ createdAt: -1 })
      .lean();
    
    // Format bookings for display
    const formattedBookings = bookings.map(booking => ({
      id: booking._id,
      service: booking.hotel ? `${booking.hotel.name} - ${booking.room.type}` : 'Hotel Booking',
      date: booking.createdAt,
      status: booking.status,
      amount: `$${booking.totalAmount.toFixed(2)}`,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      paymentStatus: booking.paymentStatus,
      guests: booking.guests,
      nights: booking.nights
    }));
    
    res.json(formattedBookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Server error while fetching bookings' });
  }
});

module.exports = router;