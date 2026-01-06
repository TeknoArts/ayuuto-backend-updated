const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { registerPushToken, removePushToken, sendTestNotification, getPushTokenInfo } = require('../controllers/userController');

// All routes require authentication
router.use(authMiddleware);

// Routes
router.post('/push-token', registerPushToken);
router.delete('/push-token', removePushToken);
router.post('/test-notification', sendTestNotification); // Test endpoint for sending notifications
router.get('/push-token-info', getPushTokenInfo); // Get push token info for debugging

module.exports = router;

