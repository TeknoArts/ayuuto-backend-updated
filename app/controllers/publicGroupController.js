const Group = require('../models/Group');
const Round = require('../models/Round');
const PaymentLog = require('../models/PaymentLog');
const GroupActivityLog = require('../models/GroupActivityLog');
const { extractShareCode } = require('../utils/shareToken');
const sseService = require('../services/sseService');

/**
 * Build public group data (same format as API response). Used by viewGroupByShareCode and SSE broadcast.
 * @param {string} shareCode - Normalized share code
 * @returns {Promise<object|null>} - Group object or null if not found/invalid
 */
async function getPublicGroupData(shareCode) {
  if (!shareCode) return null;

  const group = await Group.findOne({ shareCode })
    .read('primary')
    .populate('createdBy', 'name email')
    .populate('participants.user', 'name email')
    .lean();

  if (!group || !group.isShareable) return null;
  if (group.shareTokenExpiresAt && new Date() > group.shareTokenExpiresAt) return null;

  const rounds = await Round.find({ group: group._id }).sort({ roundNumber: -1 });
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

  const shareSettings = group.shareSettings || {};
  const showParticipants = shareSettings.showParticipants !== false;
  const showPaymentStatus = shareSettings.showPaymentStatus !== false;
  const showActivityLog = shareSettings.showActivityLog !== false;
  const showAmounts = shareSettings.showAmounts !== false;

  const participantNameById = new Map();
  group.participants.forEach(p => {
    participantNameById.set(p._id.toString(), p.name);
  });

  const roundsWithRecipient = rounds.map(r => {
    const recipient = group.participants.find(
      p => p._id.toString() === r.recipientParticipantId.toString()
    );
    return {
      roundNumber: r.roundNumber,
      recipient: recipient ? { name: recipient.name } : null,
      status: r.status,
      completedAt: r.completedAt,
    };
  });

  const allHasReceivedPayment = group.participants && group.participants.length > 0 &&
    group.participants.every(p => p.hasReceivedPayment === true);
  const isCompleted = group.status === 'COMPLETED' || allHasReceivedPayment;

  return {
    id: group._id,
    name: group.name,
    memberCount: group.memberCount,
    amountPerPerson: showAmounts ? group.amountPerPerson : undefined,
    frequency: group.frequency,
    collectionDate: group.collectionDate,
    status: isCompleted ? 'COMPLETED' : (group.status || 'ACTIVE'),
    isCompleted,
    isOrderSet: group.isOrderSet || false,
    currentRecipientIndex: group.currentRecipientIndex != null ? group.currentRecipientIndex : 0,
    createdAt: group.createdAt,
    createdBy: group.createdBy ? { name: group.createdBy.name } : null,
    participants: showParticipants
      ? group.participants.map(p => ({
          name: p.name,
          order: p.order,
          isPaid: showPaymentStatus ? p.isPaid : undefined,
          hasReceivedPayment: showPaymentStatus ? (isCompleted ? true : (p.hasReceivedPayment === true)) : false,
        }))
      : [],
    rounds: roundsWithRecipient,
    activityLog: showActivityLog
      ? (() => {
          const paymentEntries = paymentLogs.map(log => {
            const participantName = log.participantId
              ? participantNameById.get(log.participantId.toString()) || null
              : null;
            const paidByName = log.paidBy && log.paidBy.name ? log.paidBy.name : 'Admin';
            const description = log.note || (participantName
              ? `${participantName} was paid by ${paidByName}`
              : `Payment of $${log.amount || 0}`);
            return {
              type: 'payment',
              description,
              amount: showAmounts ? log.amount : undefined,
              paidBy: { name: paidByName },
              paidTo: participantName ? { name: participantName } : null,
              createdAt: log.createdAt || log.paidAt,
            };
          });
          const activityEntries = groupActivityLogs.map(log => {
            let description = '';
            if (log.type === 'group_created') description = 'Admin created group';
            else if (log.type === 'spin') description = 'Spin for order was clicked';
            else if (log.type === 'update_emails') description = 'Admin updated participant emails';
            return { type: log.type, description, createdAt: log.createdAt };
          });
          return [...paymentEntries, ...activityEntries]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        })()
      : [],
  };
}

exports.getPublicGroupData = getPublicGroupData;

// @desc    View group by share code (Public) - No token in URL
// @route   GET /api/public/groups/view/:shareCode
// @access  Public
exports.viewGroupByShareCode = async (req, res, next) => {
  try {
    res.set({
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });

    let { shareCode } = req.params;
    shareCode = decodeURIComponent(shareCode);
    shareCode = extractShareCode(shareCode);
    shareCode = shareCode.toUpperCase().trim();

    if (!shareCode) {
      return res.status(400).json({
        success: false,
        message: 'Share code is required',
      });
    }

    const groupData = await getPublicGroupData(shareCode);
    if (!groupData) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or invalid share code',
      });
    }

    res.status(200).json({
      success: true,
      data: { group: groupData },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    SSE stream for real-time group updates
// @route   GET /api/public/groups/view/:shareCode/stream
// @access  Public
exports.streamGroupByShareCode = async (req, res, next) => {
  try {
    let { shareCode } = req.params;
    shareCode = decodeURIComponent(shareCode);
    shareCode = extractShareCode(shareCode);
    shareCode = shareCode.toUpperCase().trim();

    if (!shareCode) {
      res.status(400).json({ success: false, message: 'Share code is required' });
      return;
    }

    const groupData = await getPublicGroupData(shareCode);
    if (!groupData) {
      res.status(404).json({ success: false, message: 'Group not found or invalid share code' });
      return;
    }

    // Disable all caching for SSE
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });
    res.flushHeaders();

    sseService.subscribe(shareCode, res);

    req.on('close', () => {
      sseService.unsubscribe(shareCode, res);
    });
  } catch (err) {
    next(err);
  }
};
