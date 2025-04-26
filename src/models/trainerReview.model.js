const mongoose = require('mongoose');

const trainerReviewSchema = new mongoose.Schema(
  {
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5, 
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000, // Prevents excessively long reviews
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure a member can review a trainer only once
trainerReviewSchema.index({ trainerId: 1, memberId: 1 }, { unique: true });

// Auto-update trainer’s average rating after a new review is added
trainerReviewSchema.post('save', async function (doc) {
  const TrainerProfile = mongoose.model('Trainer');
  
  const reviews = await mongoose.model('TrainerReview').find({ trainerId: doc.trainerId });
  const totalReviews = reviews.length;
  const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

  await TrainerProfile.findByIdAndUpdate(doc.trainerId, {
    rating: avgRating.toFixed(1),
    reviewCount: totalReviews,
  });
});

const TrainerReview = mongoose.model('TrainerReview', trainerReviewSchema);

module.exports = TrainerReview;
