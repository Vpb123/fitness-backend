const mongoose = require('mongoose');

const trainingCenterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, 
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    description:{
      type: String,
      trim: true,
      default:"This training has all facilities"
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    trainers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
      },
    ],
    facilities: {
      type: [String],
      default: [],
      enum: ['Gym', 'Swimming Pool', 'Yoga Hall', 'Sauna', 'Personal Training', 'Group Classes'],
    },
    openingTimes: [
      {
        day: {
          type: String,
          required: true,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        },
        enabled: {
          type: Boolean,
          default: false,
        },
      }
    ],
    status:{
      type:String,
      enum:['closed', 'open'],
      default:'open'
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

trainingCenterSchema.index({ name: 1, 'address.city': 1 });

const TrainingCenter = mongoose.model('TrainingCenter', trainingCenterSchema);

module.exports = TrainingCenter;
