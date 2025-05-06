const dayjs = require('dayjs');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Trainer, TrainingSession } = require('../models');


const isTimeOverlapping = (startA, endA, startB, endB) => {
  return dayjs(startA).isBefore(dayjs(endB)) &&
         dayjs(startB).isBefore(dayjs(endA));
};


const isTrainerAvailable = async (trainerId, scheduledDate, duration) => {

  const trainer = await Trainer.findOne({ _id: trainerId });
  if (!trainer) {
    console.log("Trainer not found");
    return false;
  }

  const targetStart = dayjs(scheduledDate);
  const targetEnd = targetStart.add(duration, 'hour');
  const targetDay = targetStart.format('dddd');
  const dateStr = targetStart.format('YYYY-MM-DD');

  console.log("Target session time:", {
    targetStart: targetStart.format(),
    targetEnd: targetEnd.format(),
    targetDay,
    dateStr,
  });

  const sessions = await TrainingSession.find({
    trainerId,
    status: 'scheduled',
  });

  for (const session of sessions) {
    const sessionStart = dayjs(session.scheduledDate);
    const sessionEnd = sessionStart.add(session.duration, 'hour');

    console.log("Checking overlap with existing session:", {
      sessionStart: sessionStart.format(),
      sessionEnd: sessionEnd.format(),
    });

    if (isTimeOverlapping(targetStart, targetEnd, sessionStart, sessionEnd)) {
      console.log("Conflict with session:", session._id);
      return false;
    }
  }

  const dateSpecific = trainer.availabilityByDate.find(entry => entry.date === dateStr);
  if (dateSpecific) {
    console.log("Checking against date-specific availability...");
    for (const { startTime, endTime } of dateSpecific.slots) {
      const slotStart = dayjs(`${dateStr}T${startTime}`);
      const slotEnd = dayjs(`${dateStr}T${endTime}`);
      console.log("Slot:", { slotStart: slotStart.format(), slotEnd: slotEnd.format() });

      if (targetStart.isSameOrAfter(slotStart) && targetEnd.isSameOrBefore(slotEnd)) {
        console.log("Match found in date-specific slots.");
        return true;
      }
    }
  } else {
    console.log("No date-specific availability found for:", dateStr);
  }

  const recurring = trainer.availabilityRecurring.find(entry => entry.dayOfWeek === targetDay);
  if (recurring) {
    console.log("Checking against recurring availability...");
    for (const { startTime, endTime } of recurring.slots) {
      const slotStart = dayjs(`${dateStr}T${startTime}`);
      const slotEnd = dayjs(`${dateStr}T${endTime}`);
      console.log("Recurring Slot:", { slotStart: slotStart.format(), slotEnd: slotEnd.format() });

      if (targetStart.isSameOrAfter(slotStart) && targetEnd.isSameOrBefore(slotEnd)) {
        console.log("Match found in recurring slots.");
        return true;
      }
    }
  } else {
    console.log("No recurring availability found for:", targetDay);
  }

  console.log("No matching availability found. Returning false.");
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
      end: dayjs(s.scheduledDate).add(s.duration, 'hour')
    }));

  const dateSpecific = trainer.availabilityByDate.find(e => e.date === dateStr);
  const recurring = trainer.availabilityRecurring.find(e => e.dayOfWeek === dayOfWeek);

  const rawSlots = dateSpecific?.slots || recurring?.slots || [];
  const slots = [];

  for (const slot of rawSlots) {
    const slotStart = dayjs(`${dateStr}T${slot.startTime}`);
    const slotEnd = dayjs(`${dateStr}T${slot.endTime}`);

    const overlaps = bookedSlots.some(({ start, end }) =>
      isTimeOverlapping(slotStart, slotEnd, start, end)
    );

    if (!overlaps) {
      slots.push({ startTime: slot.startTime, endTime: slot.endTime });
    }
  }

  return slots;
};

const getTrainerAvailabilityForRange = async (trainerId, startDate, endDate) => {
  const trainer = await Trainer.findOne({ _id: trainerId });
  if (!trainer) return [];

  const sessions = await TrainingSession.find({
    trainerId,
    status: 'scheduled',
    scheduledDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  });

  const bookedSlotsMap = {};
  for (const session of sessions) {
    const dateStr = dayjs(session.scheduledDate).format('YYYY-MM-DD');
    const start = dayjs(session.scheduledDate);
    const end = start.add(session.duration, 'hour');

    if (!bookedSlotsMap[dateStr]) {
      bookedSlotsMap[dateStr] = [];
    }

    bookedSlotsMap[dateStr].push({ start, end });
  }

  const availability = [];
  let current = dayjs(startDate);

  while (current.isSameOrBefore(endDate, 'day')) {
    const dateStr = current.format('YYYY-MM-DD');
    const dayOfWeek = current.format('dddd');

    const dateSpecific = trainer.availabilityByDate.find(e => e.date === dateStr);
    const recurring = trainer.availabilityRecurring.find(e => e.dayOfWeek === dayOfWeek);
    const rawSlots = dateSpecific?.slots || recurring?.slots || [];

    const daySlots = [];

    for (const slot of rawSlots) {
      const slotStart = dayjs(`${dateStr}T${slot.startTime}`);
      const slotEnd = dayjs(`${dateStr}T${slot.endTime}`);
      const overlaps = (bookedSlotsMap[dateStr] || []).some(({ start, end }) =>
        isTimeOverlapping(slotStart, slotEnd, start, end)
      );

      if (!overlaps) {
        daySlots.push({
          date: dateStr,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }

    if (daySlots.length) {
      availability.push({ date: dateStr, slots: daySlots });
    }

    current = current.add(1, 'day');
  }

  return availability;
};

module.exports = {
  isTrainerAvailable,
  getTrainerAvailabilityForDate,
  getTrainerAvailabilityForRange
};
