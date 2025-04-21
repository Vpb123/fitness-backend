const dayjs = require('dayjs');
const {Trainer, TrainingSession } = require('../models');

const isTimeOverlapping = (startA, endA, startB, endB) => {
  return dayjs(startA).isBefore(endB) && dayjs(startB).isBefore(endA);
};

const isTrainerAvailable = async (trainerId, scheduledDate, duration) => {
  const trainer = await Trainer.findOne({ userId: trainerId });
  if (!trainer) return false;

  const targetStart = dayjs(scheduledDate);
  const targetEnd = targetStart.add(duration, 'minute');
  const targetDay = targetStart.format('dddd');
  const dateStr = targetStart.format('YYYY-MM-DD');

  const sessions = await TrainingSession.find({
    trainerId,
    status: 'scheduled',
  });

  for (const session of sessions) {
    const sessionStart = dayjs(session.scheduledDate);
    const sessionEnd = sessionStart.add(session.duration, 'minute');
    if (isTimeOverlapping(targetStart, targetEnd, sessionStart, sessionEnd)) {
      return false;
    }
  }

  const dateSpecific = trainer.availabilityByDate.find(entry => entry.date === dateStr);
  if (dateSpecific) {
    return dateSpecific.slots.some(({ startTime, endTime }) => {
      const slotStart = dayjs(`${dateStr}T${startTime}`);
      const slotEnd = dayjs(`${dateStr}T${endTime}`);
      return targetStart.isSameOrAfter(slotStart) && targetEnd.isSameOrBefore(slotEnd);
    });
  }

  const recurring = trainer.availabilityRecurring.find(entry => entry.dayOfWeek === targetDay);
  if (recurring) {
    return recurring.slots.some(({ startTime, endTime }) => {
      const slotStart = dayjs(`${dateStr}T${startTime}`);
      const slotEnd = dayjs(`${dateStr}T${endTime}`);
      return targetStart.isSameOrAfter(slotStart) && targetEnd.isSameOrBefore(slotEnd);
    });
  }

  return false;
};

const getTrainerAvailabilityForDate = async (trainerId, date) => {
  const trainer = await Trainer.findOne({ _id: trainerId });
  if (!trainer) return [];

  const dateStr = dayjs(date).format('YYYY-MM-DD');
  const dayOfWeek = dayjs(date).format('dddd');

  const sessions = await TrainingSession.find({
    trainerId,
    status: 'scheduled',
  });

  const bookedSlots = sessions
    .filter(s => dayjs(s.scheduledDate).format('YYYY-MM-DD') === dateStr)
    .map(s => ({
      start: dayjs(s.scheduledDate),
      end: dayjs(s.scheduledDate).add(s.duration, 'minute')
    }));

  let slots = [];
  const dateSpecific = trainer.availabilityByDate.find(e => e.date === dateStr);
  const recurring = trainer.availabilityRecurring.find(e => e.dayOfWeek === dayOfWeek);

  const rawSlots = dateSpecific?.slots || recurring?.slots || [];

  for (const slot of rawSlots) {
    const slotStart = dayjs(`${dateStr}T${slot.startTime}`);
    const slotEnd = dayjs(`${dateStr}T${slot.endTime}`);

    const overlaps = bookedSlots.some(({ start, end }) => isTimeOverlapping(slotStart, slotEnd, start, end));
    if (!overlaps) {
      slots.push({ startTime: slot.startTime, endTime: slot.endTime });
    }
  }

  return slots;
};

module.exports = {
  isTrainerAvailable,
  getTrainerAvailabilityForDate
};
