const dayjs = require('dayjs');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(utc);
dayjs.extend(timezone);

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

  const targetStart = dayjs.utc(scheduledDate).tz("Europe/London");
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
    const sessionStart = dayjs.utc(session.scheduledDate).tz("Europe/London");
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
      const slotStart = dayjs.tz(`${dateStr}T${startTime}`, "Europe/London");
      const slotEnd = dayjs.tz(`${dateStr}T${endTime}`, "Europe/London");
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
    console.log("Raw recurring slots:", recurring.slots);
    for (const { startTime, endTime } of recurring.slots) {
      const slotStart = dayjs.tz(`${dateStr}T${startTime}`, "Europe/London");
      const slotEnd = dayjs.tz(`${dateStr}T${endTime}`, "Europe/London");
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

  const dateStr = dayjs.utc(date).tz("Europe/London").format('YYYY-MM-DD');
  const dayOfWeek = dayjs.utc(date).tz("Europe/London").format('dddd');

  const sessions = await TrainingSession.find({
    trainerId,
    status: 'scheduled',
  });

  const bookedSlots = sessions
    .filter(s => dayjs.utc(s.scheduledDate).tz("Europe/London").format('YYYY-MM-DD') === dateStr)
    .map(s => ({
      start: dayjs.utc(s.scheduledDate).tz("Europe/London"),
      end: dayjs.utc(s.scheduledDate).tz("Europe/London").add(s.duration, 'hour')
    }));

  const dateSpecific = trainer.availabilityByDate.find(e => e.date === dateStr);
  const recurring = trainer.availabilityRecurring.find(e => e.dayOfWeek === dayOfWeek);

  const rawSlots = dateSpecific?.slots || recurring?.slots || [];
  const slots = [];

  for (const slot of rawSlots) {
    const slotStart = dayjs.tz(`${dateStr}T${slot.startTime}`, "Europe/London");
    const slotEnd = dayjs.tz(`${dateStr}T${slot.endTime}`, "Europe/London");

    console.log("Checking slot:", {
      date: dateStr,
      slotStart: slotStart.format(),
      slotEnd: slotEnd.format()
    });

    const overlaps = bookedSlots.some(({ start, end }) => {
      const overlap = isTimeOverlapping(slotStart, slotEnd, start, end);
      if (overlap) {
        console.log("Slot overlaps with booked session:", {
          bookedStart: start.format(),
          bookedEnd: end.format()
        });
      }
      return overlap;
    });

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
    const sessionStart = dayjs.utc(session.scheduledDate).tz("Europe/London");
    const sessionEnd = sessionStart.add(session.duration, 'hour');
    const dateStr = sessionStart.format('YYYY-MM-DD');

    if (!bookedSlotsMap[dateStr]) {
      bookedSlotsMap[dateStr] = [];
    }

    bookedSlotsMap[dateStr].push({ start: sessionStart, end: sessionEnd });
  }

  const availability = [];
  let current = dayjs.utc(startDate).tz("Europe/London");

  while (current.isSameOrBefore(dayjs.utc(endDate).tz("Europe/London"), 'day')) {
    const dateStr = current.format('YYYY-MM-DD');
    const dayOfWeek = current.format('dddd');

    const dateSpecific = trainer.availabilityByDate.find(e => e.date === dateStr);
    const recurring = trainer.availabilityRecurring.find(e => e.dayOfWeek === dayOfWeek);
    const rawSlots = dateSpecific?.slots || recurring?.slots || [];

    const daySlots = [];

    for (const slot of rawSlots) {
      const slotStart = dayjs.tz(`${dateStr}T${slot.startTime}`, "Europe/London");
      const slotEnd = dayjs.tz(`${dateStr}T${slot.endTime}`, "Europe/London");

      console.log("Checking slot:", {
        date: dateStr,
        slotStart: slotStart.format(),
        slotEnd: slotEnd.format()
      });

      const overlaps = (bookedSlotsMap[dateStr] || []).some(({ start, end }) => {
        const overlap = isTimeOverlapping(slotStart, slotEnd, start, end);
        if (overlap) {
          console.log("Slot overlaps with booked session:", {
            bookedStart: start.format(),
            bookedEnd: end.format()
          });
        }
        return overlap;
      });

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
