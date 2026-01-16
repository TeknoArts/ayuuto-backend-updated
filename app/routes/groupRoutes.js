const express = require('express');
const router = express.Router();

const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Routes
router.post('/', groupController.createGroup);
router.get('/', groupController.getUserGroups);
router.get('/:groupId', groupController.getGroupDetails);
router.get('/:groupId/logs', groupController.getGroupLogs);
router.delete('/:groupId', groupController.deleteGroup);
router.post('/:groupId/participants', groupController.addParticipants);
router.delete('/:groupId/participants/:participantId', groupController.removeParticipant);
router.put('/:groupId/collection', groupController.setCollectionDetails);
router.post('/:groupId/spin', groupController.spinForOrder);
router.post('/:groupId/next-round', groupController.nextRound);
router.put('/:groupId/participants/:participantId/payment', groupController.updatePaymentStatus);
router.post('/test-collection-notifications', groupController.testCollectionNotifications);

// Share routes
router.post('/:groupId/share/enable', groupController.enableSharing);
router.post('/:groupId/share/disable', groupController.disableSharing);
router.get('/:groupId/share', groupController.getShareLink);
router.post('/:groupId/share/regenerate', groupController.regenerateShareToken);

module.exports = router;

