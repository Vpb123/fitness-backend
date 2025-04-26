const mongoose = require('mongoose');

const trainingCenterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Prevents duplicate training centers
    },
    address: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    trainers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trainer', 
      },
    ],
    facilities: {
      type: [String],
      default: [],
      enum: ['Gym', 'Swimming Pool', 'Yoga Hall', 'Sauna', 'Personal Training', 'Group Classes'],
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

// Index for quick lookups
trainingCenterSchema.index({ name: 1, 'address.city': 1 });

const TrainingCenter = mongoose.model('TrainingCenter', trainingCenterSchema);

module.exports = TrainingCenter;
