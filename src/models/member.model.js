const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    age:{
      type: Number,
      default: 20,
    },
    weight:{
      type: Number,
      default:70
    },
    height:{
      type: Number,
      default: 170,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
    },
    currentTrainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      default: null, 
    },
    medicalCondition: {
      type: Boolean,
      default: false
    },
    previousTrainerIds: [
        {
          trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },
          switchDate: { type: Date, default: Date.now },
        },
      ],
  },
  {
    timestamps: true, 
  }
);


memberSchema.index({ userId: 1 }, { unique: true });

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
