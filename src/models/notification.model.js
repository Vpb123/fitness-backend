const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, 
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: [
       
        'trainer_request_response', 
        'workout_plan_created',     
        'session_updated',           
        'session_created',         
        'session_request_response',
        'trainer_cancelled_session', 
      
        'trainer_connection_request',
        'session_request',             
        'member_cancelled_session',  
        'pending_session',            
        'trainer_switched',           

        'account_approved',            
        'training_center_assigned',     
        'approval_requested',          
    
        'general',                      
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['unread', 'read'],
      default: 'unread',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } 
);

notificationSchema.index({ userId: 1, status: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
