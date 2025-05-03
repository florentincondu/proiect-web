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


let emailFunctional = false;
let fallbackTransporter = null;


const initializeFallbackTransporter = () => {
  console.log('Initializing alternative Gmail configuration');
  try {

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


const logCriticalMessage = (subject, message) => {

  console.log(`CRITICAL NOTIFICATION: ${subject}`);
  console.log(message);
  




  

  try {
    const logEntry = `
-------------------------------------------
[${new Date().toISOString()}] ${subject}
-------------------------------------------
${message}
-------------------------------------------
`;
    

    const criticalLogsPath = path.join(__dirname, '..', 'logs', 'critical_messages.log');
    fs.appendFileSync(criticalLogsPath, logEntry);
  } catch (error) {
    console.error('Failed to write critical message to log file:', error);
  }
};


const sendEmailWithRetry = async (mailOptions) => {

  let criticalLogged = false;
  
  if (emailFunctional) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Primary email transport failed:', error);
      

      if (fallbackTransporter) {
        try {
          console.log('Attempting to send via fallback transport');
          return await fallbackTransporter.sendMail(mailOptions);
        } catch (fallbackError) {
          console.error('Fallback email transport also failed:', fallbackError);
          

          logCriticalMessage(
            `Failed Email: ${mailOptions.subject}`, 
            `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
          );
          criticalLogged = true;
          
          throw fallbackError;
        }
      } else {

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

    try {
      return await fallbackTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Fallback email transport failed:', error);
      

      if (!criticalLogged) {
        logCriticalMessage(
          `Failed Email: ${mailOptions.subject}`, 
          `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
        );
      }
      
      throw error;
    }
  } else {

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
    

    const fallbackInitialized = initializeFallbackTransporter();
    if (!fallbackInitialized) {
      console.error('Could not initialize any email transport. Email functionality will be completely disabled.');
    }
  }
})();


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


const sendAdminRequestNotification = async (user) => {
  try {

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


const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, subscriptionType } = req.body;


    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }


    if (role === 'admin') {
      console.log(`Admin registration request for: ${email}`);
      

      const verificationToken = crypto.randomBytes(32).toString('hex');
      

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
      

      try {
        await sendAdminRequestNotification(user);
        console.log(`Admin request notification sent to condurflorentin@gmail.com`);
      } catch (emailError) {
        console.error('Error sending admin request notification:', emailError);

      }
      
      return res.status(200).json({
        success: true,
        requiresVerification: true,
        message: 'Admin registration request submitted. You will receive an email when your request is approved.',
        email: email
      });
    }


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


    const token = generateToken(user._id);


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


const approveAdminRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log('Approving admin request:', requestId);
    
    const request = pendingAdminRequests.get(requestId);
    if (!request) {
      return res.status(400).json({ message: 'Invalid or expired request' });
    }
    
    console.log('Found request:', request);


    if (request.approved && request.verificationCode) {
      console.log('Request already approved, reusing existing verification code');
      

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


    const verificationCode = crypto.randomInt(100000, 999999).toString();
    console.log('Generated verification code:', verificationCode);


    request.verificationCode = verificationCode;
    request.approved = true;
    request.approvedAt = Date.now();
    

    pendingAdminRequests.set(requestId, request);
    
    console.log('Updated request:', pendingAdminRequests.get(requestId));


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


const rejectAdminRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = pendingAdminRequests.get(requestId);

    if (!request) {
      return res.status(400).json({ message: 'Invalid or expired request' });
    }


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


    pendingAdminRequests.delete(requestId);

    res.json({ message: 'Admin request rejected successfully' });
  } catch (error) {
    console.error('Reject admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const verifyAdmin = async (req, res) => {
  try {
    const { token, email } = req.query;
    
    if (!token || !email) {
      return res.status(400).json({ message: 'Missing verification parameters' });
    }
    

    const user = await User.findOne({ 
      email: email,
      adminVerificationToken: token,
      adminVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    

    if (user.adminVerified) {
      return res.status(200).json({ 
        message: 'Your admin account is already verified. You can log in now.',
        status: 'already_verified'
      });
    }
    

    user.role = 'admin';
    user.adminVerified = true;
    user.adminVerificationToken = undefined;
    user.adminVerificationExpires = undefined;
    
    await user.save();
    

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


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .select('-password')
      .lean();

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

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

    const userDoc = await User.findById(user._id);
    const isMatch = await userDoc.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          lastLogin: new Date(),
          lastActive: new Date(),
          status: 'active'
        },
        $inc: { loginCount: 1 }
      },
      { 
        new: true,
        select: '-password -resetPasswordToken -resetPasswordExpires -adminVerificationToken -adminVerificationExpires'
      }
    );

    const token = generateToken(updatedUser._id);

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


const createTestUser = async (req, res) => {
  try {
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      role: 'client'
    };
    

    const userExists = await User.findOne({ email: testUser.email });
    if (userExists) {
      await User.findOneAndDelete({ email: testUser.email });
      console.log('Existing test user deleted');
    }
    

    console.log('Creating new test user with password:', testUser.password);
    const user = new User(testUser);
    

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


const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    

    user.password = newPassword;
    

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


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email address' });
    }
    

    const resetToken = crypto.randomBytes(32).toString('hex');
    

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${email}`;
    

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


const resetPasswordWithToken = async (req, res) => {
  try {
    const { token, email, password } = req.body;
    

    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }
    

    user.password = password;
    

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    

    await user.save();
    

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


const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;


    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }


    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }


    user.password = newPassword;
    await user.save();


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

const logout = async (req, res) => {
  try {
    // Update user status to inactive
    if (req.user && req.user.id) {
      await User.findByIdAndUpdate(
        req.user.id,
        {
          $set: {
            status: 'inactive',
            lastActive: new Date()
          }
        }
      );
    }
    
    res.json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  verifyAdmin,
  approveAdminRequest,
  rejectAdminRequest,
  forgotPassword,
  resetPassword,
  resetPasswordWithToken,
  changePassword,
  changeSubscription,
  testEmail,
  resendAdminVerification,
  createTestUser
};