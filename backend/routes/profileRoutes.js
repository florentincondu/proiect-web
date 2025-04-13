const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { profileUpload, coverUpload } = require('../middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs');

// Public route - Get Be Part of Us plans information
router.get('/be-part-of-us/plans', async (req, res) => {
  try {
    const plans = {
      title: "Be Part of Us",
      subtitle: "Alege planul care ți se potrivește",
      description: "Devino membru al comunității noastre și bucură-te de beneficii exclusive",
      plans: {
        free: {
          name: 'Free',
          subtitle: 'Client normal',
          description: 'Acces de bază la sistemul de rezervări',
          benefits: [
            'Căutare și rezervare cazări',
            'Salvare cazări favorite',
            'Notificări standard pentru rezervări',
            'Acces la funcționalitățile de bază'
          ],
          limitations: [
            'Nu poți adăuga cazări proprii',
            'Acces limitat la statistici',
            'Fără suport prioritar'
          ],
          price: 0,
          cta: 'Înregistrează-te gratuit'
        },
        pro: {
          name: 'Pro',
          subtitle: 'Adaugare cazări cu verificare admin',
          description: 'Posibilitatea de a lista proprietăți cu aprobare administrativă',
          benefits: [
            'Toate beneficiile planului Free',
            'Adăugare cazări (cu aprobare admin)',
            'Gestionare proprietăți după aprobare',
            'Statistici de bază pentru proprietăți',
            'Suport prioritar',
            'Sfaturi pentru optimizarea ofertelor'
          ],
          price: 49.99,
          interval: 'lună',
          cta: 'Începe cu Pro'
        },
        premium: {
          name: 'Premium',
          subtitle: 'Funcționalități avansate',
          description: 'Toate funcționalitățile pentru un host profesionist',
          benefits: [
            'Toate beneficiile planului Pro',
            'Aprobare rapidă pentru proprietăți',
            'Proprietăți promovate în topul căutărilor',
            'Statistici detaliate și rapoarte avansate',
            'Branding personalizat pentru proprietăți',
            'Contact direct cu clienții fără comisioane',
            'Program de loialitate cu puncte bonus'
          ],
          price: 99.99,
          interval: 'lună',
          cta: 'Devino Premium',
          mostPopular: true
        }
      },
      faqs: [
        {
          question: 'Cum pot trece de la un plan la altul?',
          answer: 'Poți oricând să faci upgrade sau downgrade din contul tău, din secțiunea "Be Part of Us". Schimbarea va fi aplicată imediat.'
        },
        {
          question: 'Există o perioadă minimă de abonament?',
          answer: 'Nu, poți anula oricând abonamentul. Pentru planurile plătite, vei avea acces până la sfârșitul perioadei plătite.'
        },
        {
          question: 'Pot obține o reducere pentru abonament anual?',
          answer: 'Da, oferim o reducere de 20% pentru abonamentele anuale la planurile Pro și Premium.'
        },
        {
          question: 'Ce se întâmplă cu proprietățile mele dacă trec de la Pro sau Premium la Free?',
          answer: 'Proprietățile tale vor rămâne în sistem, dar nu vei mai putea adăuga altele noi sau edita pe cele existente până când nu reactivezi un plan Pro sau Premium.'
        }
      ]
    };
    
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      profileImage,
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      companyDescription,
      companyLogo,
      preferences
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (profileImage) user.profileImage = profileImage;
    if (companyName) user.companyName = companyName;
    if (companyAddress) user.companyAddress = companyAddress;
    if (companyPhone) user.companyPhone = companyPhone;
    if (companyEmail) user.companyEmail = companyEmail;
    if (companyDescription) user.companyDescription = companyDescription;
    if (companyLogo) user.companyLogo = companyLogo;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get subscription details - "Be Part of Us"
router.get('/be-part-of-us', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const subscriptionInfo = {
      currentPlan: user.bePartOfUs.type,
      description: user.bePartOfUs.description[user.bePartOfUs.type],
      startDate: user.bePartOfUs.startDate,
      endDate: user.bePartOfUs.endDate,
      features: user.bePartOfUs.features,
      plans: {
        free: {
          name: 'Free',
          subtitle: 'Client normal',
          description: 'Acces de bază la sistemul de rezervări',
          features: [
            'Căutare și rezervare cazări',
            'Salvare cazări favorite',
            'Notificări standard pentru rezervări',
            'Acces la funcționalitățile de bază'
          ],
          limitations: [
            'Nu poți adăuga cazări proprii',
            'Acces limitat la statistici',
            'Fără suport prioritar'
          ],
          price: 0
        },
        pro: {
          name: 'Pro',
          subtitle: 'Adaugare cazări cu verificare admin',
          description: 'Posibilitatea de a lista proprietăți cu aprobare administrativă',
          features: [
            'Toate beneficiile planului Free',
            'Adăugare cazări (cu aprobare admin)',
            'Gestionare proprietăți după aprobare',
            'Statistici de bază pentru proprietăți',
            'Suport prioritar',
            'Sfaturi pentru optimizarea ofertelor'
          ],
          price: 49.99
        },
        premium: {
          name: 'Premium',
          subtitle: 'Funcționalități avansate',
          description: 'Toate funcționalitățile pentru un host profesionist',
          features: [
            'Toate beneficiile planului Pro',
            'Aprobare rapidă pentru proprietăți',
            'Proprietăți promovate în topul căutărilor',
            'Statistici detaliate și rapoarte avansate',
            'Branding personalizat pentru proprietăți',
            'Contact direct cu clienții fără comisioane',
            'Program de loialitate cu puncte bonus'
          ],
          price: 99.99
        }
      }
    };
    
    res.json(subscriptionInfo);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change subscription - "Be Part of Us"
router.post('/be-part-of-us/change', protect, async (req, res) => {
  try {
    const { planType, duration } = req.body;
    
    if (!['free', 'pro', 'premium'].includes(planType)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }
    
    if (!duration || duration < 1) {
      return res.status(400).json({ message: 'Duration must be at least 1 month' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate subscription end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration);

    // Set features based on plan type
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
        loyaltyProgram: false
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
        loyaltyProgram: false
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
        loyaltyProgram: true
      }
    };

    // Update user's subscription plan
    user.bePartOfUs = {
      type: planType,
      startDate,
      endDate,
      features: features[planType]
    };

    // Add to recent activity
    user.recentActivity.unshift({
      type: 'subscription',
      description: `S-a abonat la planul ${planType} pentru ${duration} luni`,
      timestamp: new Date()
    });

    await user.save();
    
    // Return detailed response
    res.json({
      message: `Felicitări! Acum ești abonat la planul ${planType.toUpperCase()}`,
      plan: {
        type: planType,
        startDate,
        endDate,
        features: user.bePartOfUs.features
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add property to favorites
router.post('/favorites/:propertyId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const propertyId = req.params.propertyId;
    if (!user.favorites.some(fav => fav.propertyId.toString() === propertyId)) {
      user.favorites.push({ propertyId });
      
      // Add to recent activity
      user.recentActivity.unshift({
        type: 'favorite',
        description: 'A adăugat o proprietate la favorite',
        timestamp: new Date()
      });
      
      await user.save();
      res.json(user.favorites);
    } else {
      res.status(400).json({ message: 'Property already in favorites' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove property from favorites
router.delete('/favorites/:propertyId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const propertyId = req.params.propertyId;
    user.favorites = user.favorites.filter(fav => fav.propertyId.toString() !== propertyId);
    await user.save();
    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user favorites
router.get('/favorites', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favorites.propertyId');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get property details for a user
router.get('/properties', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user can add properties based on subscription
    if (!user.bePartOfUs.features.addProperties) {
      return res.status(403).json({ 
        message: 'Planul tău nu permite adăugarea de proprietăți. Actualizează la planul Pro sau Premium.',
        currentPlan: user.bePartOfUs.type,
        upgradeOptions: ['pro', 'premium']
      });
    }
    
    const properties = await User.findById(req.user.id)
      .populate('properties.propertyId')
      .select('properties');
      
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update preferences
router.put('/preferences', protect, async (req, res) => {
  try {
    const { notifications, language, theme } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (notifications) {
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...notifications
      };
    }

    if (language) {
      user.preferences.language = language;
    }

    if (theme) {
      user.preferences.theme = theme;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics
router.get('/statistics', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has access to advanced statistics
    if (!user.bePartOfUs.features.advancedStatistics) {
      // Provide basic statistics only
      return res.status(403).json({ 
        message: 'Statisticile avansate necesită un abonament Premium',
        basicStats: {
          totalLogins: user.statistics.totalLogins,
          daysActive: user.statistics.daysActive,
          completedActions: user.statistics.completedActions,
          averageRating: user.statistics.averageRating
        },
        upgradeToPremium: true
      });
    }

    // Provide all statistics
    res.json(user.statistics);
  } catch (error) {
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

    if (typeof twoFactorEnabled === 'boolean') {
      user.security = user.security || {};
      user.security.twoFactorEnabled = twoFactorEnabled;
    }

    if (typeof emailNotifications === 'boolean') {
      user.security = user.security || {};
      user.security.emailNotifications = emailNotifications;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update theme preference
router.put('/theme', protect, async (req, res) => {
  try {
    const { theme } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.preferences = user.preferences || {};
    user.preferences.theme = theme;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile image
router.post('/upload-profile-image', protect, profileUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    console.log('Profile image uploaded:', req.file);
    
    // Extract just the relative path - from /uploads/profile/filename.jpg
    const relativePath = `/uploads/profile/${path.basename(req.file.path)}`;
    console.log('Relative path to be saved:', relativePath);
    
    const user = await User.findById(req.user.id);
    
    // If user already has profile image, delete the old one
    if (user.profileImage) {
      try {
        const oldImagePath = path.join(__dirname, '..', user.profileImage.replace(/^\//, ''));
        console.log('Attempting to delete old profile image:', oldImagePath);
        
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('Old profile image deleted successfully');
        }
      } catch (err) {
        console.error('Error deleting old profile image:', err);
      }
    }
    
    // Update user with the new profile image path
    user.profileImage = relativePath;
    await user.save();
    
    res.json({ 
      message: 'Profile image uploaded successfully',
      profileImage: relativePath
    });
  } catch (err) {
    console.error('Error uploading profile image:', err);
    res.status(500).json({ message: 'Server error during image upload' });
  }
});

// Upload cover image
router.post('/upload-cover-image', protect, coverUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    console.log('Cover image uploaded:', req.file);
    
    // Extract just the relative path - from /uploads/cover/filename.jpg
    const relativePath = `/uploads/cover/${path.basename(req.file.path)}`;
    console.log('Relative path to be saved:', relativePath);
    
    const user = await User.findById(req.user.id);
    
    // If user already has cover image, delete the old one
    if (user.coverImage) {
      try {
        const oldImagePath = path.join(__dirname, '..', user.coverImage.replace(/^\//, ''));
        console.log('Attempting to delete old cover image:', oldImagePath);
        
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log('Old cover image deleted successfully');
        }
      } catch (err) {
        console.error('Error deleting old cover image:', err);
      }
    }
    
    // Update user with the new cover image path
    user.coverImage = relativePath;
    await user.save();
    
    res.json({ 
      message: 'Cover image uploaded successfully',
      coverImage: relativePath
    });
  } catch (err) {
    console.error('Error uploading cover image:', err);
    res.status(500).json({ message: 'Server error during image upload' });
  }
});

module.exports = router; 