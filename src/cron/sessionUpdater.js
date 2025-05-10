const cron = require('node-cron');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const { TrainingSession } = require('../models');

dayjs.extend(timezone);

const updateSessionStatuses = async () => {
  try {
    const now = dayjs().tz('Europe/London');
    const cutoff = now.startOf('day').toDate();

    const updatedScheduled = await TrainingSession.updateMany(
      {
        status: 'scheduled',
        scheduledDate: { $lt: cutoff },
      },
      [
        {
          $set: {
            status: 'completed',
            actualHoursSpent: '$duration',
            updatedAt: new Date(),
          },
        },
      ]
    );

    const updatedCancelled = await TrainingSession.updateMany(
      {
        status: { $in: ['pending', 'requested'] },
        scheduledDate: { $lt: cutoff },
      },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      }
    );

    console.log(
      `🕒 Cron ran at ${now.format('YYYY-MM-DD HH:mm')} (BST)
       ✔️ Scheduled → Completed: ${updatedScheduled.modifiedCount}
       ❌ Pending/Requested → Cancelled: ${updatedCancelled.modifiedCount}`
    );
  } catch (error) {
    console.error('❌ Cron job failed:', error);
  }
};

const startCronJob = async () => {

  cron.schedule(
    '1 0 * * *', 
    async () => {
      await updateSessionStatuses();
    },
    {
      scheduled: true,
      timezone: 'Europe/London',
    }
  );

  console.log('🕑 Cron job scheduled to run daily at 12:01 AM (BST)');
};

module.exports = startCronJob;
