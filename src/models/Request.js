const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['issue', 'return'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'fulfilled', 'cancelled'],
      default: 'pending',
    },
    // Student info (denormalized so Vigyaan kiosk can display without joins)
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentRollId: {
      type: String, // the student's college studentId like "STU2024001"
      required: true,
    },
    // Book info (denormalized)
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    bookTitle: String,
    bookAuthor: String,
    bookEmoji: String,
    bookShelf: String,
    bookIsbn: String,
    // Only for issue requests - set when fulfilled
    issuedMonths: {
      type: Number,
      min: 1,
      max: 6,
    },
    dueDate: Date,
    // Who processed this request
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    processedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Request', requestSchema);