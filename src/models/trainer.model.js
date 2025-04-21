const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const trainerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    experienceYears: {
      type: Number,
     default: 0,
      min: 0, // Prevents negative values
    },
    specializations: {
      type: [String],
      enum: ['Weight Loss', 'Strength Training', 'Yoga', 'Cardio', 'Endurance', 'Flexibility', 'General Fitness'],
      required: true,
    },
    about: {
      type: String,
      trim: true,
      maxlength: 500, 
    },
    availabilityRecurring: [
      {
        dayOfWeek: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          required: true,
        },
        slots: [
          {
            startTime: { type: String, required: true }, // "09:00"
            endTime: { type: String, required: true },   // "11:00"
          },
        ],
      },
    ],

    availabilityByDate: [
      {
        date: { type: String, required: true },
        slots: [
          {
            startTime: { type: String, required: true },
            endTime: { type: String, required: true },
          },
        ],
      },
    ],

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

trainerSchema.plugin(toJSON);
trainerSchema.plugin(paginate);
// Ensure only one trainer profile per user
trainerSchema.index({ userId: 1 }, { unique: true });

const Trainer = mongoose.model('Trainer', trainerSchema);

module.exports = Trainer;
