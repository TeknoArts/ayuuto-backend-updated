const mongoose = require('mongoose');

// GroupActivityLog: non-payment group events (group created, spin for order)
// Merged with PaymentLog for full activity timeline in app and shared web view.
const groupActivityLogSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    type: {
      type: String,
      enum: ['group_created', 'spin'],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GroupActivityLog', groupActivityLogSchema);
