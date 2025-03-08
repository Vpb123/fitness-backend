const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      enum: ['approve_trainers', 'manage_users', 'monitor_sessions', 'view_reports'],
      default: ['view_reports'], // Default permission for admins
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

// Ensure only one admin profile per user
adminSchema.index({ userId: 1 }, { unique: true });

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
