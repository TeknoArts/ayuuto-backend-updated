const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');
const auth = require('../middleware/authMiddleware');

// Public route - no authentication required
// Note: This is mounted at /invite in server.js, so the full path is /invite/:groupId
router.get('/:groupId', inviteController.handleInvite);

// Protected route - requires authentication
router.post('/invite/generate', auth, inviteController.generateInviteToken);

module.exports = router;
