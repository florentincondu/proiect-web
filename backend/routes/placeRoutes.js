const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const PlacePrice = require('../models/PlacePrice');
const PlaceRestriction = require('../models/PlaceRestriction');
const axios = require('axios');

// Get all place prices (public)
router.get('/prices', async (req, res) => {
  try {
    const prices = await PlacePrice.find().sort({ name: 1 });
    res.json(prices);
  } catch (error) {
    console.error('Error fetching place prices:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get place price by ID (admin only)
router.get('/prices/:id', protect, admin, async (req, res) => {
  try {
    const price = await PlacePrice.findById(req.params.id);
    if (!price) {
      return res.status(404).json({ message: 'Place price not found' });
    }
    res.json(price);
  } catch (error) {
    console.error('Error fetching place price:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update place price (admin only)
router.put('/prices/:id', protect, admin, async (req, res) => {
  try {
    const { price } = req.body;
    const placePrice = await PlacePrice.findById(req.params.id);
    
    if (!placePrice) {
      return res.status(404).json({ message: 'Place price not found' });
    }
    
    placePrice.price = price;
    placePrice.updatedAt = new Date();
    placePrice.updatedBy = {
      userId: req.user._id,
      email: req.user.email
    };
    
    await placePrice.save();
    res.json(placePrice);
  } catch (error) {
    console.error('Error updating place price:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all place restrictions (admin only)
router.get('/restrictions', protect, admin, async (req, res) => {
  try {
    const restrictions = await PlaceRestriction.find().sort({ name: 1 });
    res.json(restrictions);
  } catch (error) {
    console.error('Error fetching place restrictions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get place restriction by ID (admin only)
router.get('/restrictions/:id', protect, admin, async (req, res) => {
  try {
    const restriction = await PlaceRestriction.findById(req.params.id);
    if (!restriction) {
      return res.status(404).json({ message: 'Place restriction not found' });
    }
    res.json(restriction);
  } catch (error) {
    console.error('Error fetching place restriction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update place restriction (admin only)
router.put('/restrictions/:id', protect, admin, async (req, res) => {
  try {
    const { isRestricted, reason } = req.body;
    const restriction = await PlaceRestriction.findById(req.params.id);
    
    if (!restriction) {
      return res.status(404).json({ message: 'Place restriction not found' });
    }
    
    restriction.isRestricted = isRestricted;
    restriction.reason = reason;
    restriction.updatedAt = new Date();
    restriction.updatedBy = {
      userId: req.user._id,
      email: req.user.email
    };
    
    await restriction.save();
    res.json(restriction);
  } catch (error) {
    console.error('Error updating place restriction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get place details (public)
router.get('/:placeId', async (req, res) => {
  try {
    console.log('Received request for place ID:', req.params.placeId);
    console.log('Query parameters:', req.query);
    
    // Check if the placeId is a Google Places API ID (starts with ChI)
    if (req.params.placeId.startsWith('ChI')) {
      console.log('Processing Google Places API request');
      
      // Get fields from query parameters or use default fields
      const fields = req.query.fields || 
        'id,displayName,formattedAddress,location,rating,userRatingCount,photos,types,websiteUri,priceLevel,businessStatus,internationalPhoneNumber,editorialSummary';
      
      // Forward the request to Google Places API
      const response = await axios.get(
        `https://places.googleapis.com/v1/places/${req.params.placeId}?fields=${encodeURIComponent(fields)}&key=${process.env.API_KEY}`
      );
      
      console.log('Google Places API response:', response.data);
      
      // Transform the response to match our format
      const placeData = {
        id: response.data.id,
        name: response.data.displayName?.text || 'Unknown Place',
        address: response.data.formattedAddress,
        rating: response.data.rating,
        userRatingCount: response.data.userRatingCount,
        types: response.data.types,
        website: response.data.websiteUri,
        priceLevel: response.data.priceLevel,
        status: response.data.businessStatus,
        phone: response.data.internationalPhoneNumber,
        description: response.data.editorialSummary?.text,
        location: response.data.location,
        photos: response.data.photos?.map(photo => ({
          name: photo.name,
          width: photo.widthPx,
          height: photo.heightPx
        }))
      };
      
      console.log('Transformed place data:', placeData);
      res.json(placeData);
    } else {
      console.log('Processing internal place ID request');
      // Handle our internal place IDs
      const [price, restriction] = await Promise.all([
        PlacePrice.findOne({ placeId: req.params.placeId }),
        PlaceRestriction.findOne({ placeId: req.params.placeId })
      ]);
      
      if (!price) {
        console.log('Place not found in database');
        return res.status(404).json({ message: 'Place not found' });
      }
      
      const placeData = {
        placeId: price.placeId,
        name: price.name,
        price: price.price,
        isRestricted: restriction?.isRestricted || false,
        restrictionReason: restriction?.reason || ''
      };
      
      console.log('Internal place data:', placeData);
      res.json(placeData);
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
      console.error('Error headers:', error.response.headers);
    }
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.response?.data 
    });
  }
});

module.exports = router; 