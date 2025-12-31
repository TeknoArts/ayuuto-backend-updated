const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT authentication middleware
const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token missing',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
    const decoded = jwt.verify(token, secret);

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found',
      });
    }

    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token invalid or expired',
    });
  }
};

module.exports = auth;


