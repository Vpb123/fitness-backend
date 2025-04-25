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
      enum: ['requested', 'scheduled', 'completed', 'cancelled', 'pending'],
      default: 'pending',
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0.5, 
    },
    actualHoursSpent: {
      type: Number,
      default: 0, 
    },
    sessionType: {
      type: String,
      enum: ['TBD', 'Cardio', 'Strength', 'Flexibility', 'Yoga', 'HIIT', 'Core', 'Mobility','Swimming', 'Endurance'],
      default: 'TBD',
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    attended: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } 
);

// Indexing for fast querying
trainingSessionSchema.index({ trainerId: 1, memberId: 1 });
trainingSessionSchema.index({ workoutPlanId: 1, weekNumber: 1 });

const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);

module.exports = TrainingSession;
