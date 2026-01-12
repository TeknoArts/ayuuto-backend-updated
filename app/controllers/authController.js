const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/emailService');

// Helper to create JWT
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
  return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request password reset - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    console.log(`[AUTH] Forgot password request received`);
    console.log(`[AUTH] Email from request: ${email}`);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Normalize email (lowercase, trim) to match database format
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[AUTH] Normalized email for lookup: ${normalizedEmail}`);

    const user = await User.findOne({ email: normalizedEmail });
    
    console.log(`[AUTH] User lookup result: ${user ? '✅ Found' : '❌ Not found'}`);
    if (user) {
      console.log(`[AUTH] User found in database:`);
      console.log(`   - User ID: ${user._id}`);
      console.log(`   - User Name: ${user.name}`);
      console.log(`   - User Email (from DB): ${user.email}`);
      console.log(`   - Email match: ${normalizedEmail === user.email ? '✅ Match' : '❌ Mismatch'}`);
    } else {
      console.log(`[AUTH] ⚠️  No user found with email: ${normalizedEmail}`);
      console.log(`[AUTH] This could mean:`);
      console.log(`   1. Account is registered with a different email`);
      console.log(`   2. Account doesn't exist`);
      console.log(`   3. Email has a typo`);
    }

    // For security, respond with success even if user is not found
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, you will receive an OTP.',
      });
    }

    // Generate 5-digit OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit OTP
    const otpExpiry = Date.now() + 600000; // 10 minutes from now

    // Save OTP to user
    user.passwordResetOTP = otp;
    user.passwordResetOTPExpires = new Date(otpExpiry);
    await user.save({ validateBeforeSave: false });

    // Send OTP email - ALWAYS use the email from database, not the request
    try {
      console.log(`[AUTH] Generating OTP for registered user`);
      console.log(`[AUTH] Generated OTP: ${otp}`);
      console.log(`[AUTH] Email from request: ${email}`);
      console.log(`[AUTH] Email from database: ${user.email}`);
      console.log(`[AUTH] ⚠️  Sending OTP to registered email: ${user.email}`);
      console.log(`[AUTH] (This is the email the account was registered with)`);
      
      await sendPasswordResetEmail(user.email, otp);
      
      console.log(`✅ [AUTH] Password reset OTP sent successfully!`);
      console.log(`   Sent to: ${user.email} (registered email)`);
      console.log(`   Requested email: ${email}`);
      console.log(`   OTP: ${otp}`);
      console.log(`   Expires in: 10 minutes`);
    } catch (emailError) {
      // If email fails, clear the OTP
      user.passwordResetOTP = undefined;
      user.passwordResetOTPExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('❌ [AUTH] Error sending password reset OTP:', emailError);
      console.error('   Email:', user.email);
      console.error('   OTP was:', otp);
      // Still return success for security (don't reveal if email failed)
    }

    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, you will receive an OTP.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate OTP
    if (!user.passwordResetOTP || user.passwordResetOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check and try again.',
      });
    }

    // Check if OTP has expired
    if (!user.passwordResetOTPExpires || user.passwordResetOTPExpires < new Date()) {
      // Clear expired OTP
      user.passwordResetOTP = undefined;
      user.passwordResetOTPExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // OTP is valid - generate a verification token for password reset
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 600000; // 10 minutes

    // Save verification token and clear OTP
    user.passwordResetToken = verificationToken;
    user.passwordResetExpires = new Date(tokenExpiry);
    user.passwordResetOTP = undefined; // Clear OTP after verification
    user.passwordResetOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.log(`[AUTH] OTP verified successfully for: ${email}`);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      data: {
        verificationToken, // This will be used to reset password
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password using verification token (after OTP verification)
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, verificationToken } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required',
      });
    }

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required. Please verify OTP first.',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate verification token
    if (!user.passwordResetToken || user.passwordResetToken !== verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token. Please verify OTP again.',
      });
    }

    // Check if token has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      // Clear expired token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(400).json({
        success: false,
        message: 'Verification token has expired. Please verify OTP again.',
      });
    }

    // Clear reset token after successful use
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Update password
    user.password = newPassword;
    await user.save(); // will re-hash via pre-save hook

    console.log(`[AUTH] Password reset successfully for email: ${email}`);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
};

