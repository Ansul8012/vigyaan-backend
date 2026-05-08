const Slot = require('../models/Slot');

// ─── HELPER: Generate today and tomorrow's slots ──────────────────────────────
const generateSlotsForDate = async (dateStr) => {
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

  for (let i = 0; i < timeLabels.length; i++) {
    const startHour = 9 + i;
    // insertOne only if not already exists (unique index handles duplicates)
    await Slot.findOneAndUpdate(
      { date: dateStr, startHour },
      {
        $setOnInsert: {
          date: dateStr,
          startHour,
          time: timeLabels[i],
          total: 30,
          booked: 0,
          bookedBy: [],
        },
      },
      { upsert: true, new: true }
    );
  }
};

// ─── HELPER: Get date string YYYY-MM-DD ───────────────────────────────────────
const getDateStr = (date) => date.toISOString().split('T')[0];

// ─── HELPER: Auto-create today + tomorrow, delete expired past slots ──────────
const syncSlots = async () => {
  const now = new Date();
  const currentHour = now.getHours(); // 0-23

  // Today and tomorrow date strings
  const today = getDateStr(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getDateStr(tomorrow);

  // Generate slots for today and tomorrow
  await generateSlotsForDate(today);
  await generateSlotsForDate(tomorrowStr);

  // Delete past slots:
  // - All slots from dates BEFORE today
  // - Today's slots where startHour < currentHour (slot already finished)
  await Slot.deleteMany({
    $or: [
      { date: { $lt: today } },
      {
        date: today,
        startHour: { $lt: currentHour },
      },
    ],
  });
};

// ─── GET ALL AVAILABLE SLOTS ──────────────────────────────────────────────────
// GET /api/slots
// Returns today + tomorrow slots (auto-sync happens here)
const getSlots = async (req, res, next) => {
  try {
    await syncSlots();

    const now = new Date();
    const today = getDateStr(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getDateStr(tomorrow);

    const slots = await Slot.find({
      date: { $in: [today, tomorrowStr] },
    }).sort({ date: 1, startHour: 1 });

    // Mark which slot this student has booked (if student)
    const studentId = req.user._id;

    const enriched = slots.map((slot) => {
      const isBookedByMe = slot.bookedBy.some(
        (b) => b.studentId.toString() === studentId.toString()
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

    // Split by day
    const todaySlots = enriched.filter((s) => s.date === today);
    const tomorrowSlots = enriched.filter((s) => s.date === tomorrowStr);

    return res.status(200).json({
      success: true,
      today: {
        date: today,
        slots: todaySlots,
      },
      tomorrow: {
        date: tomorrowStr,
        slots: tomorrowSlots,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── BOOK A SLOT ──────────────────────────────────────────────────────────────
// POST /api/slots/book
// Body: { slotId }
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
        message: 'Slot not found or has already expired',
      });
    }

    // Check slot is not in the past
    const now = new Date();
    const currentHour = now.getHours();
    const today = getDateStr(now);

    if (slot.date === today && slot.startHour <= currentHour) {
      return res.status(400).json({
        success: false,
        message: 'This slot has already started or passed',
      });
    }

    // Check student hasn't already booked a slot on this same date
    const existingBooking = await Slot.findOne({
      date: slot.date,
      'bookedBy.studentId': student._id,
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: `You already have a slot booked on ${slot.date} at ${existingBooking.time}`,
      });
    }

    // Check slot is not full
    if (slot.booked >= slot.total) {
      return res.status(400).json({
        success: false,
        message: 'This slot is full. Please choose another time.',
      });
    }

    // Book the slot
    slot.bookedBy.push({
      studentId: student._id,
      studentName: student.fullName,
      bookedAt: new Date(),
    });
    slot.booked += 1;
    await slot.save();

    return res.status(200).json({
      success: true,
      message: `Slot booked successfully!`,
      booking: {
        date: slot.date,
        time: slot.time,
        studentName: student.fullName,
        studentId: student.studentId,
        slotId: slot._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── CANCEL A SLOT ────────────────────────────────────────────────────────────
// POST /api/slots/cancel
// Body: { slotId }
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
        message: 'Slot not found or has already expired',
      });
    }

    // Check slot hasn't started yet
    const now = new Date();
    const currentHour = now.getHours();
    const today = getDateStr(now);

    if (slot.date === today && slot.startHour <= currentHour) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a slot that has already started or passed',
      });
    }

    // Check student actually booked this slot
    const bookingIndex = slot.bookedBy.findIndex(
      (b) => b.studentId.toString() === student._id.toString()
    );

    if (bookingIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You have not booked this slot',
      });
    }

    // Remove booking
    slot.bookedBy.splice(bookingIndex, 1);
    slot.booked = Math.max(slot.booked - 1, 0);
    await slot.save();

    return res.status(200).json({
      success: true,
      message: `Slot cancelled successfully`,
      cancelled: {
        date: slot.date,
        time: slot.time,
        studentName: student.fullName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET MY BOOKINGS ──────────────────────────────────────────────────────────
// GET /api/slots/mine
// Student sees their upcoming booked slots
const getMyBookings = async (req, res, next) => {
  try {
    await syncSlots();

    const student = req.user;
    const today = getDateStr(new Date());

    const mySlots = await Slot.find({
      date: { $gte: today },
      'bookedBy.studentId': student._id,
    }).sort({ date: 1, startHour: 1 });

    const result = mySlots.map((slot) => ({
      slotId: slot._id,
      date: slot.date,
      time: slot.time,
      startHour: slot.startHour,
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      bookings: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: GET ALL BOOKINGS FOR A DATE ───────────────────────────────────────
// GET /api/slots/admin?date=2025-01-15
// Admin sees all slots and who booked them on a given date
const getAdminSlotView = async (req, res, next) => {
  try {
    await syncSlots();

    const { date } = req.query;
    const targetDate = date || getDateStr(new Date());

    const slots = await Slot.find({ date: targetDate }).sort({ startHour: 1 });

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