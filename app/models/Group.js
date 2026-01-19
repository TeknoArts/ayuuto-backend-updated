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
    lastCollectionNotificationSent: {
      type: Date,
      default: null,
    },
    // Shareable link fields
    shareToken: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values - only index non-null values
      default: undefined, // Don't set default to null, leave undefined
    },
    shareCode: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values - only index non-null values
      default: undefined, // Don't set default to null, leave undefined
    },
    shareTokenExpiresAt: {
      type: Date,
      default: null,
    },
    isShareable: {
      type: Boolean,
      default: false, // Admin must explicitly enable sharing
    },
    shareSettings: {
      showParticipants: {
        type: Boolean,
        default: true,
      },
      showPaymentStatus: {
        type: Boolean,
        default: true,
      },
      showActivityLog: {
        type: Boolean,
        default: true,
      },
      showAmounts: {
        type: Boolean,
        default: true,
      },
    },
    // Invitation fields (store invite tokens per participant)
    // Format: { "participantId": { token: String, expiresAt: Date } }
    participantInviteTokens: {
      type: Map,
      of: {
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
      },
      default: {},
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

