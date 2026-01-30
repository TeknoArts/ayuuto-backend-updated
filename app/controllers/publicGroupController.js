const Group = require('../models/Group');
const Round = require('../models/Round');
const PaymentLog = require('../models/PaymentLog');
const GroupActivityLog = require('../models/GroupActivityLog');
const { extractShareCode } = require('../utils/shareToken');

// @desc    View group by share code (Public) - No token in URL
// @route   GET /api/public/groups/view/:shareCode
// @access  Public
exports.viewGroupByShareCode = async (req, res, next) => {
  try {
    // Set no-cache immediately so proxies/browsers never cache this response
    res.set({
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });

    // Decode shareCode in case it was URL encoded
    let { shareCode } = req.params;
    shareCode = decodeURIComponent(shareCode);
    // Extract only the code when full share text was passed (e.g. "LJBTZQCP Shared from Ayuuto App http://.../view/LJBTZQCP")
    shareCode = extractShareCode(shareCode);
    
    // Normalize shareCode - convert to uppercase (share codes are stored in uppercase)
    shareCode = shareCode.toUpperCase().trim();
    
    console.log(`[PublicGroup] Viewing group with shareCode: ${shareCode}`);

    if (!shareCode) {
      return res.status(400).json({
        success: false,
        message: 'Share code is required',
      });
    }

    // Find group by shareCode - use lean() for fresh read from DB
    const group = await Group.findOne({ shareCode })
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email')
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or invalid share code',
      });
    }

    // Check if sharing is enabled
    if (!group.isShareable) {
      return res.status(403).json({
        success: false,
        message: 'This group is not shareable',
      });
    }

    // ShareCode is valid (no need to verify token separately - shareCode is the access key)

    // Check token expiration
    if (group.shareTokenExpiresAt && new Date() > group.shareTokenExpiresAt) {
      return res.status(401).json({
        success: false,
        message: 'Share link has expired',
      });
    }

    // Get group rounds (don't populate - recipientParticipantId is not a reference)
    const rounds = await Round.find({ group: group._id })
      .sort({ roundNumber: -1 });

    // Get payment logs and group activity logs (group_created, spin), merge for activity timeline
    const [paymentLogs, groupActivityLogs] = await Promise.all([
      PaymentLog.find({ group: group._id })
        .populate('paidBy', 'name')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      GroupActivityLog.find({ group: group._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    // Build response based on share settings (default to true when undefined so webview shows completed state)
    const shareSettings = group.shareSettings || {};
    const showParticipants = shareSettings.showParticipants !== false;
    const showPaymentStatus = shareSettings.showPaymentStatus !== false;
    const showActivityLog = shareSettings.showActivityLog !== false;
    const showAmounts = shareSettings.showAmounts !== false;

    // Map participant IDs to names for payment logs
    const participantNameById = new Map();
    group.participants.forEach(p => {
      participantNameById.set(p._id.toString(), p.name);
    });
    
    // Map rounds to include recipient name from participants
    const roundsWithRecipient = rounds.map(r => {
      // Find the participant by matching recipientParticipantId
      const recipient = group.participants.find(
        p => p._id.toString() === r.recipientParticipantId.toString()
      );
      
      return {
        roundNumber: r.roundNumber,
        recipient: recipient ? {
          name: recipient.name,
        } : null,
        status: r.status,
        completedAt: r.completedAt,
      };
    });
    
    // Group is completed only when ALL members have received their payout (hasReceivedPayment), not when all have paid (isPaid)
    const allHasReceivedPayment = group.participants && group.participants.length > 0 &&
      group.participants.every(p => p.hasReceivedPayment === true);
    const isCompleted = group.status === 'COMPLETED' || allHasReceivedPayment;

    const response = {
      success: true,
      data: {
        group: {
          id: group._id,
          name: group.name,
          memberCount: group.memberCount,
          amountPerPerson: showAmounts 
            ? group.amountPerPerson 
            : undefined,
          frequency: group.frequency,
          collectionDate: group.collectionDate,
          status: isCompleted ? 'COMPLETED' : (group.status || 'ACTIVE'),
          isCompleted, // So web view can show COMPLETED badge even when payment status hidden
          createdAt: group.createdAt,
          createdBy: group.createdBy ? {
            name: group.createdBy.name,
          } : null,
          participants: showParticipants
            ? group.participants.map(p => ({
                name: p.name,
                order: p.order,
                isPaid: showPaymentStatus ? p.isPaid : undefined,
                // When group is completed, show all as PAID OUT in webview; otherwise use actual hasReceivedPayment
                hasReceivedPayment: showPaymentStatus
                  ? (isCompleted ? true : (p.hasReceivedPayment === true))
                  : false,
              }))
            : [],
          rounds: roundsWithRecipient,
          activityLog: showActivityLog
            ? (() => {
                const paymentEntries = paymentLogs.map(log => {
                  const participantName = log.participantId
                    ? participantNameById.get(log.participantId.toString()) || null
                    : null;
                  return {
                    type: 'payment',
                    description: log.note || `Payment of ${log.amount || 0}`,
                    amount: showAmounts ? log.amount : undefined,
                    paidBy: log.paidBy ? { name: log.paidBy.name } : null,
                    paidTo: participantName ? { name: participantName } : null,
                    createdAt: log.createdAt || log.paidAt,
                  };
                });
                const activityEntries = groupActivityLogs.map(log => ({
                  type: log.type,
                  description: log.type === 'group_created'
                    ? 'Admin created group'
                    : log.type === 'spin'
                      ? 'Spin for order was clicked'
                      : '',
                  createdAt: log.createdAt,
                }));
                return [...paymentEntries, ...activityEntries]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              })()
            : [],
        },
      },
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
