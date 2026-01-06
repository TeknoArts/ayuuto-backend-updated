const mongoose = require('mongoose');
const participantSchema = require('./Participant');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    memberCount: {
      type: Number,
      required: true,
      min: 2,
      max: 100,
    },
    participants: [participantSchema],
    amountPerPerson: {
      type: Number,
      required: false,
      min: 0,
    },
    frequency: {
      type: String,
      enum: ['MONTHLY', 'WEEKLY'],
      required: false,
    },
    collectionDate: {
      type: Number,
      required: false,
      min: 1,
      max: 31,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isOrderSet: {
      type: Boolean,
      default: false,
    },
    currentRecipientIndex: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total savings
groupSchema.virtual('totalSavings').get(function () {
  if (!this.amountPerPerson || !this.memberCount) {
    return 0;
  }
  return this.amountPerPerson * this.memberCount;
});

// Ensure virtual fields are included in JSON
groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

// Get current recipient
groupSchema.virtual('currentRecipient').get(function () {
  if (this.isOrderSet && this.participants.length > 0) {
    const sortedParticipants = [...this.participants].sort((a, b) => a.order - b.order);
    return sortedParticipants[this.currentRecipientIndex] || null;
  }
  return null;
});

module.exports = mongoose.model('Group', groupSchema);

