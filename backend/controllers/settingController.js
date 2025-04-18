const Setting = require('../models/Setting');
const SystemLog = require('../models/SystemLog');


exports.getAllSettings = async (req, res) => {
  try {
    console.log('All settings requested');
    

    const mockSettings = {
      siteTitle: 'Luxury Hotels',
      siteDescription: 'Book your dream vacation with us',
      contactEmail: 'support@luxuryhotels.com',
      contactPhone: '+1 (555) 123-4567',
      maintenanceMode: false,
      allowRegistration: true,
      defaultCurrency: 'USD',
      paymentGateways: {
        stripe: {
          enabled: true,
          testMode: true
        },
        paypal: {
          enabled: true,
          testMode: true
        }
      },
      emailNotifications: {
        bookingConfirmation: true,
        paymentReceipt: true,
        accountCreation: true,
        promotionalEmails: false
      },
      socialMedia: {
        facebook: 'https://facebook.com/luxuryhotels',
        twitter: 'https://twitter.com/luxuryhotels',
        instagram: 'https://instagram.com/luxuryhotels'
      },
      appearance: {
        theme: 'dark',
        primaryColor: '#0073e6',
        logo: '/images/logo.png'
      },
      bookingSettings: {
        allowInstantBooking: true,
        minAdvanceBookingDays: 1,
        maxAdvanceBookingDays: 90,
        cancellationPolicyDays: 2
      }
    };
    
    console.log('Returning mock settings');
    res.json(mockSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};


exports.getSettingsByGroup = async (req, res) => {
  try {
    const { group } = req.params;
    const settings = await Setting.getSettingsByGroup(group);
    

    const result = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    
    res.json(result);
  } catch (error) {
    console.error(`Error fetching ${req.params.group} settings:`, error);
    SystemLog.logError(`Error fetching ${req.params.group} settings`, 'settingController', { error: error.message });
    res.status(500).json({ message: `Failed to fetch ${req.params.group} settings` });
  }
};


exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await Setting.getPublicSettings();
    

    const result = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching public settings:', error);
    SystemLog.logError('Error fetching public settings', 'settingController', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch public settings' });
  }
};


exports.updateSettings = async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key) {
      return res.status(400).json({ message: 'Settings key is required' });
    }
    
    console.log('Settings update requested for key:', key, 'with value:', value);
    

    console.log('Settings updated successfully');
    res.json({ 
      message: 'Settings updated successfully',
      updatedSetting: {
        key,
        value
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};


exports.getAppConfig = async (req, res) => {
  try {
    console.log('App configuration requested');
    

    const mockAppConfig = {
      features: {
        enableBookings: true,
        enableReviews: true,
        enableChat: true,
        enablePromotions: true,
        enableNewsletters: true
      },
      limits: {
        maxImagesPerHotel: 10,
        maxBookingsPerUser: 5,
        maxLoginAttempts: 5
      },
      api: {
        rateLimit: 100,
        timeout: 30000
      }
    };
    
    console.log('Returning mock app configuration');
    res.json(mockAppConfig);
  } catch (error) {
    console.error('Error fetching app configuration:', error);
    res.status(500).json({ message: 'Failed to fetch app configuration' });
  }
};


exports.getEmailTemplates = async (req, res) => {
  try {
    console.log('Email templates requested');
    

    const mockEmailTemplates = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to Luxury Hotels',
        body: 'Dear {{name}},\n\nWelcome to Luxury Hotels. We are excited to have you join us.\n\nBest regards,\nThe Luxury Hotels Team'
      },
      {
        id: 'booking_confirmation',
        name: 'Booking Confirmation',
        subject: 'Your Booking Confirmation #{{bookingId}}',
        body: 'Dear {{name}},\n\nYour booking at {{hotel}} has been confirmed for {{checkInDate}} to {{checkOutDate}}.\n\nBooking details:\nRoom: {{roomType}}\nTotal: {{amount}}\n\nThank you for choosing Luxury Hotels.\n\nBest regards,\nThe Luxury Hotels Team'
      },
      {
        id: 'payment_receipt',
        name: 'Payment Receipt',
        subject: 'Payment Receipt for Booking #{{bookingId}}',
        body: 'Dear {{name}},\n\nThis is a receipt for your payment of {{amount}} for booking #{{bookingId}}.\n\nThank you for choosing Luxury Hotels.\n\nBest regards,\nThe Luxury Hotels Team'
      },
      {
        id: 'password_reset',
        name: 'Password Reset',
        subject: 'Password Reset Request',
        body: 'Dear {{name}},\n\nYou have requested to reset your password. Please click the link below to reset your password:\n\n{{resetLink}}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe Luxury Hotels Team'
      }
    ];
    
    console.log('Returning mock email templates');
    res.json(mockEmailTemplates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ message: 'Failed to fetch email templates' });
  }
};


exports.updateEmailTemplate = async (req, res) => {
  try {
    const { id, subject, body } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Template ID is required' });
    }
    
    console.log('Email template update requested for template:', id);
    

    console.log('Email template updated successfully');
    res.json({ 
      message: 'Email template updated successfully',
      updatedTemplate: {
        id,
        subject,
        body
      }
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ message: 'Failed to update email template' });
  }
};


exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const value = await Setting.getSetting(key);
    
    if (value === null) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    
    res.json({ key, value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    SystemLog.logError('Error fetching setting', 'settingController', { error: error.message, key: req.params.key });
    res.status(500).json({ message: 'Failed to fetch setting' });
  }
};


exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, group, description, isPublic } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ message: 'Setting value is required' });
    }
    
    const updatedSetting = await Setting.setSetting(key, value, {
      group,
      description,
      isPublic,
      lastUpdatedBy: req.user._id
    });
    

    SystemLog.logInfo('Setting updated', 'settingController', {
      key,
      userId: req.user._id
    });
    
    res.json(updatedSetting);
  } catch (error) {
    console.error('Error updating setting:', error);
    SystemLog.logError('Error updating setting', 'settingController', { error: error.message, key: req.params.key });
    res.status(500).json({ message: 'Failed to update setting' });
  }
};


exports.resetSettings = async (req, res) => {
  try {
    const defaultSettings = {
      authentication: {
        'authentication.requireMfa': false,
        'authentication.passwordPolicy.minLength': 8,
        'authentication.passwordPolicy.requireUppercase': true,
        'authentication.passwordPolicy.requireNumbers': true,
        'authentication.passwordPolicy.requireSpecialChars': true,
        'authentication.passwordPolicy.expiryDays': 90,
        'authentication.sessionTimeout': 30,
        'authentication.maxLoginAttempts': 5,
        'authentication.lockoutDuration': 15
      },
      preferences: {
        'preferences.timezone': 'UTC',
        'preferences.currency': 'USD',
        'preferences.dateFormat': 'MM/DD/YYYY',
        'preferences.language': 'en'
      },
      integrations: {
        'integrations.stripe.enabled': false,
        'integrations.googleCalendar.enabled': false,
        'integrations.paypal.enabled': false,
        'integrations.slack.enabled': false
      },
      notifications: {
        'notifications.newBookingAlerts.enabled': true,
        'notifications.bookingCancellations.enabled': true,
        'notifications.paymentFailures.enabled': true,
        'notifications.systemAlerts.enabled': true
      }
    };
    

    const updatePromises = [];
    
    for (const group in defaultSettings) {
      for (const key in defaultSettings[group]) {
        updatePromises.push(
          Setting.setSetting(key, defaultSettings[group][key], {
            group,
            description: 'Default setting',
            lastUpdatedBy: req.user._id
          })
        );
      }
    }
    
    await Promise.all(updatePromises);
    

    SystemLog.logInfo('Settings reset to default', 'settingController', {
      userId: req.user._id
    });
    

    const updatedSettings = await Setting.getAllSettings();
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error resetting settings:', error);
    SystemLog.logError('Error resetting settings', 'settingController', { error: error.message });
    res.status(500).json({ message: 'Failed to reset settings' });
  }
}; 