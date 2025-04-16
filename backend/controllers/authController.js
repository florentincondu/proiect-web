const User = require('../models/User.js');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const generateToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET, 
    { expiresIn: '30d' }  // Set token to expire in 30 days
  );
};

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000, // Connection timeout in milliseconds
  greetingTimeout: 10000,  // How long to wait for greeting after connection
  socketTimeout: 10000,    // How long to wait for socket operations
  debug: true, // Show debug logs
  logger: true, // Log information about email sending
  tls: {
    rejectUnauthorized: false // More permissive for some network environments
  }
});

// Test the email configuration on startup
let emailFunctional = false;
let fallbackTransporter = null;

// Function to initialize a fallback transporter if Gmail fails
const initializeFallbackTransporter = () => {
  console.log('Initializing alternative Gmail configuration');
  try {
    // Try an alternative Gmail configuration
    fallbackTransporter = nodemailer.createTransport({
      service: 'gmail',  // Use the service name instead of host/port
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log('Alternative email transporter initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize alternative transporter:', error);
    return false;
  }
};

// Add a direct notification method for critical messages when email transport fails
const logCriticalMessage = (subject, message) => {
  // Log the message to console at minimum
  console.log(`CRITICAL NOTIFICATION: ${subject}`);
  console.log(message);
  
  // Could implement other notification methods here:
  // - Writing to a special log file
  // - Using an alternative API service
  // - Sending an SMS via a third-party service
  
  // For now, we'll just log to stdout and create a log file
  try {
    const logEntry = `
-------------------------------------------
[${new Date().toISOString()}] ${subject}
-------------------------------------------
${message}
-------------------------------------------
`;
    
    // Try to append to a critical messages log file
    const criticalLogsPath = path.join(__dirname, '..', 'logs', 'critical_messages.log');
    fs.appendFileSync(criticalLogsPath, logEntry);
  } catch (error) {
    console.error('Failed to write critical message to log file:', error);
  }
};

// Function to send email with retry using fallback
const sendEmailWithRetry = async (mailOptions) => {
  // Set a flag to track if we've logged this message as critical
  let criticalLogged = false;
  
  if (emailFunctional) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Primary email transport failed:', error);
      
      // Try fallback if available
      if (fallbackTransporter) {
        try {
          console.log('Attempting to send via fallback transport');
          return await fallbackTransporter.sendMail(mailOptions);
        } catch (fallbackError) {
          console.error('Fallback email transport also failed:', fallbackError);
          
          // Log critical message since both transports failed
          logCriticalMessage(
            `Failed Email: ${mailOptions.subject}`, 
            `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
          );
          criticalLogged = true;
          
          throw fallbackError;
        }
      } else {
        // Log critical message since primary failed and no fallback exists
        if (!criticalLogged) {
          logCriticalMessage(
            `Failed Email: ${mailOptions.subject}`, 
            `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
          );
        }
        throw error;
      }
    }
  } else if (fallbackTransporter) {
    // If primary email is known to be non-functional, try fallback directly
    try {
      return await fallbackTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Fallback email transport failed:', error);
      
      // Log critical message
      if (!criticalLogged) {
        logCriticalMessage(
          `Failed Email: ${mailOptions.subject}`, 
          `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
        );
      }
      
      throw error;
    }
  } else {
    // No transport available at all, just log the message
    logCriticalMessage(
      `Unsent Email: ${mailOptions.subject}`, 
      `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
    );
    throw new Error('No functional email transport available');
  }
};

(async function() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await transporter.verify();
      console.log('Email configuration is valid and ready to send messages');
      emailFunctional = true;
    }
  } catch (error) {
    console.error('Email configuration error:', error);
    console.warn('Email functionality will not work. Please check your EMAIL_USER and EMAIL_PASS settings.');
    
    // Initialize fallback transport
    const fallbackInitialized = initializeFallbackTransporter();
    if (!fallbackInitialized) {
      console.error('Could not initialize any email transport. Email functionality will be completely disabled.');
    }
  }
})();

// Function to send admin verification email
const sendAdminVerificationEmail = async (user, verificationToken) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-admin?token=${verificationToken}&email=${user.email}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Admin Account Verification',
      html: `
        <h1>Boksy Admin Verification</h1>
        <p>Hello ${user.firstName},</p>
        <p>You have requested to create an administrator account for Boksy.</p>
        <p>To verify your account and activate admin privileges, please click the link below:</p>
        <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 5px;">Verify Admin Account</a>
        <p>Or copy and paste this URL in your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thank you,<br>The Boksy Team</p>
      `
    };
    
    return await sendEmailWithRetry(mailOptions);
  } catch (error) {
    console.error('Error sending admin verification email:', error);
    throw error;
  }
};

// Function to send admin request notification to the admin email
const sendAdminRequestNotification = async (user) => {
  try {
    // Create approval and rejection URLs with user information
    const approveUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/approve-admin-request?email=${user.email}&token=${user.adminVerificationToken}`;
    const rejectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/reject-admin-request?email=${user.email}&token=${user.adminVerificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'condurflorentin@gmail.com', // Send to this specific email
      subject: 'New Admin Account Request',
      html: `
        <h1>New Admin Account Request</h1>
        <p>A new user has requested admin access:</p>
        <ul>
          <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>Requested at:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>Please approve or reject this request:</p>
        <div style="display: flex; gap: 10px;">
          <a href="${approveUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Approve Request</a>
          <a href="${rejectUrl}" style="padding: 10px 20px; background-color: #F44336; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reject Request</a>
        </div>
        <p>Or you can approve/reject from the admin dashboard.</p>
      `
    };
    
    return await sendEmailWithRetry(mailOptions);
  } catch (error) {
    console.error('Error sending admin request notification:', error);
    throw error;
  }
};

// Function to send verification code to user after admin approval
const sendAdminVerificationCode = async (user, verificationCode) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Admin Account Verification Code',
      html: `
        <h1>Admin Verification Code</h1>
        <p>Hello ${user.firstName},</p>
        <p>Your admin account request has been approved!</p>
        <p>Please use the following verification code to complete your registration:</p>
        <div style="background-color: #f2f2f2; padding: 15px; border-radius: 5px; font-size: 24px; text-align: center; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
          ${verificationCode}
        </div>
        <p>Enter this code on the verification page to activate your admin account.</p>
        <p>This code will expire in 24 hours.</p>
        <p>Thank you,<br>The Boksy Team</p>
      `
    };
    
    return await sendEmailWithRetry(mailOptions);
  } catch (error) {
    console.error('Error sending admin verification code:', error);
    throw error;
  }
};

// Generate a random 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register user
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, subscriptionType } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // If user is requesting admin role
    if (role === 'admin') {
      console.log(`Admin registration request for: ${email}`);
      
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // Create user with admin role but not verified yet
      const user = new User({
        firstName,
        lastName,
        email,
        password, // Will be hashed by pre-save hook
        role: 'client', // Start as client until verified as admin
        adminRequested: true, // Mark that admin role was requested
        adminVerified: false,
        adminVerificationToken: verificationToken,
        adminVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
      
      await user.save();
      console.log(`Admin request created with verification token: ${user._id}`);
      
      // Send notification to admin email for approval
      try {
        await sendAdminRequestNotification(user);
        console.log(`Admin request notification sent to condurflorentin@gmail.com`);
      } catch (emailError) {
        console.error('Error sending admin request notification:', emailError);
        // Continue with registration even if email fails
      }
      
      return res.status(200).json({
        success: true,
        requiresVerification: true,
        message: 'Admin registration request submitted. You will receive an email when your request is approved.',
        email: email
      });
    }

    // For non-admin registrations, save user directly
    const user = new User({
      firstName,
      lastName,
      email,
      password, // Pass the plain password - the model's pre-save hook will hash it
      role: role || 'client',
      bePartOfUs: {
        type: subscriptionType || 'free'
      }
    });

    await user.save();
    console.log(`User registered successfully: ${user._id}, role: ${user.role}`);

    // Generate token
    const token = generateToken(user._id);

    // Send welcome email to client
    try {
      await sendEmailWithRetry({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to Boksy',
        html: `
          <h2>Welcome ${firstName} ${lastName}!</h2>
          <p>Thank you for registering on our platform.</p>
          <p>You can now log in and start using our services.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue with registration even if email fails
    }

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        subscription: subscriptionType || 'free'
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message // Include error message for debugging
    });
  }
};

// Approve admin request
const approveAdminRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log('Approving admin request:', requestId);
    
    const request = pendingAdminRequests.get(requestId);
    if (!request) {
      return res.status(400).json({ message: 'Invalid or expired request' });
    }
    
    console.log('Found request:', request);

    // Check if this request has already been approved and has a verification code
    if (request.approved && request.verificationCode) {
      console.log('Request already approved, reusing existing verification code');
      
      // Resend the verification email with the existing code
      await sendEmailWithRetry({
        from: process.env.EMAIL_USER,
        to: request.userData.email,
        subject: 'Admin Registration Approved (Reminder)',
        html: `
          <h2>Admin Registration Approved</h2>
          <p>Your admin registration request has been approved!</p>
          <p>Please use the following verification code to complete your registration:</p>
          <h3 style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block;">
            ${request.verificationCode}
          </h3>
          <p>This code will expire in 24 hours.</p>
          <p>Return to the verification page and enter this code to activate your admin account.</p>
        `
      });
      
      return res.json({ 
        success: true,
        message: 'Admin request already approved. Verification code resent.',
        userEmail: request.userData.email
      });
    }

    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    console.log('Generated verification code:', verificationCode);

    // Update request with verification code and approval
    request.verificationCode = verificationCode;
    request.approved = true;
    request.approvedAt = Date.now();
    
    // Update the Map with the modified request
    pendingAdminRequests.set(requestId, request);
    
    console.log('Updated request:', pendingAdminRequests.get(requestId));

    // Send verification code to user
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: request.userData.email,
      subject: 'Admin Registration Approved',
      html: `
        <h2>Admin Registration Approved</h2>
        <p>Your admin registration request has been approved!</p>
        <p>Please use the following verification code to complete your registration:</p>
        <h3 style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block;">
          ${verificationCode}
        </h3>
        <p>This code will expire in 24 hours.</p>
        <p>Return to the verification page and enter this code to activate your admin account.</p>
      `
    });

    res.json({ 
      success: true,
      message: 'Admin request approved successfully',
      userEmail: request.userData.email
    });
  } catch (error) {
    console.error('Approve admin error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
};

// Reject admin request
const rejectAdminRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = pendingAdminRequests.get(requestId);

    if (!request) {
      return res.status(400).json({ message: 'Invalid or expired request' });
    }

    // Send rejection email to user
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: request.userData.email,
      subject: 'Admin Registration Rejected',
      html: `
        <h2>Admin Registration Rejected</h2>
        <p>We regret to inform you that your admin registration request has been rejected.</p>
        <p>If you believe this was a mistake, please contact the system administrator.</p>
      `
    });

    // Remove request
    pendingAdminRequests.delete(requestId);

    res.json({ message: 'Admin request rejected successfully' });
  } catch (error) {
    console.error('Reject admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify admin
const verifyAdmin = async (req, res) => {
  try {
    const { token, email } = req.query;
    
    if (!token || !email) {
      return res.status(400).json({ message: 'Missing verification parameters' });
    }
    
    // Find user by email and verification token
    const user = await User.findOne({ 
      email: email,
      adminVerificationToken: token,
      adminVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    
    // Check if already verified
    if (user.adminVerified) {
      return res.status(200).json({ 
        message: 'Your admin account is already verified. You can log in now.',
        status: 'already_verified'
      });
    }
    
    // Update user as verified admin
    user.role = 'admin';
    user.adminVerified = true;
    user.adminVerificationToken = undefined;
    user.adminVerificationExpires = undefined;
    
    await user.save();
    
    // Generate auth token for automatic login
    const authToken = generateToken(user._id);
    
    res.status(200).json({ 
      message: 'Admin account verified successfully!',
      token: authToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      success: true
    });
  } catch (error) {
    console.error('Verify admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email with all fields except password
    const user = await User.findOne({ email })
      .select('-password')
      .lean();

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is blocked
    if (user.blockInfo && user.blockInfo.isBlocked) {
      const now = new Date();
      const blockedUntil = new Date(user.blockInfo.blockedUntil);
      
      if (!user.blockInfo.blockedUntil || now < blockedUntil) {
        return res.status(403).json({ 
          message: 'Your account has been blocked', 
          reason: user.blockInfo.reason,
          blockedUntil: user.blockInfo.blockedUntil 
        });
      }
      
      // If block period has expired, unblock user
      if (now >= blockedUntil) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            'blockInfo.isBlocked': false,
            'blockInfo.reason': null,
            'blockInfo.blockedUntil': null,
            'blockInfo.blockedBy': null,
            'blockInfo.blockedAt': null
          }
        });
      }
    }

    // Get the full user document for password comparison
    const userDoc = await User.findById(user._id);
    const isMatch = await userDoc.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update login stats and get updated user data
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          lastLogin: new Date(),
          lastActive: new Date()
        },
        $inc: { loginCount: 1 }
      },
      { 
        new: true,
        select: '-password -resetPasswordToken -resetPasswordExpires -adminVerificationToken -adminVerificationExpires'
      }
    );

    // Generate JWT token
    const token = generateToken(updatedUser._id);

    // Return the exact structure expected by the frontend
    res.json({
      token,
      user: {
        id: updatedUser._id.toString(),
        _id: updatedUser._id.toString(),
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status || 'active',
        profileImage: updatedUser.profileImage || '',
        phone: updatedUser.phone || '',
        address: updatedUser.address || '',
        lastLogin: updatedUser.lastLogin,
        lastActive: updatedUser.lastActive,
        loginCount: updatedUser.loginCount,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        preferences: updatedUser.preferences || {
          notifications: {
            email: true,
            push: true
          },
          language: 'en',
          theme: 'system'
        },
        subscription: updatedUser.bePartOfUs?.type || 'free',
        blockInfo: updatedUser.blockInfo || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change subscription
const changeSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.subscription = subscription;
    await user.save();
    
    res.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Change subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Test email
const testEmail = async (req, res) => {
  try {
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: 'condurflorentin@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email'
    });
    
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend admin verification
const resendAdminVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.adminVerificationToken = verificationToken;
    await user.save();
    
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Admin Verification',
      text: `Your verification token is: ${verificationToken}`
    });
    
    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a test user
const createTestUser = async (req, res) => {
  try {
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      role: 'client'
    };
    
    // Check if user already exists
    const userExists = await User.findOne({ email: testUser.email });
    if (userExists) {
      await User.findOneAndDelete({ email: testUser.email });
      console.log('Existing test user deleted');
    }
    
    // Create new user
    console.log('Creating new test user with password:', testUser.password);
    const user = new User(testUser);
    
    // Save user to DB
    await user.save();
    console.log('Test user created with ID:', user._id);
    
    res.status(201).json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: user._id,
        email: user.email,
        password: 'password123', // Clear text for testing
        firstName: user.firstName, 
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create test user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset user password (for debugging/testing only)
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Set new password
    user.password = newPassword;
    
    // Save user (password will be hashed by pre-save hook)
    await user.save();
    
    res.status(200).json({
      success: true,
      message: `Password for ${email} has been reset successfully`
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate password reset token and send email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email address' });
    }
    
    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token and expiry on user model
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${email}`;
    
    // Send email
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>You requested a password reset</h1>
        <p>Dear ${user.firstName},</p>
        <p>You requested to reset your password. Please click the button below to reset your password:</p>
        <a href="${resetUrl}" style="padding: 10px 20px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>Or copy and paste this URL in your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <p>Thank you,<br>The Boksy Team</p>
      `
    });
    
    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset password with token validation
const resetPasswordWithToken = async (req, res) => {
  try {
    const { token, email, password } = req.body;
    
    // Find user by email and valid token
    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }
    
    // Update password
    user.password = password;
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Save user
    await user.save();
    
    // Send confirmation email
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Successful',
      html: `
        <h1>Password Reset Successful</h1>
        <p>Dear ${user.firstName},</p>
        <p>Your password has been successfully reset.</p>
        <p>You can now log in with your new password.</p>
        <p>If you did not request this change, please contact support immediately.</p>
        <p>Thank you,<br>The Boksy Team</p>
      `
    });
    
    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password with token error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Change password for authenticated user
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send confirmation email
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Changed Successfully',
      html: `
        <h1>Password Change Confirmation</h1>
        <p>Dear ${user.firstName},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you did not request this change, please contact support immediately.</p>
        <p>Thank you,<br>The Boksy Team</p>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  verifyAdmin,
  changeSubscription,
  testEmail,
  resendAdminVerification,
  resetPassword,
  forgotPassword,
  resetPasswordWithToken,
  changePassword
};