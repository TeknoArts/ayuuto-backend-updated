const express = require('express');
const router = express.Router();
const publicGroupController = require('../controllers/publicGroupController');

// Public route - no authentication required
// Uses shareCode instead of token in URL (cleaner, more secure)
router.get('/groups/view/:shareCode', publicGroupController.viewGroupByShareCode);
router.get('/groups/view/:shareCode/stream', publicGroupController.streamGroupByShareCode);

module.exports = router;
