const mongoose = require('mongoose');

// Participant schema is defined in its own file so that each file contains only one schema.
// This schema is used as a subdocument schema inside the Group model.
const participantSchema = new mongoose.Schema({
  // Optional reference to a real User document (for "proper users").
  // We keep name as a denormalized field for display and backward compatibility.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  order: {
    type: Number,
    default: null,
  },
  // Tracks whether this participant has paid into the *current* round for the group
  isPaid: {
    type: Boolean,
    default: false,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  // Tracks whether this participant has already received their full payout
  hasReceivedPayment: {
    type: Boolean,
    default: false,
  },
  receivedPaymentAt: {
    type: Date,
    default: null,
  },
});

module.exports = participantSchema;


