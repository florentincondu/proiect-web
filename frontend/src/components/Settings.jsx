import React, { useState, useEffect } from 'react';
import { 
  FaShieldAlt, 
  FaGlobe, 
  FaPuzzlePiece, 
  FaBell, 
  FaEye, 
  FaEyeSlash, 
  FaSave, 
  FaCheck,
  FaExclamationTriangle,
  FaClock,
  FaDollarSign,
  FaEnvelope,
  FaStripe,
  FaGoogle,
  FaPaypal,
  FaSlack,
  FaMobile,
  FaKey,
  FaLock,
  FaToggleOn,
  FaToggleOff,
  FaPlus,
  FaTrash,
  FaInfoCircle,
} from 'react-icons/fa';
import axios from 'axios';

const Settings = () => {
  // Active tab state
  const [activeTab, setActiveTab] = useState('authentication');
  
  // Form states for each settings section
  const [authSettings, setAuthSettings] = useState({
    requireMfa: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90
    },
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
  });
  
  const [appPreferences, setAppPreferences] = useState({
    timezone: 'UTC',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    language: 'en',
    emailTemplates: {
      bookingConfirmation: {
        subject: 'Your booking confirmation from Boksy',
        body: 'Thank you for booking with Boksy! Your booking details are as follows: {{bookingDetails}}'
      },
      cancellationNotification: {
        subject: 'Booking cancellation notification',
        body: 'Your booking has been cancelled. {{cancellationDetails}}'
      },
      adminBookingAlert: {
        subject: 'New booking alert',
        body: 'A new booking has been made. {{bookingDetails}}'
      }
    }
  });
  
  const [integrations, setIntegrations] = useState({
    stripe: {
      enabled: true,
      publicKey: 'pk_test_***************************',
      secretKey: 'sk_test_***************************',
      webhookSecret: 'whsec_**************************'
    },
    googleCalendar: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      redirectUri: ''
    },
    paypal: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      sandbox: true
    },
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '#bookings'
    }
  });
  
  const [notifications, setNotifications] = useState({
    newBookingAlerts: {
      enabled: true,
      recipients: ['admin@boksy.com'],
      channels: ['email', 'dashboard']
    },
    bookingCancellations: {
      enabled: true,
      recipients: ['admin@boksy.com', 'support@boksy.com'],
      channels: ['email', 'dashboard', 'sms']
    },
    paymentFailures: {
      enabled: true,
      recipients: ['admin@boksy.com', 'finance@boksy.com'],
      channels: ['email', 'dashboard', 'sms']
    },
    systemAlerts: {
      enabled: true,
      recipients: ['admin@boksy.com', 'tech@boksy.com'],
      channels: ['email', 'dashboard', 'sms']
    }
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showSecrets, setShowSecrets] = useState({});
  const [isEditing, setIsEditing] = useState(null);
  
  // Load settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // In production, replace with actual API call
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/settings`
        );
        
        // Update states with fetched data
        // This is commented out since we're using mock data for now
        // setAuthSettings(response.data.authSettings);
        // setAppPreferences(response.data.appPreferences);
        // setIntegrations(response.data.integrations);
        // setNotifications(response.data.notifications);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        setError('Failed to load settings. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Save settings to API
  const saveSettings = async (settingType) => {
    setLoading(true);
    setSuccess('');
    setError('');
    
    let dataToSave;
    
    switch (settingType) {
      case 'authentication':
        dataToSave = { authSettings };
        break;
      case 'preferences':
        dataToSave = { appPreferences };
        break;
      case 'integrations':
        dataToSave = { integrations };
        break;
      case 'notifications':
        dataToSave = { notifications };
        break;
      default:
        dataToSave = { 
          authSettings, 
          appPreferences, 
          integrations, 
          notifications 
        };
    }
    
    try {
      // In production, replace with actual API call
      // const response = await axios.put(
      //   `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/settings`,
      //   dataToSave
      // );
      
      // Simulate API call for mock
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSuccess(`${settingType.charAt(0).toUpperCase() + settingType.slice(1)} settings updated successfully!`);
      setIsEditing(null);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError(`Failed to save ${settingType} settings. Please try again.`);
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle password/secret visibility
  const toggleSecretVisibility = (key) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Handle form input changes
  const handleAuthSettingChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setAuthSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setAuthSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  const handleAppPrefChange = (field, value) => {
    if (field.includes('.')) {
      // Handle nested properties like emailTemplates.bookingConfirmation.subject
      const parts = field.split('.');
      if (parts.length === 3) {
        const [parent, child, subChild] = parts;
        setAppPreferences(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [subChild]: value
            }
          }
        }));
      } else {
        const [parent, child] = parts;
        setAppPreferences(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        }));
      }
    } else {
      setAppPreferences(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  const handleIntegrationChange = (integration, field, value) => {
    setIntegrations(prev => ({
      ...prev,
      [integration]: {
        ...prev[integration],
        [field]: value
      }
    }));
  };
  
  const handleNotificationChange = (notificationType, field, value) => {
    setNotifications(prev => ({
      ...prev,
      [notificationType]: {
        ...prev[notificationType],
        [field]: value
      }
    }));
  };
  
  const handleRecipientChange = (notificationType, index, value) => {
    const updatedRecipients = [...notifications[notificationType].recipients];
    updatedRecipients[index] = value;
    
    setNotifications(prev => ({
      ...prev,
      [notificationType]: {
        ...prev[notificationType],
        recipients: updatedRecipients
      }
    }));
  };
  
  const addRecipient = (notificationType) => {
    setNotifications(prev => ({
      ...prev,
      [notificationType]: {
        ...prev[notificationType],
        recipients: [...prev[notificationType].recipients, '']
      }
    }));
  };
  
  const removeRecipient = (notificationType, index) => {
    const updatedRecipients = [...notifications[notificationType].recipients];
    updatedRecipients.splice(index, 1);
    
    setNotifications(prev => ({
      ...prev,
      [notificationType]: {
        ...prev[notificationType],
        recipients: updatedRecipients
      }
    }));
  };
  
  const toggleNotificationChannel = (notificationType, channel) => {
    const currentChannels = notifications[notificationType].channels;
    let updatedChannels;
    
    if (currentChannels.includes(channel)) {
      updatedChannels = currentChannels.filter(c => c !== channel);
    } else {
      updatedChannels = [...currentChannels, channel];
    }
    
    setNotifications(prev => ({
      ...prev,
      [notificationType]: {
        ...prev[notificationType],
        channels: updatedChannels
      }
    }));
  };
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'authentication':
        return renderAuthenticationSettings();
      case 'preferences':
        return renderAppPreferences();
      case 'integrations':
        return renderIntegrations();
      case 'notifications':
        return renderNotifications();
      default:
        return renderAuthenticationSettings();
    }
  };
  
  // Setting section components
  const renderAuthenticationSettings = () => (
    <div className="space-y-6">
      <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <FaLock className="text-blue-500 mr-2" />
          Password Policy
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="minLength" className="block text-sm font-medium text-gray-400 mb-1">
              Minimum Password Length
            </label>
            <div className="flex">
              <input
                type="number"
                id="minLength"
                value={authSettings.passwordPolicy.minLength}
                onChange={(e) => handleAuthSettingChange('passwordPolicy.minLength', parseInt(e.target.value))}
                className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
                min="6"
                max="32"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="expiryDays" className="block text-sm font-medium text-gray-400 mb-1">
              Password Expiry (days)
            </label>
            <div className="flex">
              <input
                type="number"
                id="expiryDays"
                value={authSettings.passwordPolicy.expiryDays}
                onChange={(e) => handleAuthSettingChange('passwordPolicy.expiryDays', parseInt(e.target.value))}
                className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
                min="0"
                max="365"
              />
              <div className="text-xs text-gray-500 mt-1">
                Set to 0 for no expiry
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="requireUppercase"
              checked={authSettings.passwordPolicy.requireUppercase}
              onChange={(e) => handleAuthSettingChange('passwordPolicy.requireUppercase', e.target.checked)}
              className="w-4 h-4 text-blue-500"
            />
            <label htmlFor="requireUppercase" className="text-sm font-medium text-gray-300">
              Require uppercase letters
            </label>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="requireNumbers"
              checked={authSettings.passwordPolicy.requireNumbers}
              onChange={(e) => handleAuthSettingChange('passwordPolicy.requireNumbers', e.target.checked)}
              className="w-4 h-4 text-blue-500"
            />
            <label htmlFor="requireNumbers" className="text-sm font-medium text-gray-300">
              Require numbers
            </label>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="requireSpecialChars"
              checked={authSettings.passwordPolicy.requireSpecialChars}
              onChange={(e) => handleAuthSettingChange('passwordPolicy.requireSpecialChars', e.target.checked)}
              className="w-4 h-4 text-blue-500"
            />
            <label htmlFor="requireSpecialChars" className="text-sm font-medium text-gray-300">
              Require special characters
            </label>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <FaKey className="text-blue-500 mr-2" />
          Authentication Options
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="requireMfa"
              checked={authSettings.requireMfa}
              onChange={(e) => handleAuthSettingChange('requireMfa', e.target.checked)}
              className="w-4 h-4 text-blue-500"
            />
            <label htmlFor="requireMfa" className="text-sm font-medium text-gray-300">
              Require Multi-Factor Authentication for all admins
            </label>
          </div>
          
          <div>
            <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-400 mb-1">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              id="sessionTimeout"
              value={authSettings.sessionTimeout}
              onChange={(e) => handleAuthSettingChange('sessionTimeout', parseInt(e.target.value))}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
              min="5"
              max="1440"
            />
          </div>
          
          <div>
            <label htmlFor="maxLoginAttempts" className="block text-sm font-medium text-gray-400 mb-1">
              Max Failed Login Attempts
            </label>
            <input
              type="number"
              id="maxLoginAttempts"
              value={authSettings.maxLoginAttempts}
              onChange={(e) => handleAuthSettingChange('maxLoginAttempts', parseInt(e.target.value))}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
              min="3"
              max="10"
            />
          </div>
          
          <div>
            <label htmlFor="lockoutDuration" className="block text-sm font-medium text-gray-400 mb-1">
              Account Lockout Duration (minutes)
            </label>
            <input
              type="number"
              id="lockoutDuration"
              value={authSettings.lockoutDuration}
              onChange={(e) => handleAuthSettingChange('lockoutDuration', parseInt(e.target.value))}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
              min="5"
              max="1440"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('authentication')}
          disabled={loading}
          className={`flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          ) : (
            <FaSave className="mr-2" />
          )}
          Save Authentication Settings
        </button>
      </div>
    </div>
  );
  
  const renderAppPreferences = () => (
    <div className="space-y-6">
      <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <FaGlobe className="text-blue-500 mr-2" />
          Regional Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-400 mb-1">
              Default Timezone
            </label>
            <select
              id="timezone"
              value={appPreferences.timezone}
              onChange={(e) => handleAppPrefChange('timezone', e.target.value)}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">GMT (Greenwich Mean Time)</option>
              <option value="Europe/Paris">CET (Central European Time)</option>
              <option value="Asia/Tokyo">JST (Japan Standard Time)</option>
              <option value="Australia/Sydney">AEST (Australian Eastern Standard Time)</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-400 mb-1">
              Default Currency
            </label>
            <select
              id="currency"
              value={appPreferences.currency}
              onChange={(e) => handleAppPrefChange('currency', e.target.value)}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
            >
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
              <option value="JPY">JPY (Japanese Yen)</option>
              <option value="CAD">CAD (Canadian Dollar)</option>
              <option value="AUD">AUD (Australian Dollar)</option>
              <option value="CNY">CNY (Chinese Yuan)</option>
              <option value="INR">INR (Indian Rupee)</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-400 mb-1">
              Date Format
            </label>
            <select
              id="dateFormat"
              value={appPreferences.dateFormat}
              onChange={(e) => handleAppPrefChange('dateFormat', e.target.value)}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD.MM.YYYY">DD.MM.YYYY</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-400 mb-1">
              Default Language
            </label>
            <select
              id="language"
              value={appPreferences.language}
              onChange={(e) => handleAppPrefChange('language', e.target.value)}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ru">Russian</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <FaEnvelope className="text-blue-500 mr-2" />
          Email Templates
        </h3>
        
        <div className="space-y-6">
          {Object.entries(appPreferences.emailTemplates).map(([key, template]) => (
            <div key={key} className="border border-gray-700 rounded-lg p-4">
              <h4 className="text-lg font-medium text-white mb-3 capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor={`${key}-subject`} className="block text-sm font-medium text-gray-400 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    id={`${key}-subject`}
                    value={template.subject}
                    onChange={(e) => handleAppPrefChange(`emailTemplates.${key}.subject`, e.target.value)}
                    className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor={`${key}-body`} className="block text-sm font-medium text-gray-400 mb-1">
                    Email Body
                  </label>
                  <textarea
                    id={`${key}-body`}
                    value={template.body}
                    onChange={(e) => handleAppPrefChange(`emailTemplates.${key}.body`, e.target.value)}
                    className="bg-gray-800 text-white rounded-md px-3 py-2 w-full h-24"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Available variables: {"{{{bookingDetails}}}, {{{cancellationDetails}}}, {{{customerName}}}"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('preferences')}
          disabled={loading}
          className={`flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          ) : (
            <FaSave className="mr-2" />
          )}
          Save App Preferences
        </button>
      </div>
    </div>
  );
  
  const renderIntegrations = () => (
    <div className="space-y-6">
      {/* Stripe Integration */}
      <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <FaStripe className="text-blue-500 mr-2" />
            Stripe Integration
          </h3>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">
              {integrations.stripe.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <button 
              onClick={() => handleIntegrationChange('stripe', 'enabled', !integrations.stripe.enabled)}
              className="focus:outline-none"
            >
              {integrations.stripe.enabled ? (
                <FaToggleOn className="text-blue-500 text-2xl" />
              ) : (
                <FaToggleOff className="text-gray-600 text-2xl" />
              )}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="stripePublicKey" className="block text-sm font-medium text-gray-400 mb-1">
              Public Key
            </label>
            <div className="relative">
              <input
                type={showSecrets.stripePublicKey ? "text" : "password"}
                id="stripePublicKey"
                value={integrations.stripe.publicKey}
                onChange={(e) => handleIntegrationChange('stripe', 'publicKey', e.target.value)}
                className="bg-gray-800 text-white rounded-md px-3 py-2 w-full pr-10"
                placeholder="pk_test_..."
                disabled={!integrations.stripe.enabled}
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('stripePublicKey')}
                className="absolute right-2 top-2 text-gray-400"
              >
                {showSecrets.stripePublicKey ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="stripeSecretKey" className="block text-sm font-medium text-gray-400 mb-1">
              Secret Key
            </label>
            <div className="relative">
              <input
                type={showSecrets.stripeSecretKey ? "text" : "password"}
                id="stripeSecretKey"
                value={integrations.stripe.secretKey}
                onChange={(e) => handleIntegrationChange('stripe', 'secretKey', e.target.value)}
                className="bg-gray-800 text-white rounded-md px-3 py-2 w-full pr-10"
                placeholder="sk_test_..."
                disabled={!integrations.stripe.enabled}
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('stripeSecretKey')}
                className="absolute right-2 top-2 text-gray-400"
              >
                {showSecrets.stripeSecretKey ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="stripeWebhookSecret" className="block text-sm font-medium text-gray-400 mb-1">
              Webhook Secret
            </label>
            <div className="relative">
              <input
                type={showSecrets.stripeWebhookSecret ? "text" : "password"}
                id="stripeWebhookSecret"
                value={integrations.stripe.webhookSecret}
                onChange={(e) => handleIntegrationChange('stripe', 'webhookSecret', e.target.value)}
                className="bg-gray-800 text-white rounded-md px-3 py-2 w-full pr-10"
                placeholder="whsec_..."
                disabled={!integrations.stripe.enabled}
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('stripeWebhookSecret')}
                className="absolute right-2 top-2 text-gray-400"
              >
                {showSecrets.stripeWebhookSecret ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Google Calendar Integration */}
      <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <FaGoogle className="text-blue-500 mr-2" />
            Google Calendar Integration
          </h3>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">
              {integrations.googleCalendar.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <button 
              onClick={() => handleIntegrationChange('googleCalendar', 'enabled', !integrations.googleCalendar.enabled)}
              className="focus:outline-none"
            >
              {integrations.googleCalendar.enabled ? (
                <FaToggleOn className="text-blue-500 text-2xl" />
              ) : (
                <FaToggleOff className="text-gray-600 text-2xl" />
              )}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="googleClientId" className="block text-sm font-medium text-gray-400 mb-1">
              Client ID
            </label>
            <input
              type="text"
              id="googleClientId"
              value={integrations.googleCalendar.clientId}
              onChange={(e) => handleIntegrationChange('googleCalendar', 'clientId', e.target.value)}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
              disabled={!integrations.googleCalendar.enabled}
            />
          </div>
          
          <div>
            <label htmlFor="googleClientSecret" className="block text-sm font-medium text-gray-400 mb-1">
              Client Secret
            </label>
            <div className="relative">
              <input
                type={showSecrets.googleClientSecret ? "text" : "password"}
                id="googleClientSecret"
                value={integrations.googleCalendar.clientSecret}
                onChange={(e) => handleIntegrationChange('googleCalendar', 'clientSecret', e.target.value)}
                className="bg-gray-800 text-white rounded-md px-3 py-2 w-full pr-10"
                disabled={!integrations.googleCalendar.enabled}
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('googleClientSecret')}
                className="absolute right-2 top-2 text-gray-400"
              >
                {showSecrets.googleClientSecret ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="googleRedirectUri" className="block text-sm font-medium text-gray-400 mb-1">
              Redirect URI
            </label>
            <input
              type="text"
              id="googleRedirectUri"
              value={integrations.googleCalendar.redirectUri}
              onChange={(e) => handleIntegrationChange('googleCalendar', 'redirectUri', e.target.value)}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
              disabled={!integrations.googleCalendar.enabled}
            />
          </div>
        </div>
      </div>

      {/* PayPal Integration */}
      <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <FaPaypal className="text-blue-500 mr-2" />
            PayPal Integration
          </h3>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">
              {integrations.paypal.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <button 
              onClick={() => handleIntegrationChange('paypal', 'enabled', !integrations.paypal.enabled)}
              className="focus:outline-none"
            >
              {integrations.paypal.enabled ? (
                <FaToggleOn className="text-blue-500 text-2xl" />
              ) : (
                <FaToggleOff className="text-gray-600 text-2xl" />
              )}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="paypalClientId" className="block text-sm font-medium text-gray-400 mb-1">
              Client ID
            </label>
            <input
              type="text"
              id="paypalClientId"
              value={integrations.paypal.clientId}
              onChange={(e) => handleIntegrationChange('paypal', 'clientId', e.target.value)}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
              disabled={!integrations.paypal.enabled}
            />
          </div>
          
          <div>
            <label htmlFor="paypalClientSecret" className="block text-sm font-medium text-gray-400 mb-1">
              Client Secret
            </label>
            <div className="relative">
              <input
                type={showSecrets.paypalClientSecret ? "text" : "password"}
                id="paypalClientSecret"
                value={integrations.paypal.clientSecret}
                onChange={(e) => handleIntegrationChange('paypal', 'clientSecret', e.target.value)}
                className="bg-gray-800 text-white rounded-md px-3 py-2 w-full pr-10"
                disabled={!integrations.paypal.enabled}
              />
              <button
                type="button"
                onClick={() => toggleSecretVisibility('paypalClientSecret')}
                className="absolute right-2 top-2 text-gray-400"
              >
                {showSecrets.paypalClientSecret ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="paypalSandbox"
              checked={integrations.paypal.sandbox}
              onChange={(e) => handleIntegrationChange('paypal', 'sandbox', e.target.checked)}
              className="w-4 h-4 text-blue-500"
              disabled={!integrations.paypal.enabled}
            />
            <label htmlFor="paypalSandbox" className="text-sm font-medium text-gray-300">
              Sandbox Mode
            </label>
          </div>
        </div>
      </div>

      {/* Slack Integration */}
      <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <FaSlack className="text-blue-500 mr-2" />
            Slack Integration
          </h3>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">
              {integrations.slack.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <button 
              onClick={() => handleIntegrationChange('slack', 'enabled', !integrations.slack.enabled)}
              className="focus:outline-none"
            >
              {integrations.slack.enabled ? (
                <FaToggleOn className="text-blue-500 text-2xl" />
              ) : (
                <FaToggleOff className="text-gray-600 text-2xl" />
              )}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="slackWebhookUrl" className="block text-sm font-medium text-gray-400 mb-1">
              Webhook URL
            </label>
            <input
              type="text"
              id="slackWebhookUrl"
              value={integrations.slack.webhookUrl}
              onChange={(e) => handleIntegrationChange('slack', 'webhookUrl', e.target.value)}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
              disabled={!integrations.slack.enabled}
            />
          </div>
          
          <div>
            <label htmlFor="slackChannel" className="block text-sm font-medium text-gray-400 mb-1">
              Channel
            </label>
            <input
              type="text"
              id="slackChannel"
              value={integrations.slack.channel}
              onChange={(e) => handleIntegrationChange('slack', 'channel', e.target.value)}
              className="bg-gray-800 text-white rounded-md px-3 py-2 w-full"
              disabled={!integrations.slack.enabled}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('integrations')}
          disabled={loading}
          className={`flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          ) : (
            <FaSave className="mr-2" />
          )}
          Save Integrations
        </button>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      {Object.entries(notifications).map(([type, config]) => (
        <div key={type} className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-6 backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              <FaBell className="text-blue-500 mr-2" />
              {type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </h3>
            <div className="flex items-center">
              <span className="text-sm text-gray-400 mr-2">
                {config.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <button 
                onClick={() => handleNotificationChange(type, 'enabled', !config.enabled)}
                className="focus:outline-none"
              >
                {config.enabled ? (
                  <FaToggleOn className="text-blue-500 text-2xl" />
                ) : (
                  <FaToggleOff className="text-gray-600 text-2xl" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Recipients
              </label>
              {config.recipients.map((recipient, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => handleRecipientChange(type, index, e.target.value)}
                    className="bg-gray-800 text-white rounded-md px-3 py-2 flex-grow"
                    placeholder="email@example.com"
                    disabled={!config.enabled}
                  />
                  {config.recipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient(type, index)}
                      className="text-red-500 hover:text-red-600"
                      disabled={!config.enabled}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addRecipient(type)}
                className="text-blue-500 hover:text-blue-600 flex items-center"
                disabled={!config.enabled}
              >
                <FaPlus className="mr-1" /> Add Recipient
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Notification Channels
              </label>
              <div className="flex space-x-4">
                {['email', 'dashboard', 'sms'].map(channel => (
                  <div key={channel} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${type}-${channel}`}
                      checked={config.channels.includes(channel)}
                      onChange={() => toggleNotificationChannel(type, channel)}
                      className="w-4 h-4 text-blue-500"
                      disabled={!config.enabled}
                    />
                    <label htmlFor={`${type}-${channel}`} className="text-sm text-gray-300 capitalize">
                      {channel}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('notifications')}
          disabled={loading}
          className={`flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          ) : (
            <FaSave className="mr-2" />
          )}
          Save Notifications
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <FaShieldAlt className="text-blue-500 mr-2" />
          Settings
        </h1>

        {success && (
          <div className="mb-4 p-3 bg-green-500 bg-opacity-20 rounded-md flex items-center">
            <FaCheck className="text-green-500 mr-2" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-20 rounded-md flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-2" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 bg-opacity-90 rounded-xl shadow-lg p-4 backdrop-blur-sm sticky top-6">
              <nav className="space-y-2">
                {[
                  { id: 'authentication', label: 'Authentication', icon: FaLock },
                  { id: 'preferences', label: 'App Preferences', icon: FaGlobe },
                  { id: 'integrations', label: 'Integrations', icon: FaPuzzlePiece },
                  { id: 'notifications', label: 'Notifications', icon: FaBell },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-2 rounded-md flex items-center ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <tab.icon className="mr-2" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;