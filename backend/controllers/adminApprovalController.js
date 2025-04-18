const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const pendingAdminVerifications = new Map();

const sendEmail = async (mailOptions) => {
  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};


exports.requestAdminAccess = async (req, res) => {
  try {

    const { userId, email } = req.body;
    let user;

    if (userId) {

      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    } else if (email) {

      user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found with this email' });
      }
    } else {
      return res.status(400).json({ message: 'Either userId or email is required' });
    }

    console.log(`Processing admin request for user: ${user.email}`);


    const requestToken = crypto.randomBytes(32).toString('hex');
    

    user.adminRequested = true;
    user.adminVerificationToken = requestToken;
    user.adminVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await user.save();
    console.log(`Updated user with admin request token: ${requestToken}`);


    const approveUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/approve?token=${requestToken}`;
    const rejectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/reject?token=${requestToken}`;
    
    try {
      await sendEmail({
        from: process.env.EMAIL_USER,
        to: 'condurflorentin@gmail.com', // Send to this specific email
        subject: 'New Admin Account Request',
        html: `
          <h1>New Admin Account Request</h1>
          <p>A user has requested admin access:</p>
          <ul>
            <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Requested at:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>Please approve or reject this request:</p>
          <div style="margin-top: 20px;">
            <a href="${approveUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">Approve Request</a>
            <a href="${rejectUrl}" style="padding: 10px 20px; background-color: #F44336; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reject Request</a>
          </div>
          <p style="margin-top: 20px;">Or you can approve/reject from the admin dashboard.</p>
        `
      });
      console.log(`Sent admin request notification to condurflorentin@gmail.com`);
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);

    }

    res.status(200).json({ 
      message: 'Admin access requested. You will be notified when your request is processed.',
      success: true,
      verificationToken: requestToken,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Request admin access error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.approveAdminRequest = async (req, res) => {
  try {

    const token = req.query.token;
    const email = req.query.email;
    
    console.log(`Processing admin approval request with token: ${token}, email: ${email}`);


    let user;
    
    if (token) {
      user = await User.findOne({ 
        adminVerificationToken: token,
        adminVerificationExpires: { $gt: Date.now() }
      });
    } 
    

    if (!user && email) {
      user = await User.findOne({ 
        email: email,
        adminRequested: true
      });
    }

    if (!user) {
      console.log('User not found or token expired');
      return res.status(404).json({ message: 'Invalid or expired token' });
    }

    console.log(`Found user for approval: ${user.email}`);


    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated verification code: ${verificationCode} for user: ${user.email}`);
    

    const userToken = token || user.adminVerificationToken;
    
    pendingAdminVerifications.set(userToken, {
      userId: user._id,
      email: user.email,
      code: verificationCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    console.log(`Stored verification details in memory for token: ${userToken}`);
    

    user.adminApproved = true;
    await user.save();
    console.log(`User ${user.email} marked as approved`);


    try {
      const emailResult = await sendEmail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Admin Access Approved - Verification Code',
        html: `
          <h1>Admin Access Approved</h1>
          <p>Hello ${user.firstName},</p>
          <p>Your admin access request has been approved!</p>
          <p>Please use the following verification code to complete your registration:</p>
          <div style="background-color: #f2f2f2; padding: 15px; border-radius: 5px; font-size: 24px; text-align: center; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p>Enter this code on the verification page to activate your admin account.</p>
          <p>This code will expire in 24 hours.</p>
          <p>Thank you!</p>
          <p>If you don't see the verification page, please go to: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin-verification?token=${userToken}</p>
        `
      });
      console.log(`Verification email sent to ${user.email}`, emailResult);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);

    }


    res.status(200).json({
      success: true,
      message: `Admin access approved for ${user.email}. A verification code has been sent to the user.`,
      email: user.email,
      status: 'approved'
    });
  } catch (error) {
    console.error('Approve admin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.rejectAdminRequest = async (req, res) => {
  try {

    const token = req.query.token;
    const email = req.query.email;
    
    console.log(`Processing admin rejection request with token: ${token}, email: ${email}`);


    let user;
    
    if (token) {
      user = await User.findOne({ 
        adminVerificationToken: token,
        adminVerificationExpires: { $gt: Date.now() }
      });
    } 
    

    if (!user && email) {
      user = await User.findOne({ 
        email: email,
        adminRequested: true
      });
    }

    if (!user) {
      console.log('User not found or token expired');
      return res.status(404).json({ message: 'Invalid or expired token' });
    }

    console.log(`Found user for rejection: ${user.email}`);


    user.adminRequested = false;
    user.adminApproved = false;
    user.adminVerificationToken = undefined;
    user.adminVerificationExpires = undefined;
    
    await user.save();
    console.log(`User ${user.email} rejected for admin access`);


    try {
      const emailResult = await sendEmail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Admin Access Request Rejected',
        html: `
          <h1>Admin Access Request Rejected</h1>
          <p>Hello ${user.firstName},</p>
          <p>We regret to inform you that your admin access request has been rejected.</p>
          <p>If you believe this was a mistake, please contact support.</p>
          <p>Thank you for your understanding.</p>
        `
      });
      console.log(`Rejection email sent to ${user.email}`, emailResult);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);

    }


    res.status(200).json({
      success: true,
      message: `Admin access rejected for ${user.email}. A notification has been sent to the user.`,
      email: user.email,
      status: 'rejected'
    });
  } catch (error) {
    console.error('Reject admin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.verifyAdminCode = async (req, res) => {
  try {
    const { token, code, email } = req.body;
    console.log(`Verifying admin code: ${code} for token: ${token}, email: ${email || 'not provided'}`);


    let verification = null;
    let user = null;
    

    if (token) {
      verification = pendingAdminVerifications.get(token);
      

      if (!verification) {
        user = await User.findOne({ 
          adminVerificationToken: token,
          adminVerificationExpires: { $gt: Date.now() }
        });
      }
    }
    

    if (!verification && email) {
      console.log(`No verification found for token: ${token}, trying to find by email: ${email}`);
      

      if (!user) {
        user = await User.findOne({ 
          email: email, 
          adminApproved: true 
        });
      }
      
      if (user && user.adminVerificationToken) {
        console.log(`Found user with email: ${email}, checking for verification with token: ${user.adminVerificationToken}`);

        verification = pendingAdminVerifications.get(user.adminVerificationToken);
      }
    }
    
    console.log('Verification data:', verification);
    

    if (!verification && user) {

      for (const [verifToken, verifData] of pendingAdminVerifications.entries()) {
        if (verifData.email === user.email) {
          verification = verifData;
          console.log(`Found verification for user ${user.email} with token: ${verifToken}`);
          break;
        }
      }
    }
    

    if (!verification || verification.expiresAt < new Date()) {
      console.log('Invalid or expired verification');
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new code.' });
    }


    if (verification.code !== code) {
      console.log(`Code mismatch. Expected: ${verification.code}, Received: ${code}`);
      return res.status(400).json({ message: 'Invalid verification code. Please try again.' });
    }

    console.log('Verification code matched successfully');


    if (!user) {
      user = await User.findById(verification.userId);
    }
    
    if (!user) {
      console.log(`User not found with ID: ${verification.userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`Updating user ${user.email} to admin role`);


    user.role = 'admin';
    user.adminRequested = false;
    user.adminVerified = true;
    user.adminApproved = true;
    user.adminVerificationToken = undefined;
    user.adminVerificationExpires = undefined;
    
    await user.save();
    console.log(`User ${user.email} updated successfully as admin`);


    if (token) {
      pendingAdminVerifications.delete(token);
    }
    if (user.adminVerificationToken && token !== user.adminVerificationToken) {
      pendingAdminVerifications.delete(user.adminVerificationToken);
    }
    console.log(`Removed verification for token: ${token}`);


    const jwt = require('jsonwebtoken');
    const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    console.log('Generated new auth token for user');

    res.status(200).json({
      message: 'Admin verification successful',
      token: authToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      success: true,
      redirectTo: '/dashboard'
    });
  } catch (error) {
    console.error('Verify admin code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.getAdminVerificationStatus = async (req, res) => {
  try {
    const { token } = req.query;


    const user = await User.findOne({ 
      adminVerificationToken: token
    });

    if (!user) {
      return res.status(404).json({ message: 'Invalid token or user not found' });
    }


    const verificationExists = pendingAdminVerifications.has(token);

    res.status(200).json({
      adminRequested: user.adminRequested,
      adminVerified: user.adminVerified,
      adminApproved: user.adminApproved || false,
      verificationPending: verificationExists,
      email: user.email
    });
  } catch (error) {
    console.error('Get admin verification status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.resendVerificationCode = async (req, res) => {
  try {
    const { token, email } = req.body;
    

    if (!token && !email) {
      return res.status(400).json({ message: 'Either token or email is required' });
    }
    

    let user;
    if (token) {
      user = await User.findOne({
        adminVerificationToken: token,
        adminVerificationExpires: { $gt: Date.now() }
      });
    } else if (email) {
      user = await User.findOne({
        email: email,
        adminRequested: true
      });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found or verification expired' });
    }
    

    let existingVerification = null;
    if (user.adminVerificationToken) {
      existingVerification = pendingAdminVerifications.get(user.adminVerificationToken);
    }
    

    let verificationCode;
    if (existingVerification && existingVerification.expiresAt > new Date()) {
      verificationCode = existingVerification.code;
      console.log(`Reusing existing verification code: ${verificationCode} for user: ${user.email}`);
    } else {

      verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`Generated new verification code: ${verificationCode} for user: ${user.email}`);
    }
    

    if (!user.adminVerificationToken) {
      user.adminVerificationToken = crypto.randomBytes(32).toString('hex');
      user.adminVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await user.save();
    }
    

    pendingAdminVerifications.set(user.adminVerificationToken, {
      userId: user._id,
      email: user.email,
      code: verificationCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    
    console.log(`Stored verification code for token: ${user.adminVerificationToken}`);
    

    try {
      const emailResult = await sendEmail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Admin Access - Verification Code',
        html: `
          <h1>Admin Verification Code</h1>
          <p>Hello ${user.firstName},</p>
          <p>Here is your verification code to complete your admin registration:</p>
          <div style="background-color: #f2f2f2; padding: 15px; border-radius: 5px; font-size: 24px; text-align: center; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p>Enter this code on the verification page to activate your admin account.</p>
          <p>This code will expire in 24 hours.</p>
          <p>Thank you!</p>
          <p>If you don't see the verification page, please go to: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin-verification?token=${user.adminVerificationToken}</p>
        `
      });
      console.log(`Verification code email sent to ${user.email}`, emailResult);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({ message: 'Failed to send verification email' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully',
      email: user.email
    });
  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 