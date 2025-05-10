const mongoose = require('mongoose');
const dayjs = require('dayjs');
const {TrainingSession} = require('../models'); 

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://Vishwajit:IghBx2fxdpExC2ze@fitness.rglgzhi.mongodb.net/?retryWrites=true&w=majority&appName=fitness'); // replace with your URI

    const todayMidnight = dayjs().startOf('day').toDate();

    // Cancel pending sessions scheduled before today
    const cancelled = await TrainingSession.updateMany(
      {
        status: 'pending',
        scheduledDate: { $lt: todayMidnight },
      },
      {
        $set: { status: 'cancelled' },
      }
    );

    // Get scheduled sessions before today
    const sessionsToComplete = await TrainingSession.find({
      status: 'scheduled',
      scheduledDate: { $lt: todayMidnight },
    });

    // Update each with actualHoursSpent = duration
    let completedCount = 0;
    for (const session of sessionsToComplete) {
      session.status = 'completed';
      session.attended = true;
      session.actualHoursSpent = session.duration;
      await session.save();
      completedCount++;
    }

    console.log(`✅ Cancelled sessions: ${cancelled.modifiedCount}`);
    console.log(`✅ Completed sessions: ${completedCount}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

run();
