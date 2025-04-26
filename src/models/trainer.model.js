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
      min: 0, 
    },
    age: {
      type: Number,
     default: 25,
    },
    specializations: {
      type: [String],
      enum: ['Weight Loss', 'Strength Training', 'Yoga', 'Cardio', 'Endurance', 'Flexibility', 'General Fitness'],
      required: true,
      default:['Endurance'],
    },
    about: {
      type: String,
      trim: true,
      maxlength: 500, 
      default:" I specialize in strength training and have a passion for helping individuals achieve their fitness goals. My approach is personalized, focusing on each client\'s unique needs and aspirations.",
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
            startTime: { type: String, required: true }, 
            endTime: { type: String, required: true },   
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
    timestamps: true, 
  }
);

trainerSchema.virtual('reviews', {
  ref: 'TrainerReview',           
  localField: '_id',                
  foreignField: 'trainerId',        
});


trainerSchema.virtual('trainingCenter', {
  ref: 'TrainingCenter',           
  localField: '_id',              
  foreignField: 'trainers',          
});

trainerSchema.plugin(toJSON);
trainerSchema.plugin(paginate);

trainerSchema.index({ userId: 1 }, { unique: true });

const Trainer = mongoose.model('Trainer', trainerSchema);

module.exports = Trainer;
