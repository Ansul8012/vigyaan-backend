const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    time: {
      type: String, // "9:00 AM - 10:00 AM"
      required: true,
    },
    startHour: {
      type: Number, // 9, 10, 11 ... 19 (24h) for sorting & comparison
      required: true,
    },
    total: {
      type: Number,
      default: 30, // max students per slot
    },
    booked: {
      type: Number,
      default: 0,
    },
    // Students who booked this slot
    bookedBy: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
        },
        studentName: String,
        bookedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Compound unique index: one slot per date per hour
slotSchema.index({ date: 1, startHour: 1 }, { unique: true });

module.exports = mongoose.model('Slot', slotSchema);