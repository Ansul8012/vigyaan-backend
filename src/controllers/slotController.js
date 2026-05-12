const Slot = require('../models/Slot');

const timeLabels = [
  '9:00 AM – 10:00 AM',
  '10:00 AM – 11:00 AM',
  '11:00 AM – 12:00 PM',
  '12:00 PM – 1:00 PM',
  '1:00 PM – 2:00 PM',
  '2:00 PM – 3:00 PM',
  '3:00 PM – 4:00 PM',
  '4:00 PM – 5:00 PM',
  '5:00 PM – 6:00 PM',
  '6:00 PM – 7:00 PM',
  '7:00 PM – 8:00 PM',
];

const getDateStr = (date) => {
  return date.toISOString().split('T')[0];
};

// ─────────────────────────────────────────────────────────────
// Generate slots efficiently
// ─────────────────────────────────────────────────────────────
const generateSlotsForDate = async (dateStr) => {
  await Promise.all(
    timeLabels.map((time, i) => {
      const startHour = 9 + i;

      return Slot.findOneAndUpdate(
        { date: dateStr, startHour },
        {
          $setOnInsert: {
            date: dateStr,
            startHour,
            time,
            total: 30,
            booked: 0,
            bookedBy: [],
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
        }
      );
    })
  );
};

// ─────────────────────────────────────────────────────────────
// Sync slots
// ─────────────────────────────────────────────────────────────
let isSyncing = false;
let lastSyncTime = 0;

const syncSlots = async () => {
  try {
    const now = Date.now();

    // Prevent multiple sync calls within 1 minute
    if (isSyncing || now - lastSyncTime < 60000) {
      return;
    }

    isSyncing = true;

    const currentDate = new Date();
    const currentHour = currentDate.getHours();

    const today = getDateStr(currentDate);

    const tomorrowDate = new Date(currentDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const tomorrow = getDateStr(tomorrowDate);

    await Promise.all([
      generateSlotsForDate(today),
      generateSlotsForDate(tomorrow),
    ]);

    await Slot.deleteMany({
      $or: [
        { date: { $lt: today } },
        {
          date: today,
          startHour: { $lt: currentHour },
        },
      ],
    });

    lastSyncTime = Date.now();
  } finally {
    isSyncing = false;
  }
};

// ─────────────────────────────────────────────────────────────
// GET ALL SLOTS
// ─────────────────────────────────────────────────────────────
const getSlots = async (req, res, next) => {
  try {
    await syncSlots();

    const now = new Date();

    const today = getDateStr(now);

    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const tomorrow = getDateStr(tomorrowDate);

    const slots = await Slot.find({
      date: { $in: [today, tomorrow] },
    })
      .sort({ date: 1, startHour: 1 })
      .lean();

    const studentId = req.user?._id?.toString();

    const enriched = slots.map((slot) => {
      const isBookedByMe = slot.bookedBy.some(
        (b) => b.studentId.toString() === studentId
      );

      return {
        _id: slot._id,
        date: slot.date,
        time: slot.time,
        startHour: slot.startHour,
        total: slot.total,
        booked: slot.booked,
        available: slot.total - slot.booked,
        isFull: slot.booked >= slot.total,
        isBookedByMe,
      };
    });

    return res.status(200).json({
      success: true,
      today: {
        date: today,
        slots: enriched.filter((s) => s.date === today),
      },
      tomorrow: {
        date: tomorrow,
        slots: enriched.filter((s) => s.date === tomorrow),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// BOOK SLOT
// ─────────────────────────────────────────────────────────────
const bookSlot = async (req, res, next) => {
  try {
    const { slotId } = req.body;
    const student = req.user;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID is required',
      });
    }

    await syncSlots();

    const slot = await Slot.findById(slotId);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const today = getDateStr(now);

    if (slot.date === today && slot.startHour < currentHour) {
      return res.status(400).json({
        success: false,
        message: 'Slot already expired',
      });
    }

    const existingBooking = await Slot.findOne({
      date: slot.date,
      'bookedBy.studentId': student._id,
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: `Already booked at ${existingBooking.time}`,
      });
    }

    if (slot.booked >= slot.total) {
      return res.status(400).json({
        success: false,
        message: 'Slot is full',
      });
    }

    slot.bookedBy.push({
      studentId: student._id,
      studentName: student.fullName,
      bookedAt: new Date(),
    });

    slot.booked += 1;

    await slot.save();

    return res.status(200).json({
      success: true,
      message: 'Slot booked successfully',
      booking: {
        slotId: slot._id,
        date: slot.date,
        time: slot.time,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// CANCEL SLOT
// ─────────────────────────────────────────────────────────────
const cancelSlot = async (req, res, next) => {
  try {
    const { slotId } = req.body;
    const student = req.user;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID is required',
      });
    }

    const slot = await Slot.findById(slotId);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const today = getDateStr(now);

    if (slot.date === today && slot.startHour < currentHour) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel expired slot',
      });
    }

    const bookingIndex = slot.bookedBy.findIndex(
      (b) => b.studentId.toString() === student._id.toString()
    );

    if (bookingIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Booking not found',
      });
    }

    slot.bookedBy.splice(bookingIndex, 1);

    slot.booked = Math.max(slot.booked - 1, 0);

    await slot.save();

    return res.status(200).json({
      success: true,
      message: 'Slot cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// GET MY BOOKINGS
// ─────────────────────────────────────────────────────────────
const getMyBookings = async (req, res, next) => {
  try {
    await syncSlots();

    const student = req.user;

    const today = getDateStr(new Date());

    const slots = await Slot.find({
      date: { $gte: today },
      'bookedBy.studentId': student._id,
    })
      .sort({ date: 1, startHour: 1 })
      .lean();

    const bookings = slots.map((slot) => ({
      slotId: slot._id,
      date: slot.date,
      time: slot.time,
      startHour: slot.startHour,
    }));

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN SLOT VIEW
// ─────────────────────────────────────────────────────────────
const getAdminSlotView = async (req, res, next) => {
  try {
    await syncSlots();

    const targetDate = req.query.date || getDateStr(new Date());

    const slots = await Slot.find({
      date: targetDate,
    })
      .sort({ startHour: 1 })
      .lean();

    const result = slots.map((slot) => ({
      slotId: slot._id,
      time: slot.time,
      total: slot.total,
      booked: slot.booked,
      available: slot.total - slot.booked,
      isFull: slot.booked >= slot.total,
      students: slot.bookedBy.map((b) => ({
        studentName: b.studentName,
        studentId: b.studentId,
        bookedAt: b.bookedAt,
      })),
    }));

    return res.status(200).json({
      success: true,
      date: targetDate,
      totalSlots: result.length,
      slots: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSlots,
  bookSlot,
  cancelSlot,
  getMyBookings,
  getAdminSlotView,
};