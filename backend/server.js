const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const connectDB = require('./db');
const errorHandler = require('./middlewares/errorHandler');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('Serving static files from:', path.join(__dirname, 'uploads'));

// Add a test endpoint to check if images are being served correctly
app.get('/check-uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  
  try {
    // Check if the uploads directory exists
    if (!fs.existsSync(uploadsPath)) {
      return res.status(404).json({ 
        error: 'Uploads directory not found',
        path: uploadsPath
      });
    }
    
    // List the profile and cover directories
    const directories = ['profile', 'cover'];
    const result = {};
    
    directories.forEach(dir => {
      const dirPath = path.join(uploadsPath, dir);
      result[dir] = {
        exists: fs.existsSync(dirPath),
        path: dirPath
      };
      
      if (result[dir].exists) {
        try {
          const files = fs.readdirSync(dirPath);
          result[dir].files = files;
          result[dir].count = files.length;
        } catch (err) {
          result[dir].error = err.message;
        }
      }
    });
    
    res.json({ 
      uploadsDirectory: uploadsPath,
      exists: true,
      directories: result
    });
  } catch (err) {
    res.status(500).json({ 
      error: 'Error checking uploads directory',
      message: err.message
    });
  }
});

const authRoutes = require('./routes/authRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminApprovalRoutes = require('./routes/adminApprovalRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const settingRoutes = require('./routes/settingRoutes');
const supportRoutes = require('./routes/supportRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const placeRoutes = require('./routes/placeRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-approval', adminApprovalRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', paymentRoutes); 
app.use('/api/settings', settingRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/places', placeRoutes);

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Created logs directory at:', logsDir);
}

app.post('/api/places/search-nearby', async (req, res) => {
  try {
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

app.post('/api/places/search-text', async (req, res) => {
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
    
    // Better error response with details
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

app.get('/api/places/media/:photoName', async (req, res) => {
  try {
    // Get the full photo name from the request
    const photoName = decodeURIComponent(req.params.photoName);
    
    console.log('Requesting photo:', photoName);
    
    // Validate the photo name format to make sure it looks like a valid Places photo ID
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
    
    // Forward content type and other relevant headers
    res.set('Content-Type', response.headers['content-type']);
    
    // Pipe the image data directly to the response
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying to Google Places photo API:', error.response?.data || error.message);
    console.error('Photo request failed for:', req.params.photoName);
    
    // Send a placeholder image instead of an error
    res.redirect('https://placehold.co/400x300/172a45/ffffff?text=Image+Not+Found');
  }
});

app.get('/api/places/prices', async (req, res) => {
  try {
    let PlacePrice;
    try {
      const modelPath = path.join(__dirname, 'models', 'PlacePrice.js');
      
      if (!fs.existsSync(modelPath)) {
        console.error('PlacePrice model file does not exist at path:', modelPath);
        return res.status(200).json({
          success: true,
          prices: []
        });
      }
      
      PlacePrice = require('./models/PlacePrice');
    } catch (err) {
      console.error('Error importing PlacePrice model:', err.message);
      console.error(err.stack);
      return res.status(200).json({
        success: true,
        prices: []
      });
    }
    
    if (!PlacePrice) {
      return res.status(200).json({
        success: true,
        prices: []
      });
    }
    
    let prices = [];
    try {
      prices = await PlacePrice.find().lean();
    } catch (dbErr) {
      console.error('Database error when fetching prices:', dbErr.message);
      console.error(dbErr.stack);
    }
    
    return res.status(200).json({
      success: true,
      prices: prices || []
    });
  } catch (error) {
    console.error('Error getting place prices:', error.message);
    console.error(error.stack);
    return res.status(200).json({
      success: true,
      prices: []
    });
  }
});

app.get('/api/places/restrictions', async (req, res) => {
  try {
    let PlaceRestriction;
    try {
      const modelPath = path.join(__dirname, 'models', 'PlaceRestriction.js');
      
      if (!fs.existsSync(modelPath)) {
        console.error('PlaceRestriction model file does not exist at path:', modelPath);
        return res.status(200).json({
          success: true,
          restrictions: []
        });
      }
      
      PlaceRestriction = require('./models/PlaceRestriction');
    } catch (err) {
      console.error('Error importing PlaceRestriction model:', err.message);
      console.error(err.stack);
      return res.status(200).json({
        success: true,
        restrictions: []
      });
    }
    
    if (!PlaceRestriction) {
      console.log('PlaceRestriction model is undefined, returning empty array');
      return res.status(200).json({
        success: true,
        restrictions: []
      });
    }
    
    // Get all place restrictions with connection error handling
    let restrictions = [];
    try {
      console.log('Attempting to fetch restrictions from database');
      restrictions = await PlaceRestriction.find().lean();
      console.log(`Found ${restrictions.length} restrictions in database`);
    } catch (dbErr) {
      console.error('Database error when fetching restrictions:', dbErr.message);
      console.error(dbErr.stack);
      // Just return an empty array in case of DB errors
    }
    
    console.log('Sending restrictions response');
    return res.status(200).json({
      success: true,
      restrictions: restrictions || []
    });
  } catch (error) {
    console.error('Error getting place restrictions:', error.message);
    console.error(error.stack);
    // Return empty array instead of error to prevent UI issues
    return res.status(200).json({
      success: true,
      restrictions: []
    });
  }
});

// Add a direct API for hotel search
app.get('/api/hotels/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Import the Hotel model directly here
    const Hotel = require('./models/Hotel');
    
    // Search hotels by name, location or description
    const hotels = await Hotel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });
    
    return res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels
    });
  } catch (error) {
    console.error('Error searching hotels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching hotels',
      error: error.message
    });
  }
});

// Add endpoint to update price for a place/hotel
app.patch('/api/hotels/:id/price', async (req, res) => {
  try {
    const { id } = req.params;
    const { price, name } = req.body;
    
    console.log(`Updating price for hotel ${id} (${name}) to ${price}`);
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Hotel ID is required'
      });
    }
    
    if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }
    
    // Import the PlacePrice model
    let PlacePrice;
    try {
      const modelPath = path.join(__dirname, 'models', 'PlacePrice.js');
      
      if (!fs.existsSync(modelPath)) {
        console.error('PlacePrice model file does not exist at path:', modelPath);
        // Create PlacePrice schema on the fly if it doesn't exist
        const mongoose = require('mongoose');
        
        const placePriceSchema = new mongoose.Schema({
          placeId: {
            type: String,
            required: true,
            unique: true,
            index: true
          },
          name: {
            type: String,
            required: true
          },
          price: {
            type: Number,
            required: true
          },
          createdAt: {
            type: Date,
            default: Date.now
          },
          updatedAt: {
            type: Date,
            default: Date.now
          },
          updatedBy: {
            userId: {
              type: String
            },
            email: {
              type: String
            }
          }
        });
        
        PlacePrice = mongoose.model('PlacePrice', placePriceSchema, 'places_prices');
      } else {
        PlacePrice = require('./models/PlacePrice');
      }
    } catch (err) {
      console.error('Error importing or creating PlacePrice model:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error loading models',
        error: err.message
      });
    }
    
    // Find if a price already exists for this place
    let placePrice = await PlacePrice.findOne({ placeId: id });
    
    if (placePrice) {
      // Update existing price
      placePrice.price = parseFloat(price);
      placePrice.updatedAt = new Date();
      if (name) placePrice.name = name;
      
      await placePrice.save();
      
      console.log(`Updated existing price for ${id} to ${price}`);
    } else {
      // Create new price entry
      placePrice = new PlacePrice({
        placeId: id,
        name: name || `Hotel ${id}`,
        price: parseFloat(price),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await placePrice.save();
      
      console.log(`Created new price for ${id} at ${price}`);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Price updated successfully',
      data: {
        placeId: placePrice.placeId,
        price: placePrice.price
      }
    });
  } catch (error) {
    console.error('Error updating hotel price:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating hotel price',
      error: error.message
    });
  }
});

// Setup logging
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  fs.appendFile(
    path.join(__dirname, 'logs', 'server.log'),
    logMessage,
    (err) => {
      if (err) console.error('Error writing to log file:', err);
    }
  );
};

// Make logToFile available globally
global.logToFile = logToFile;

// Error handler middleware (must be after routes)
app.use(errorHandler);

// Connect to MongoDB
connectDB();

// Remove the test price seeding code
const seedTestPrices = async () => {
  // Simply log that we're not seeding test prices anymore
  console.log('Test price seeding disabled');
};

// Call the seed function when the server starts
seedTestPrices();

app.get('/api/places/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address: address,
          key: process.env.API_KEY
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Google Geocoding API:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Error accessing Google Geocoding API'
    });
  }
});

// Add a simple test endpoint that doesn't require external API calls
app.get('/api/test', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Server is working',
      timestamp: new Date().toISOString(),
      api_key_present: !!process.env.API_KEY,
      api_key_preview: process.env.API_KEY ? `${process.env.API_KEY.slice(0, 5)}...${process.env.API_KEY.slice(-5)}` : 'Missing'
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  logToFile(`Server started on port ${PORT}`);
});