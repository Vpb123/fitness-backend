const mongoose = require('mongoose');

const trainingSessionSchema = new mongoose.Schema(
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
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      default: null,
    },
    weekNumber: {
      type: Number, // New field: Ensures session is linked to a workout plan week
      required: function () { return this.workoutPlanId !== null; },
    },
    status: {
      type: String,
      enum: ['requested', 'scheduled', 'completed', 'cancelled'],
      default: 'requested',
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 10, // Minimum 10-minute session
    },
    actualHoursSpent: {
      type: Number,
      default: 0, // Trainer updates after session completion
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000, // Trainer's session feedback
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

// Indexing for fast querying
trainingSessionSchema.index({ trainerId: 1, memberId: 1 });
trainingSessionSchema.index({ workoutPlanId: 1, weekNumber: 1 });

const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);

module.exports = TrainingSession;
