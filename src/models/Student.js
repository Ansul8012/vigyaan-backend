const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    course: {
      type: String,
      required: [true, 'Course is required'],
      trim: true,
    },
    completionYear: {
      type: String,
      required: [true, 'Completion year is required'],
      match: [/^20\d{2}$/, 'Enter a valid year like 2026'],
    },
    qrId: {
      type: String,
      required: [true, 'QR ID is required'],
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      default: 'student',
      immutable: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    issuedBooks: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
        bookTitle: String,
        bookAuthor: String,
        bookEmoji: String,
        bookShelf: String,
        bookIsbn: String,
        issuedAt: { type: Date, default: Date.now },
        dueDate: Date,
        status: {
          type: String,
          enum: ['issued', 'overdue', 'returned'],
          default: 'issued',
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);