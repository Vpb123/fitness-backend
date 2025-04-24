const mongoose = require('mongoose');

const trainerRequestSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      index: true, 
    },
    goalDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500, 
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'suggested'],
      default: 'pending',
    },
    alternativeTrainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      default: null, 
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
  { timestamps: true }
);

// Ensure a member cannot send duplicate requests to the same trainer
trainerRequestSchema.index({ memberId: 1, trainerId: 1 }, { unique: true });

const TrainerRequest = mongoose.model('TrainerRequest', trainerRequestSchema);

module.exports = TrainerRequest;
