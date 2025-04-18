const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const connectDB = require('./db');
const errorHandler = require('./middlewares/errorHandler');

dotenv.config();
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/check-uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads');
  
  try {
    if (!fs.existsSync(uploadsPath)) {
      return res.status(404).json({ 
        error: 'Uploads directory not found',
        path: uploadsPath
      });
    }
    
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


app.get('/api/debug/status', (req, res) => {
  res.json({
    status: 'OK',
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongoDBConnected: mongoose.connection.readyState === 1,
    apiVersion: '1.0.0',
    routes: {
      hotels: '/api/hotels',
      auth: '/api/auth',
      users: '/api/users'
    }
  });
});


app.get('/api/debug/hotels', async (req, res) => {
  try {

    const Hotel = mongoose.models.Hotel || require('./models/Hotel');
    

    const count = await Hotel.countDocuments();
    
    res.json({
      success: true,
      count,
      hotelRoutesRegistered: true,
      message: `The hotels API is properly set up. Found ${count} hotels in the database.`,
      sampleEndpoints: [
        '/api/hotels',
        '/api/hotels/user/my-hotels',
        '/api/hotels/user-hotel'
      ]
    });
  } catch (error) {
    console.error('Debug hotel route error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

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


app.use('/api/*', (req, res, next) => {

  if (res.headersSent) {
    return next();
  }
  
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested URL ${req.originalUrl} was not found on this server.`,
    availableEndpoints: [
      '/api/hotels',
      '/api/auth',
      '/api/users',
      '/api/bookings',
      '/api/places',
      '/api/debug/status',
      '/api/debug/hotels'
    ]
  });
});

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Created logs directory at:', logsDir);
}


app.get('/api/hotels/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    

    const Hotel = require('./models/Hotel');
    

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
    

    let PlacePrice;
    try {
      const modelPath = path.join(__dirname, 'models', 'PlacePrice.js');
      
      if (!fs.existsSync(modelPath)) {
        console.error('PlacePrice model file does not exist at path:', modelPath);

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
    

    let placePrice = await PlacePrice.findOne({ placeId: id });
    
    if (placePrice) {

      placePrice.price = parseFloat(price);
      placePrice.updatedAt = new Date();
      if (name) placePrice.name = name;
      
      await placePrice.save();
      
      console.log(`Updated existing price for ${id} to ${price}`);
    } else {

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


global.logToFile = logToFile;


app.use(errorHandler);


connectDB();


const seedTestPrices = async () => {

  console.log('Test price seeding disabled');
};


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


app.get('/api/places/geocode/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          latlng: `${lat},${lng}`,
          key: process.env.API_KEY
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Google Reverse Geocoding API:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Error accessing Google Reverse Geocoding API'
    });
  }
});


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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  logToFile(`Server started on port ${PORT}`);
});