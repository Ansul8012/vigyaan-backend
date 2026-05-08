const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
    },
    shelf: {
      type: String,
      required: [true, 'Shelf location is required'],
      trim: true,
    },
    emoji: {
      type: String,
      default: '📚',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [10, 'Description must be at least 10 characters'],
    },
    totalCopies: {
      type: Number,
      required: [true, 'Total copies is required'],
      min: [1, 'At least 1 copy required'],
    },
    availableCopies: {
      type: Number,
      min: 0,
    },
    // QR text decoded by scanner when admin adds book
    qrId: {
      type: String,
      required: [true, 'Book QR ID is required'],
      unique: true,
      trim: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

// Auto-set availableCopies = totalCopies on create
bookSchema.pre('save', function () {
  if (this.isNew && this.availableCopies === undefined) {
    this.availableCopies = this.totalCopies;
  }
});

// Virtual: is book available?
bookSchema.virtual('available').get(function () {
  return this.availableCopies > 0;
});

bookSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Book', bookSchema);