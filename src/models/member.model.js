const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
    },
    currentTrainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      default: null, // Null if member isn't assigned to a trainer yet
    },
    previousTrainerIds: [
        {
          trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },
          switchDate: { type: Date, default: Date.now },
        },
      ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Ensure only one member profile per user
memberSchema.index({ userId: 1 }, { unique: true });

const Member = mongoose.model('MemberProfile', memberSchema);

module.exports = Member;
