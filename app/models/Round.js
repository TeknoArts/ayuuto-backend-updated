const mongoose = require('mongoose');

// Round model: represents a single payout round for a group.
// Each round has an order number and a designated recipient (by participant subdocument _id).
const roundSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    // 1-based index of the round within the group (e.g. 1..memberCount)
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    // Reference to the participant (subdocument) who receives the payout this round
    recipientParticipantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    scheduledDate: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Round', roundSchema);


