const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

const app = express();

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

mongoose
  .connect(MONGODB_URI, {
    autoIndex: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    // Initialize scheduler after database connection is established
    initializeScheduler();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Import routes
const authRoutes = require('./app/routes/authRoutes');
const groupRoutes = require('./app/routes/groupRoutes');
const userRoutes = require('./app/routes/userRoutes');
const publicRoutes = require('./app/routes/publicRoutes');
const inviteRoutes = require('./app/routes/inviteRoutes');
const webViewController = require('./app/controllers/webViewController');

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

// Root route - helpful message
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ayuuto Backend API is running',
    endpoints: {
      api: '/api',
      viewGroup: '/view/:shareCode',
      invite: '/invite/:groupId'
    },
    note: 'Use /view/{shareCode} to view a group, or /invite/{groupId} for invitations'
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


