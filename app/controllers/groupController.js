const Group = require('../models/Group');
const Round = require('../models/Round');
const PaymentLog = require('../models/PaymentLog');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const { sendGroupInvitationEmail } = require('../services/emailService');

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

    // Validate participant count: allow partial adds, but never exceed memberCount
    if (!participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one participant is required',
      });
    }

    if (group.participants.length + participants.length > group.memberCount) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more than ${group.memberCount} participants to this group`,
      });
    }

    // Add participants
    // Supports:
    // - legacy string array (names only)        [backwards compat]
    // - objects with { userId }                 [preferred]
    // - objects with { email }                  [we attempt to resolve to an existing user]
    const normalizedParticipants = [];

    for (const p of participants) {
      if (typeof p === 'string') {
        normalizedParticipants.push({
          name: p.trim(),
          order: null,
          isPaid: false,
        });
        continue;
      }

      if (p && typeof p === 'object') {
        let userId = p.userId || p.user || null;
        let name = (p.name || '').trim();
        // Always capture email from request if provided
        let participantEmail = (p.email || '').trim().toLowerCase() || null;

        // If no explicit userId but email provided, try to resolve an existing user
        if (!userId && participantEmail) {
          const existingUser = await User.findOne({ email: participantEmail });
          if (existingUser) {
            userId = existingUser._id;
            if (!name) {
              name = existingUser.name || existingUser.email || participantEmail;
            }
            // Keep the email even if user is found (for consistency and email notifications)
          } else if (!name) {
            // Fallback: use email as name if no user found and name empty
            name = participantEmail;
          }
        }
        
        // Also handle case where email is provided even if userId is also provided
        if (!participantEmail && p.email) {
          participantEmail = String(p.email).trim().toLowerCase() || null;
        }

        if (!name && (p.email || p.name)) {
          name = String(p.name || p.email).trim();
        }

        // If we have a userId but still no name, denormalize from User
        if (userId && !name) {
          try {
            const existingUser = await User.findById(userId).select('name email');
            if (existingUser) {
              name = existingUser.name || existingUser.email || String(existingUser._id);
            }
          } catch (lookupErr) {
            console.error('Error looking up user for participant name:', lookupErr);
          }
        }

        normalizedParticipants.push({
          name,
          user: userId,
          email: participantEmail || null, // Always store email if provided (for both registered and non-registered)
          order: null,
          isPaid: false,
        });
        
        // Debug log
        if (participantEmail) {
          console.log(`[GROUP] 📝 Normalized participant: name="${name}", userId=${userId || 'null'}, email="${participantEmail}"`);
        }
        continue;
      }

      // Fallback: convert anything unexpected to a name string
      normalizedParticipants.push({
        name: String(p || '').trim(),
        order: null,
        isPaid: false,
      });
    }

    // Append new participants to any existing participants
    group.participants = [...group.participants, ...normalizedParticipants];

    // Save group first so that new participants get _id assigned by Mongoose
    await group.save();

    // Reload group to get the saved participants with their _id values and email fields
    const savedGroup = await Group.findById(group._id);

    // Get admin/creator information for email notifications
    const admin = await User.findById(req.user.id).select('name email');
    const adminName = admin ? admin.name : 'Group Admin';

    // Send email notifications to newly added participants who have email addresses
    const emailPromises = [];
    console.log(`[GROUP] 📧 Processing ${normalizedParticipants.length} participant(s) for email notifications`);
    console.log(`[GROUP] Group: ${savedGroup.name}, Admin: ${adminName}`);
    
    // Create a map to find saved participants by name and user
    const savedParticipantsMap = new Map();
    savedGroup.participants.forEach(p => {
      const key = p.user ? p.user.toString() : p.name;
      savedParticipantsMap.set(key, p);
    });
    
    for (const participant of normalizedParticipants) {
      // Find the saved participant to get the stored email
      // Try multiple matching strategies to find the saved participant
      let savedParticipant = null;
      
      if (participant.user) {
        // Match by userId (registered user)
        savedParticipant = savedGroup.participants.find(sp => 
          sp.user && sp.user.toString() === participant.user.toString()
        );
      } else {
        // For non-registered participants, try matching by email first, then by name
        if (participant.email) {
          savedParticipant = savedGroup.participants.find(sp => 
            sp.email && sp.email.toLowerCase() === participant.email.toLowerCase() && !sp.user
          );
        }
        // If not found by email, try by name
        if (!savedParticipant) {
          savedParticipant = savedGroup.participants.find(sp => 
            sp.name === participant.name && !sp.user
          );
        }
      }
      
      // Use saved participant's email if available (in case it was stored)
      if (savedParticipant && savedParticipant.email && !participant.email) {
        participant.email = savedParticipant.email;
      }
      // Also use saved participant's email if we have it stored there
      if (savedParticipant && savedParticipant.email) {
        participant.email = savedParticipant.email;
      }
      
      // Try to get email from participant's user reference OR from participant's email field
      let participantEmail = null;
      let participantName = participant.name;

      console.log(`[GROUP] Processing participant: "${participantName}", has userId: ${participant.user ? 'Yes' : 'No'}, has email: ${participant.email ? 'Yes' : 'No'}`);
      console.log(`[GROUP] 🔍 Debug - participant.email value: ${participant.email || 'null'}, participant.user: ${participant.user || 'null'}`);
      if (savedParticipant) {
        console.log(`[GROUP] 🔍 Debug - savedParticipant.email: ${savedParticipant.email || 'null'}, savedParticipant.user: ${savedParticipant.user || 'null'}`);
      } else {
        console.log(`[GROUP] 🔍 Debug - savedParticipant: NOT FOUND`);
      }

      // Priority 1: Get email from user reference (if participant is a registered user)
      if (participant.user) {
        try {
          const participantUser = await User.findById(participant.user).select('email name');
          if (participantUser) {
            participantEmail = participantUser.email;
            // Use user's name if available, otherwise use participant name
            if (participantUser.name) {
              participantName = participantUser.name;
            }
            console.log(`[GROUP] ✅ Found user for participant "${participantName}": email = ${participantEmail || 'NOT SET'}`);
          } else {
            console.log(`[GROUP] ⚠️  User not found for userId: ${participant.user}`);
          }
        } catch (userLookupError) {
          console.error(`[GROUP] ❌ Error looking up user for participant:`, userLookupError);
        }
      }
      
      // Priority 2: Get email from participant object itself (for non-registered participants)
      if (!participantEmail && participant.email) {
        participantEmail = participant.email.trim().toLowerCase();
        console.log(`[GROUP] ✅ Using email from participant object: ${participantEmail} (non-registered participant)`);
      }
      
      // Priority 3: Get email from saved participant (fallback)
      if (!participantEmail && savedParticipant && savedParticipant.email) {
        participantEmail = savedParticipant.email.trim().toLowerCase();
        console.log(`[GROUP] ✅ Using email from saved participant: ${participantEmail} (non-registered participant)`);
      }
      
      // Log if no email available
      if (!participantEmail) {
        console.log(`[GROUP] ⚠️  Participant "${participantName}" has no email address - cannot send email`);
        console.log(`[GROUP]    Add participant with email field to send invitation email`);
      }

      // Ensure group has a shareCode for viewing (generate if doesn't exist) - do this ONCE before the loop
      if (!savedGroup.shareCode) {
        const { generateShareCode } = require('../utils/shareToken');
        let shareCode;
        let attempts = 0;
        // Ensure unique share code
        do {
          shareCode = generateShareCode();
          const existing = await Group.findOne({ shareCode });
          if (!existing) break;
          attempts++;
          if (attempts > 10) {
            console.error(`[GROUP] ❌ Failed to generate unique share code`);
            break;
          }
        } while (true);
        
        if (shareCode) {
          savedGroup.shareCode = shareCode;
          savedGroup.isShareable = true; // Enable sharing so participants can view
          // Set expiration (90 days)
          savedGroup.shareTokenExpiresAt = new Date();
          savedGroup.shareTokenExpiresAt.setDate(savedGroup.shareTokenExpiresAt.getDate() + 90);
          await savedGroup.save();
          console.log(`[GROUP] ✅ Generated shareCode for group: ${shareCode}`);
        }
      }

      // Send email if we have an email address (from user OR from participant email field)
      if (participantEmail) {
        console.log(`[GROUP] 📤 Sending group notification email to: ${participantEmail} for participant: ${participantName}`);
        console.log(`[GROUP] Using shareCode: ${savedGroup.shareCode || 'NOT SET'}`);
        
        if (!savedGroup.shareCode) {
          console.error(`[GROUP] ❌ ERROR: shareCode is missing! Cannot send email with view link.`);
        }
        
        emailPromises.push(
          sendGroupInvitationEmail(
            participantEmail,
            participantName,
            savedGroup.name,
            adminName,
            savedGroup._id.toString(),
            savedGroup.shareCode
          ).then(() => {
            console.log(`[GROUP] ✅ Successfully sent group notification email to: ${participantEmail}`);
          }).catch((emailError) => {
            // Log error but don't fail the request
            console.error(`[GROUP] ❌ Error sending group notification email to ${participantEmail}:`, emailError.message || emailError);
          })
        );
      } else {
        console.log(`[GROUP] ⚠️  Skipping email for participant "${participantName}" - no email address available`);
      }
    }

    // Save group with invite tokens
    await savedGroup.save();

    // Send all emails in parallel (non-blocking)
    if (emailPromises.length > 0) {
      Promise.all(emailPromises).then(() => {
        console.log(`[GROUP] Sent ${emailPromises.length} group invitation email(s) for group: ${savedGroup.name}`);
      }).catch((error) => {
        console.error('[GROUP] Error sending some invitation emails:', error);
      });
    }

    // Map participants to include id
    const participantsWithId = savedGroup.participants.map((p) => ({
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

// @desc    Remove a participant from a group
// @route   DELETE /api/groups/:groupId/participants/:participantId
// @access  Private
exports.removeParticipant = async (req, res, next) => {
  try {
    const { groupId, participantId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Only the group owner can modify participants
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this group',
      });
    }

    // If order is already set, do not allow removal (would break rounds/order)
    if (group.isOrderSet) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove participants after order has been set',
      });
    }

    const participant = group.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
    }

    // Remove the subdocument
    participant.remove();

    await group.save();

    // Map remaining participants to include id
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
          memberCount: group.memberCount,
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

    // Validate frequency - must be either 'MONTHLY' or 'WEEKLY'
    if (frequency !== 'MONTHLY' && frequency !== 'WEEKLY') {
      return res.status(400).json({
        success: false,
        message: 'Frequency must be either "MONTHLY" or "WEEKLY"',
      });
    }

    // Validate collection date - must be between 1 and 31
    const dateNum = parseInt(collectionDate);
    if (isNaN(dateNum) || dateNum < 1 || dateNum > 31) {
      return res.status(400).json({
        success: false,
        message: 'Collection date must be a number between 1 and 31',
      });
    }

    // Validate amount - must be positive
    if (amountPerPerson <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount per person must be greater than 0',
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
    group.collectionDate = dateNum;

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

    const group = await Group.findById(groupId)
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is authorized (owner or participant)
    const isOwner = group.createdBy && group.createdBy._id && group.createdBy._id.toString() === req.user.id;
    const isParticipant = group.participants.some((p) => {
      const byUserId = p.user && p.user.toString() === req.user.id;
      const byName =
        typeof p.name === 'string' &&
        typeof req.user.name === 'string' &&
        p.name.toLowerCase() === req.user.name.toLowerCase();
      return byUserId || byName;
    });

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

    // Map participants to include id and populated user info (if any)
    const participantsWithId = sortedParticipants.map((p) => {
      const hasPopulatedUser = p.user && typeof p.user === 'object' && p.user._id;
      const userId = hasPopulatedUser
        ? p.user._id.toString()
        : p.user
        ? p.user.toString()
        : null;

      const user =
        hasPopulatedUser
          ? {
              id: p.user._id.toString(),
              name: p.user.name,
              email: p.user.email,
            }
          : null;

      return {
        id: p._id.toString(),
        name: p.name,
        order: p.order,
        isPaid: p.isPaid,
        paidAt: p.paidAt,
        hasReceivedPayment: p.hasReceivedPayment || false,
        receivedPaymentAt: p.receivedPaymentAt,
        userId,
        user,
      };
    });

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
          createdBy: group.createdBy && group.createdBy._id ? {
            id: group.createdBy._id.toString(),
            name: group.createdBy.name || 'Unknown',
          } : {
            id: null,
            name: 'Deleted User',
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

    // Check if participants are added and complete
    if (group.participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please add participants before spinning',
      });
    }

    if (group.participants.length !== group.memberCount) {
      return res.status(400).json({
        success: false,
        message: 'Please add all participants before spinning',
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

    if (isPaid) {
      // Append payment log for this contribution into the current round
      try {
        // Find the current round (prefer IN_PROGRESS, fallback to highest roundNumber)
        let currentRound = await Round.findOne({
          group: group._id,
          status: 'IN_PROGRESS',
        });

        if (!currentRound) {
          currentRound = await Round.findOne({ group: group._id }).sort({ roundNumber: -1 });
        }

        if (currentRound) {
          await PaymentLog.create({
            group: group._id,
            round: currentRound._id,
            participantId: participant._id,
            amount: group.amountPerPerson || 0,
            paidBy: req.user.id,
            method: 'OTHER',
          });
        }
      } catch (logError) {
        console.error('Error creating payment log entry:', logError);
      }

      // Store notification + send push to group owner when payment is marked as paid
      try {
        await notificationService.sendNotificationToUser({
          userId: group.createdBy,
          title: 'Payment Received',
          body: `${participant.name} has marked their payment as complete in ${group.name}`,
          type: 'payment',
          data: {
            type: 'payment',
            groupId: group._id.toString(),
            participantId: participant._id.toString(),
            participantName: participant.name,
          },
        });
      } catch (notificationError) {
        // Don't fail the request if notification fails
        console.error('Error sending/storing payment notification:', notificationError);
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

// @desc    Get payment logs for a group
// @route   GET /api/groups/:groupId/logs
// @access  Private (owner or participant)
exports.getGroupLogs = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).populate('createdBy', 'name email');
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Authorize: user must be owner or participant
    const isOwner = group.createdBy && group.createdBy._id && group.createdBy._id.toString() === req.user.id;
    const isParticipant = group.participants.some((p) => {
      const byUserId = p.user && p.user.toString() === req.user.id;
      const byName =
        typeof p.name === 'string' &&
        typeof req.user.name === 'string' &&
        p.name.toLowerCase() === req.user.name.toLowerCase();
      return byUserId || byName;
    });

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view logs for this group',
      });
    }

    // Load payment logs for group, newest first
    const logs = await PaymentLog.find({ group: groupId })
      .populate('round', 'roundNumber')
      .populate('paidBy', 'name email')
      .sort({ paidAt: -1, createdAt: -1 });

    // Map participant ids to names
    const participantNameById = new Map();
    group.participants.forEach((p) => {
      participantNameById.set(p._id.toString(), p.name);
    });

    const mappedLogs = logs.map((log) => ({
      id: log._id.toString(),
      type: 'payment',
      groupId: group._id.toString(),
      participantId: log.participantId ? log.participantId.toString() : null,
      participantName: log.participantId
        ? participantNameById.get(log.participantId.toString()) || null
        : null,
      amount: log.amount,
      roundNumber: log.round && typeof log.round.roundNumber === 'number'
        ? log.round.roundNumber
        : null,
      paidBy: log.paidBy
        ? {
            id: log.paidBy._id.toString(),
            name: log.paidBy.name,
          }
        : null,
      paidAt: log.paidAt,
      createdAt: log.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        logs: mappedLogs,
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
        { 'participants.user': userId },
        { 'participants.name': { $regex: new RegExp(userName, 'i') } },
      ],
    })
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email')
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
          
          // Handle null createdBy (user might have been deleted)
          // Safely check if createdBy exists and has _id
          let createdBy;
          try {
            if (group.createdBy && typeof group.createdBy === 'object') {
              // Check if it's a populated user object with _id
              if (group.createdBy._id && typeof group.createdBy._id === 'object') {
                // CreatedBy is populated and has _id
                createdBy = {
                  id: group.createdBy._id.toString(),
                  name: group.createdBy.name || 'Unknown',
                };
              } else if (group.createdBy.toString && typeof group.createdBy.toString === 'function') {
                // CreatedBy is an ObjectId (not populated) - has toString method
                createdBy = {
                  id: group.createdBy.toString(),
                  name: 'Unknown',
                };
              } else {
                // CreatedBy object exists but is invalid (user was deleted)
                createdBy = {
                  id: null,
                  name: 'Deleted User',
                };
              }
            } else {
              // CreatedBy is null or invalid (user was deleted)
              createdBy = {
                id: null,
                name: 'Deleted User',
              };
            }
          } catch (error) {
            // Fallback if anything goes wrong
            console.error('Error processing createdBy for group:', group.name, error);
            createdBy = {
              id: null,
              name: 'Deleted User',
            };
          }
          
          // Map participants to include id and populated user info (if any)
          const participantsWithId = (group.participants || []).map((p) => {
            const hasPopulatedUser = p.user && typeof p.user === 'object' && p.user._id;
            const userId = hasPopulatedUser
              ? p.user._id.toString()
              : p.user
              ? p.user.toString()
              : null;

            const user =
              hasPopulatedUser
                ? {
                    id: p.user._id.toString(),
                    name: p.user.name,
                    email: p.user.email,
                  }
                : null;

            return {
              id: p._id.toString(),
              name: p.name,
              order: p.order,
              isPaid: p.isPaid,
              paidAt: p.paidAt,
              hasReceivedPayment: p.hasReceivedPayment || false,
              receivedPaymentAt: p.receivedPaymentAt,
              userId,
              user,
            };
          });
          
          return {
            id: group._id,
            name: group.name,
            memberCount: group.memberCount,
            participants: participantsWithId,
            amountPerPerson: group.amountPerPerson,
            totalSavings: totalSavings,
            frequency: group.frequency,
            collectionDate: group.collectionDate,
            isOrderSet: group.isOrderSet,
            status: group.status,
            createdAt: group.createdAt,
            createdBy: createdBy,
          };
        }),
      },
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Test collection notifications (manual trigger)
// @route   POST /api/groups/test-collection-notifications
// @access  Private
exports.testCollectionNotifications = async (req, res, next) => {
  try {
    const { checkAndSendCollectionNotifications } = require('../services/schedulerService');
    await checkAndSendCollectionNotifications();
    res.status(200).json({
      success: true,
      message: 'Collection notification check completed. Check logs for details.',
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

    const group = await Group.findById(groupId).populate('participants.user', 'id');
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user owns the group OR is a participant in the group
    const isOwner = group.createdBy.toString() === req.user.id;
    const isParticipant = group.participants && group.participants.some((p) => {
      if (p.user && typeof p.user === 'object' && p.user._id) {
        // User is populated
        return p.user._id.toString() === req.user.id;
      } else if (p.user) {
        // User is an ObjectId
        return p.user.toString() === req.user.id;
      }
      return false;
    });
    
    if (!isOwner && !isParticipant) {
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

    // Store notifications + send push
    try {
      if (allNowPaidOut) {
        await notificationService.sendNotificationToUser({
          userId: group.createdBy,
          title: 'Ayuuto Completed! 🎉',
          body: `All members of ${group.name} have received their payments. The group is now complete!`,
          type: 'group_completed',
          data: {
            type: 'group_completed',
            groupId: group._id.toString(),
          },
        });
      } else if (nextRecipient && currentRoundDoc) {
        await notificationService.sendNotificationToUser({
          userId: group.createdBy,
          title: 'Next Round Started',
          body: `Round ${currentRoundDoc.roundNumber} has started. ${nextRecipient.name} is now the recipient.`,
          type: 'next_round',
          data: {
            type: 'next_round',
            groupId: group._id.toString(),
            recipientName: nextRecipient.name,
            roundNumber: currentRoundDoc.roundNumber.toString(),
          },
        });
      }
    } catch (notificationError) {
      console.error('Error sending/storing next round notification:', notificationError);
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

// @desc    Enable sharing and generate share link
// @route   POST /api/groups/:groupId/share/enable
// @access  Private (Group Admin only)
exports.enableSharing = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { expiresInDays, shareSettings } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check authorization
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can enable sharing',
      });
    }

    // Generate token if not exists
    if (!group.shareToken) {
      const { generateShareToken } = require('../utils/shareToken');
      group.shareToken = generateShareToken();
    }

    // Generate share code if not exists (short code for URL, no token visible)
    if (!group.shareCode) {
      const { generateShareCode } = require('../utils/shareToken');
      let shareCode;
      let attempts = 0;
      // Ensure unique share code
      do {
        shareCode = generateShareCode();
        const existing = await Group.findOne({ shareCode });
        if (!existing) break;
        attempts++;
        if (attempts > 10) {
          throw new Error('Failed to generate unique share code');
        }
      } while (true);
      group.shareCode = shareCode;
    }

    // Set expiration (default: 90 days)
    const expiresIn = expiresInDays || 90;
    group.shareTokenExpiresAt = new Date();
    group.shareTokenExpiresAt.setDate(
      group.shareTokenExpiresAt.getDate() + expiresIn
    );

    // Enable sharing
    group.isShareable = true;

    // Update share settings if provided
    if (shareSettings) {
      group.shareSettings = {
        ...group.shareSettings,
        ...shareSettings,
      };
    }

    await group.save();

    // Generate share link using shareCode (no token in URL)
    const { generateShareLink } = require('../utils/shareToken');
    const shareLink = generateShareLink(group.shareCode, req);

    res.status(200).json({
      success: true,
      data: {
        shareLink,
        shareToken: group.shareToken,
        expiresAt: group.shareTokenExpiresAt,
        shareSettings: group.shareSettings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Disable sharing
// @route   POST /api/groups/:groupId/share/disable
// @access  Private (Group Admin only)
exports.disableSharing = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check authorization
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can disable sharing',
      });
    }

    group.isShareable = false;
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Sharing disabled successfully',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get share link (if sharing is enabled)
// @route   GET /api/groups/:groupId/share
// @access  Private (Group Admin only)
exports.getShareLink = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check authorization
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can view share link',
      });
    }

    if (!group.isShareable || !group.shareToken) {
      return res.status(400).json({
        success: false,
        message: 'Sharing is not enabled for this group',
      });
    }

    // Generate shareCode if it doesn't exist (for backward compatibility)
    if (!group.shareCode) {
      const { generateShareCode } = require('../utils/shareToken');
      let shareCode;
      let attempts = 0;
      // Ensure unique share code
      do {
        shareCode = generateShareCode();
        const existing = await Group.findOne({ shareCode });
        if (!existing) break;
        attempts++;
        if (attempts > 10) {
          throw new Error('Failed to generate unique share code');
        }
      } while (true);
      group.shareCode = shareCode;
      await group.save();
    }

    const { generateShareLink } = require('../utils/shareToken');
    const shareLink = generateShareLink(group.shareCode, req);

    res.status(200).json({
      success: true,
      data: {
        shareLink,
        expiresAt: group.shareTokenExpiresAt,
        shareSettings: group.shareSettings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Regenerate share token
// @route   POST /api/groups/:groupId/share/regenerate
// @access  Private (Group Admin only)
exports.regenerateShareToken = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { expiresInDays } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check authorization
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can regenerate share token',
      });
    }

    // Generate new token and share code
    const { generateShareToken, generateShareCode, generateShareLink } = require('../utils/shareToken');
    group.shareToken = generateShareToken();
    
    // Generate new share code
    let shareCode;
    let attempts = 0;
    do {
      shareCode = generateShareCode();
      const existing = await Group.findOne({ shareCode });
      if (!existing) break;
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique share code');
      }
    } while (true);
    group.shareCode = shareCode;

    // Set expiration
    const expiresIn = expiresInDays || 90;
    group.shareTokenExpiresAt = new Date();
    group.shareTokenExpiresAt.setDate(
      group.shareTokenExpiresAt.getDate() + expiresIn
    );

    await group.save();

    const shareLink = generateShareLink(group.shareCode, req);

    res.status(200).json({
      success: true,
      data: {
        shareLink,
        shareToken: group.shareToken,
        expiresAt: group.shareTokenExpiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};
