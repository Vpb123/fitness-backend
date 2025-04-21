const mongoose = require('mongoose');

const workoutPlanSchema = new mongoose.Schema(
  {
    refId: {
      type: String,
      unique: true,
      index: true,
    },

    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    goal: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500, 
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    weeklySessions: [
      {
        weekNumber: {
          type: Number,
          required: true,
        },
        sessionCount: {
          type: Number,
          required: true,
          min: 1, 
        },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
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

workoutPlanSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('WorkoutPlan').countDocuments();
    const nextNumber = count + 1;
    this.refId = `WKP-${String(nextNumber).padStart(3, '0')}`;
  }
  next();
});

workoutPlanSchema.index({ memberId: 1, status: 1 });

const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);

module.exports = WorkoutPlan;
