const Group = require('../models/Group');
const Round = require('../models/Round');
const { sendPushNotification } = require('../services/firebaseService');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res, next) => {
  try {
    const { name, memberCount } = req.body;
    const userId = req.user.id;

    if (!name || !memberCount) {
      return res.status(400).json({
        success: false,
        message: 'Group name and member count are required',
      });
    }

    const group = await Group.create({
      name,
      memberCount,
      createdBy: userId,
      participants: [],
    });

    res.status(201).json({
      success: true,
      data: {
        group: {
          id: group._id,
          name: group.name,
          memberCount: group.memberCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add participants to a group
// @route   POST /api/groups/:groupId/participants
// @access  Private
exports.addParticipants = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { participants } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Participants array is required',
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user owns the group
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this group',
      });
    }

    // Validate participant count
    if (participants.length !== group.memberCount) {
      return res.status(400).json({
        success: false,
        message: `Number of participants must be ${group.memberCount}`,
      });
    }

    // Add participants
    group.participants = participants.map((name) => ({
      name: name.trim(),
      order: null,
      isPaid: false,
    }));

    await group.save();

    // Map participants to include id
    const participantsWithId = group.participants.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      order: p.order,
      isPaid: p.isPaid,
      paidAt: p.paidAt,
      hasReceivedPayment: p.hasReceivedPayment || false,
      receivedPaymentAt: p.receivedPaymentAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        group: {
          id: group._id,
          participants: participantsWithId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Set collection details
// @route   PUT /api/groups/:groupId/collection
// @access  Private
exports.setCollectionDetails = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { amountPerPerson, frequency, collectionDate } = req.body;

    if (!amountPerPerson || !frequency || !collectionDate) {
      return res.status(400).json({
        success: false,
        message: 'Amount per person, frequency, and collection date are required',
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user owns the group
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this group',
      });
    }

    group.amountPerPerson = amountPerPerson;
    group.frequency = frequency;
    group.collectionDate = collectionDate;

    await group.save();

    // Calculate total savings
    const totalSavings = amountPerPerson * group.memberCount;

    res.status(200).json({
      success: true,
      data: {
        group: {
          id: group._id,
          amountPerPerson: group.amountPerPerson,
          frequency: group.frequency,
          collectionDate: group.collectionDate,
          totalSavings: totalSavings,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get group details
// @route   GET /api/groups/:groupId
// @access  Private
exports.getGroupDetails = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is authorized (owner or participant)
    const isOwner = group.createdBy._id.toString() === req.user.id;
    const isParticipant = group.participants.some(
      (p) => p.name.toLowerCase() === req.user.name.toLowerCase()
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this group',
      });
    }

    // Sort participants by order if order is set
    let sortedParticipants = [...group.participants];
    if (group.isOrderSet) {
      sortedParticipants.sort((a, b) => {
        if (a.order === null) return 1;
        if (b.order === null) return -1;
        return a.order - b.order;
      });
    }

    const currentRecipient = group.isOrderSet && sortedParticipants.length > 0
      ? sortedParticipants[group.currentRecipientIndex]
      : null;

    // Map participants to include id
    const participantsWithId = sortedParticipants.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      order: p.order,
      isPaid: p.isPaid,
      paidAt: p.paidAt,
      hasReceivedPayment: p.hasReceivedPayment || false,
      receivedPaymentAt: p.receivedPaymentAt,
    }));

    // Calculate total savings
    const totalSavings = group.amountPerPerson && group.memberCount 
      ? group.amountPerPerson * group.memberCount 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        group: {
          id: group._id,
          name: group.name,
          memberCount: group.memberCount,
          participants: participantsWithId,
          amountPerPerson: group.amountPerPerson,
          frequency: group.frequency,
          collectionDate: group.collectionDate,
          totalSavings: totalSavings,
          isOrderSet: group.isOrderSet,
          currentRecipient: currentRecipient ? currentRecipient.name : null,
          currentRecipientIndex: group.currentRecipientIndex,
          createdBy: {
            id: group.createdBy._id,
            name: group.createdBy.name,
          },
          status: group.status,
          createdAt: group.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Spin for order and create rounds
// @route   POST /api/groups/:groupId/spin
// @access  Private
exports.spinForOrder = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user owns the group
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to spin for this group',
      });
    }

    // Check if order is already set
    if (group.isOrderSet) {
      return res.status(400).json({
        success: false,
        message: 'Order has already been set for this group',
      });
    }

    // Check if participants are added
    if (group.participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please add participants before spinning',
      });
    }

    // Shuffle participants and assign order
    const shuffled = [...group.participants].sort(() => Math.random() - 0.5);
    shuffled.forEach((participant, index) => {
      participant.order = index + 1;
    });

    group.participants = shuffled;
    group.isOrderSet = true;
    group.currentRecipientIndex = 0;

    await group.save();

    // Sort for response (and for defining rounds)
    const sortedParticipants = [...group.participants].sort((a, b) => a.order - b.order);

    // Remove any existing rounds for this group (in case of re-spin)
    await Round.deleteMany({ group: group._id });

    // Create one Round per participant, in order
    const roundDocs = await Round.insertMany(
      sortedParticipants.map((p, index) => ({
        group: group._id,
        roundNumber: index + 1,
        recipientParticipantId: p._id,
        status: index === 0 ? 'IN_PROGRESS' : 'PENDING',
      }))
    );

    const currentRound = roundDocs.find((r) => r.roundNumber === 1) || null;

    // Map participants to include id
    const participantsWithId = sortedParticipants.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      order: p.order,
      isPaid: p.isPaid,
      paidAt: p.paidAt,
      hasReceivedPayment: p.hasReceivedPayment || false,
      receivedPaymentAt: p.receivedPaymentAt,
    }));

    // Calculate total savings
    const totalSavings =
      group.amountPerPerson && group.memberCount
        ? group.amountPerPerson * group.memberCount
        : 0;

    res.status(200).json({
      success: true,
      data: {
        group: {
          id: group._id,
          name: group.name,
          memberCount: group.memberCount,
          participants: participantsWithId,
          amountPerPerson: group.amountPerPerson,
          totalSavings: totalSavings,
          frequency: group.frequency,
          collectionDate: group.collectionDate,
          currentRecipient: sortedParticipants[0].name,
          currentRecipientIndex: group.currentRecipientIndex,
          isOrderSet: true,
          rounds: roundDocs.map((round) => ({
            id: round._id,
            roundNumber: round.roundNumber,
            recipientParticipantId: round.recipientParticipantId,
            status: round.status,
          })),
          currentRound: currentRound
            ? {
                id: currentRound._id,
                roundNumber: currentRound.roundNumber,
                recipientParticipantId: currentRound.recipientParticipantId,
                status: currentRound.status,
              }
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update payment status
// @route   PUT /api/groups/:groupId/participants/:participantId/payment
// @access  Private
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { groupId, participantId } = req.params;
    const { isPaid } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user owns the group
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update payment status',
      });
    }

    const participant = group.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
    }

    participant.isPaid = isPaid;
    if (isPaid) {
      participant.paidAt = new Date();
    } else {
      participant.paidAt = null;
    }

    await group.save();

    // Send push notification to group owner when payment is marked as paid
    if (isPaid) {
      try {
        await sendPushNotification(
          group.createdBy,
          'Payment Received',
          `${participant.name} has marked their payment as complete in ${group.name}`,
          {
            type: 'payment',
            groupId: group._id.toString(),
            participantId: participant._id.toString(),
            participantName: participant.name,
          }
        );
      } catch (notificationError) {
        // Don't fail the request if notification fails
        console.error('Error sending payment notification:', notificationError);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        participant: {
          id: participant._id,
          name: participant.name,
          isPaid: participant.isPaid,
          paidAt: participant.paidAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
exports.getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userName = req.user.name;

    // Debug logging
    console.log('getUserGroups - User ID:', userId);
    console.log('getUserGroups - User Name:', userName);

    // First, let's check all groups to see what exists
    const allGroups = await Group.find({}).populate('createdBy', 'name email');
    console.log('Total groups in database:', allGroups.length);
    if (allGroups.length > 0) {
      console.log('Sample groups:', allGroups.slice(0, 3).map(g => ({
        id: g._id,
        name: g.name,
        createdBy: g.createdBy?._id?.toString(),
        createdByType: typeof g.createdBy,
      })));
    }

    const groups = await Group.find({
      $or: [
        { createdBy: userId },
        { 'participants.name': { $regex: new RegExp(userName, 'i') } },
      ],
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('Groups found for user:', groups.length);

    res.status(200).json({
      success: true,
      data: {
        groups: groups.map((group) => {
          // Calculate total savings
          const totalSavings = group.amountPerPerson && group.memberCount 
            ? group.amountPerPerson * group.memberCount 
            : 0;
          
          return {
            id: group._id,
            name: group.name,
            memberCount: group.memberCount,
            amountPerPerson: group.amountPerPerson,
            totalSavings: totalSavings,
            frequency: group.frequency,
            collectionDate: group.collectionDate,
            isOrderSet: group.isOrderSet,
            status: group.status,
            createdAt: group.createdAt,
            createdBy: {
              id: group.createdBy._id,
              name: group.createdBy.name,
            },
          };
        }),
      },
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Delete a group
// @route   DELETE /api/groups/:groupId
// @access  Private
exports.deleteGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user owns the group
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this group',
      });
    }

    await Group.findByIdAndDelete(groupId);

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Move to next round
// @route   POST /api/groups/:groupId/next-round
// @access  Private
exports.nextRound = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user owns the group
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start next round',
      });
    }

    // Check if order is set
    if (!group.isOrderSet) {
      return res.status(400).json({
        success: false,
        message: 'Order must be set before starting next round',
      });
    }

    // Check if current recipient has paid
    const sortedParticipants = [...group.participants].sort((a, b) => {
      if (a.order === null) return 1;
      if (b.order === null) return -1;
      return a.order - b.order;
    });

    const currentRecipient = sortedParticipants[group.currentRecipientIndex];
    if (!currentRecipient) {
      return res.status(400).json({
        success: false,
        message: 'Current recipient not found',
      });
    }

    // Check if current recipient has paid (check both isPaid property and paidAt timestamp)
    // Also check if isPaid is explicitly false (not just undefined)
    const hasPaid = currentRecipient.isPaid === true || 
                    (currentRecipient.isPaid !== false && currentRecipient.paidAt !== null);
    
    console.log('Next Round Check:', {
      currentRecipientIndex: group.currentRecipientIndex,
      participantName: currentRecipient.name,
      isPaid: currentRecipient.isPaid,
      paidAt: currentRecipient.paidAt,
      hasPaid: hasPaid
    });
    
    if (!hasPaid) {
      return res.status(400).json({
        success: false,
        message: 'Current recipient must be paid before starting next round',
      });
    }

    // Mark current recipient as having received payment
    currentRecipient.hasReceivedPayment = true;
    currentRecipient.receivedPaymentAt = new Date();

    // Check if all participants have now received payment (group is completed)
    const allNowPaidOut = sortedParticipants.every(p => p.hasReceivedPayment === true);
    
    // Move to next recipient in sequence (0 → 1 → 2 → 3 → ...)
    // Works dynamically for any number of participants (3, 5, 10, etc.)
    // Each participant receives payment once, in order
    let nextRecipient = null;
    if (!allNowPaidOut) {
      // Move to next participant sequentially
      const nextIndex = (group.currentRecipientIndex + 1) % sortedParticipants.length;
      group.currentRecipientIndex = nextIndex;
      nextRecipient = sortedParticipants[nextIndex];
    }
    // If all are paid out, currentRecipientIndex stays at the last position

    // Reset payment status for ALL participants for the new round.
    // `hasReceivedPayment` keeps track of who already got their payout,
    // while `isPaid` is reused for contributions in the current round.
    group.participants.forEach((participant) => {
      participant.isPaid = false;
      participant.paidAt = null;
    });

    await group.save();

    // Update Round documents to reflect progression to the next round
    let rounds = await Round.find({ group: group._id }).sort({ roundNumber: 1 });
    let currentRoundDoc = null;

    if (rounds.length > 0) {
      const previousRoundIndex = group.currentRecipientIndex > 0 ? group.currentRecipientIndex - 1 : 0;

      // Mark previous round as completed if it exists
      const previousRound = rounds[previousRoundIndex];
      if (previousRound) {
        previousRound.status = 'COMPLETED';
        previousRound.completedAt = new Date();
        await previousRound.save();
      }

      if (allNowPaidOut) {
        // All rounds effectively completed
        currentRoundDoc = previousRound || null;
      } else {
        // Move to next round in sequence
        const nextRoundIndex = group.currentRecipientIndex;
        const nextRoundDoc = rounds[nextRoundIndex];
        if (nextRoundDoc) {
          nextRoundDoc.status = 'IN_PROGRESS';
          if (!nextRoundDoc.startedAt) {
            nextRoundDoc.startedAt = new Date();
          }
          await nextRoundDoc.save();
          currentRoundDoc = nextRoundDoc;
        }
      }

      // Refresh rounds list after updates
      rounds = await Round.find({ group: group._id }).sort({ roundNumber: 1 });
    }

    // Send push notifications
    try {
      if (allNowPaidOut) {
        await sendPushNotification(
          group.createdBy,
          'Ayuuto Completed! 🎉',
          `All members of ${group.name} have received their payments. The group is now complete!`,
          {
            type: 'group_completed',
            groupId: group._id.toString(),
          }
        );
      } else if (nextRecipient && currentRoundDoc) {
        await sendPushNotification(
          group.createdBy,
          'Next Round Started',
          `Round ${currentRoundDoc.roundNumber} has started. ${nextRecipient.name} is now the recipient.`,
          {
            type: 'next_round',
            groupId: group._id.toString(),
            recipientName: nextRecipient.name,
            roundNumber: currentRoundDoc.roundNumber.toString(),
          }
        );
      }
    } catch (notificationError) {
      console.error('Error sending next round notification:', notificationError);
    }

    // Get updated sorted participants
    const updatedSortedParticipants = [...group.participants].sort((a, b) => {
      if (a.order === null) return 1;
      if (b.order === null) return -1;
      return a.order - b.order;
    });

    // Map participants to include id and all payment fields
    const participantsWithId = updatedSortedParticipants.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      order: p.order,
      isPaid: p.isPaid,
      paidAt: p.paidAt,
      hasReceivedPayment: p.hasReceivedPayment || false,
      receivedPaymentAt: p.receivedPaymentAt,
    }));

    const newCurrentRecipient = updatedSortedParticipants[group.currentRecipientIndex];

    // Calculate total savings
    const totalSavings = group.amountPerPerson && group.memberCount 
      ? group.amountPerPerson * group.memberCount 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        group: {
          id: group._id,
          name: group.name,
          memberCount: group.memberCount,
          participants: participantsWithId,
          amountPerPerson: group.amountPerPerson,
          totalSavings: totalSavings,
          frequency: group.frequency,
          collectionDate: group.collectionDate,
          currentRecipient: newCurrentRecipient ? newCurrentRecipient.name : null,
          currentRecipientIndex: group.currentRecipientIndex,
          isOrderSet: group.isOrderSet,
          rounds: rounds.map((round) => ({
            id: round._id,
            roundNumber: round.roundNumber,
            recipientParticipantId: round.recipientParticipantId,
            status: round.status,
          })),
          currentRound: currentRoundDoc
            ? {
                id: currentRoundDoc._id,
                roundNumber: currentRoundDoc.roundNumber,
                recipientParticipantId: currentRoundDoc.recipientParticipantId,
                status: currentRoundDoc.status,
              }
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
