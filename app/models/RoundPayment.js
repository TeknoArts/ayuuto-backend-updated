const mongoose = require('mongoose');

// RoundPayment model:
// Tracks payment status for a single participant in a specific round.
// This lets you query who has paid / not paid for any given round.
const roundPaymentSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    round: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Round',
      required: true,
    },
    // Participant is identified by the subdocument _id inside Group.participants
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Whether this participant has paid for the given round
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    amount: {
      type: Number,
      required: false,
      min: 0,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    // Which user in the app marked this payment (usually group owner)
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RoundPayment', roundPaymentSchema);


