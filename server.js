const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy (important for cloud platforms to get correct protocol)
app.set('trust proxy', true);

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true,
}));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

// Log MongoDB connection attempt (without showing password)
if (process.env.MONGODB_URI) {
  const maskedUri = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log('🔌 Attempting to connect to MongoDB...');
  console.log(`   URI: ${maskedUri}`);
} else {
  console.warn('⚠️  MONGODB_URI not set! Using default localhost (will fail in production)');
  console.warn('   Please set MONGODB_URI environment variable');
}

mongoose
  .connect(MONGODB_URI, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000, // 10 second timeout
    socketTimeoutMS: 45000, // 45 second timeout
  })
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    // Initialize scheduler after database connection is established
    initializeScheduler();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Error details:', {
      name: err.name,
      code: err.code,
      codeName: err.codeName
    });
    
    // Provide helpful error messages
    if (err.message.includes('authentication failed')) {
      console.error('\n🔐 Authentication Failed!');
      console.error('   - Check MongoDB Atlas username and password');
      console.error('   - Verify credentials in MONGODB_URI');
      console.error('   - Make sure password is URL-encoded if it has special characters');
    } else if (err.message.includes('IP') || err.message.includes('whitelist')) {
      console.error('\n🌐 IP Whitelist Error!');
      console.error('   - Go to MongoDB Atlas → Network Access');
      console.error('   - Add IP: 0.0.0.0/0 (allows all IPs)');
      console.error('   - Or add your server\'s IP addresses');
    } else if (err.message.includes('timeout') || err.message.includes('ENOTFOUND')) {
      console.error('\n⏱️  Connection Timeout!');
      console.error('   - Check MongoDB Atlas cluster is running');
      console.error('   - Verify connection string format');
      console.error('   - Check network connectivity');
    } else if (!process.env.MONGODB_URI) {
      console.error('\n⚠️  MONGODB_URI Not Set!');
      console.error('   - Set MONGODB_URI environment variable');
      console.error('   - Format: mongodb+srv://username:password@cluster.mongodb.net/ayuuto');
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check MONGODB_URI environment variable');
    console.error('   2. Verify MongoDB Atlas → Network Access → IP Whitelist');
    console.error('   3. Test connection string in MongoDB Atlas');
    console.error('   4. Check server logs for more details\n');
    
    process.exit(1);
  });

// Import routes
const authRoutes = require('./app/routes/authRoutes');
const groupRoutes = require('./app/routes/groupRoutes');
const userRoutes = require('./app/routes/userRoutes');
const publicRoutes = require('./app/routes/publicRoutes');
const inviteRoutes = require('./app/routes/inviteRoutes');
const webViewController = require('./app/controllers/webViewController');
const privacyPolicyController = require('./app/controllers/privacyPolicyController');

// Base API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', inviteRoutes);

// Public invite route (without /api prefix for cleaner URLs in emails)
app.use('/invite', inviteRoutes);

// Web view route (for shareable links) - uses shareCode, no token in URL
app.get('/view/:shareCode', webViewController.serveGroupView);

// Privacy Policy public page
app.get('/privacy-policy', privacyPolicyController.servePrivacyPolicy);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ayuuto Backend API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root route - helpful message
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ayuuto Backend API is running',
    endpoints: {
      api: '/api',
      health: '/api/health',
      viewGroup: '/view/:shareCode',
      invite: '/invite/:groupId',
      privacyPolicy: '/privacy-policy'
    },
    note: 'Use /view/{shareCode} to view a group, /invite/{groupId} for invitations, or /privacy-policy for privacy policy'
  });
});

// Initialize scheduler for collection notifications
const { initializeScheduler } = require('./app/services/schedulerService');

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Production server running on port ${PORT}`);
  } else {
    console.log(`Development server accessible from network at: http://192.168.18.126:${PORT}`);
  }
});


