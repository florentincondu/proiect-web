const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const PlacePrice = require('../models/PlacePrice');
const PlaceRestriction = require('../models/PlaceRestriction');
const axios = require('axios');
const path = require('path');
const fs = require('fs');


router.post('/search-nearby', async (req, res) => {
  try {
    console.log('Received search-nearby request with body:', JSON.stringify(req.body));
    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchNearby',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.API_KEY,
          'X-Goog-FieldMask': req.headers['x-goog-fieldmask'] || 'places.id,places.displayName,places.photos,places.formattedAddress,places.rating,places.types,places.websiteUri,places.priceLevel'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Google Places API:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Error accessing Google Places API'
    });
  }
});


router.post('/search-text', async (req, res) => {
  try {
    const { textQuery } = req.body;
    
    if (!textQuery) {
      return res.status(400).json({ error: 'Text query is required' });
    }
    
    console.log(`Searching for: "${textQuery}"`);
    
    const googleMapsUrl = 'https://places.googleapis.com/v1/places:searchText';
    
    const response = await axios.post(
      googleMapsUrl,
      {
        textQuery: textQuery,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.id'
        }
      }
    );
    
    console.log(`Found ${response.data.places?.length || 0} places`);
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error searching places:', error.message);
    

    if (error.response) {
      console.error('Google API error details:', error.response.data);
      return res.status(error.response.status).json({
        error: 'Error from Google Places API',
        details: error.response.data
      });
    }
    
    return res.status(500).json({ error: 'Failed to search places' });
  }
});


router.get('/media/:photoName', async (req, res) => {
  try {

    const photoName = decodeURIComponent(req.params.photoName);
    
    console.log('Requesting photo:', photoName);
    

    if (!photoName || !photoName.includes('/photos/')) {
      console.error('Invalid photo name format:', photoName);
      return res.redirect('https://placehold.co/400x300/172a45/ffffff?text=Invalid+Photo+ID');
    }
    
    const response = await axios.get(
      `https://places.googleapis.com/v1/${photoName}/media`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.API_KEY
        },
        params: req.query,
        responseType: 'stream'
      }
    );
    

    res.set('Content-Type', response.headers['content-type']);
    

    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying to Google Places photo API:', error.response?.data || error.message);
    console.error('Photo request failed for:', req.params.photoName);
    

    res.redirect('https://placehold.co/400x300/172a45/ffffff?text=Image+Not+Found');
  }
});

router.get('/prices', async (req, res) => {
  try {
    const prices = await PlacePrice.find().sort({ name: 1 });
    res.json(prices);
  } catch (error) {
    console.error('Error fetching place prices:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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

router.get('/restrictions', protect, admin, async (req, res) => {
  try {
    const restrictions = await PlaceRestriction.find().sort({ name: 1 });
    res.json(restrictions);
  } catch (error) {
    console.error('Error fetching place restrictions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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

router.get('/:placeId', async (req, res) => {
  try {
    console.log('Received request for place ID:', req.params.placeId);
    console.log('Query parameters:', req.query);
    
    if (req.params.placeId.startsWith('ChI')) {
      console.log('Processing Google Places API request');
      
      const fields = req.query.fields || 
        'id,displayName,formattedAddress,location,rating,userRatingCount,photos,types,websiteUri,priceLevel,businessStatus,internationalPhoneNumber,editorialSummary';
      
      const response = await axios.get(
        `https://places.googleapis.com/v1/places/${req.params.placeId}?fields=${encodeURIComponent(fields)}&key=${process.env.API_KEY}`
      );
      
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
      res.json(placeData);
    } else {
      const [price, restriction] = await Promise.all([
        PlacePrice.findOne({ placeId: req.params.placeId }),
        PlaceRestriction.findOne({ placeId: req.params.placeId })
      ]);
      
      if (!price) {
        return res.status(404).json({ message: 'Place not found' });
      }
      
      const placeData = {
        placeId: price.placeId,
        name: price.name,
        price: price.price,
        isRestricted: restriction?.isRestricted || false,
        restrictionReason: restriction?.reason || ''
      };
      
      res.json(placeData);
    }
  } catch (error) {
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