const mongoose = require('mongoose');

const trainerRequestSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true, // Fast lookup of requests by member
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      index: true, // Fast lookup of requests by trainer
    },
    goalDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500, // Prevents excessively long descriptions
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'suggested_alternative'],
      default: 'pending',
    },
    alternativeTrainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      default: null, // Set when trainer suggests another trainer
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Ensure a member cannot send duplicate requests to the same trainer
trainerRequestSchema.index({ memberId: 1, trainerId: 1 }, { unique: true });

const TrainerRequest = mongoose.model('TrainerRequest', trainerRequestSchema);

module.exports = TrainerRequest;
