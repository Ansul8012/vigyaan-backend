const Book = require('../models/Book');
const Request = require('../models/Request');

// ─── ADD BOOK (Admin only) ────────────────────────────────────────────────────
// POST /api/books
// Body: { title, author, category, isbn, shelf, emoji, description, totalCopies, qrId }
const addBook = async (req, res, next) => {
  try {
    const { title, author, category, isbn, shelf, emoji, description, totalCopies, qrId } = req.body;

    if (!title || !author || !category || !isbn || !shelf || !description || !totalCopies || !qrId) {
      return res.status(400).json({
        success: false,
        message: 'All fields including book QR ID are required',
      });
    }

    // Check duplicate ISBN
    const isbnExists = await Book.findOne({ isbn: isbn.trim() });
    if (isbnExists) {
      return res.status(409).json({
        success: false,
        message: 'A book with this ISBN already exists',
      });
    }

    // Check duplicate QR
    const qrExists = await Book.findOne({ qrId: qrId.trim() });
    if (qrExists) {
      return res.status(409).json({
        success: false,
        message: 'This QR ID is already linked to another book',
      });
    }

    if (Number(totalCopies) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Total copies must be at least 1',
      });
    }

    const book = await Book.create({
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      isbn: isbn.trim(),
      shelf: shelf.trim(),
      emoji: emoji || '📚',
      description: description.trim(),
      totalCopies: Number(totalCopies),
      availableCopies: Number(totalCopies),
      qrId: qrId.trim(),
      addedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Book added successfully',
      book,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET ALL BOOKS (Both student & admin) ─────────────────────────────────────
// GET /api/books
const getAllBooks = async (req, res, next) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });

    // For admin: return raw data with full detail
    // For student: same but frontend controls what actions to show
    return res.status(200).json({
      success: true,
      count: books.length,
      books,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE BOOK ─────────────────────────────────────────────────────────
// GET /api/books/:id
const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    return res.status(200).json({
      success: true,
      book,
    });
  } catch (error) {
    next(error);
  }
};

// ─── SEARCH BOOKS ─────────────────────────────────────────────────────────────
// GET /api/books/search?q=keyword
const searchBooks = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const regex = new RegExp(q.trim(), 'i');

    const books = await Book.find({
      $or: [
        { title: regex },
        { author: regex },
        { category: regex },
        { isbn: regex },
        { description: regex },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: books.length,
      books,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET BOOK BY QR ───────────────────────────────────────────────────────────
// GET /api/books/qr?qrId=text
// Used in Vigyaan kiosk to verify scanned book QR
const getBookByQr = async (req, res, next) => {
  try {
    const { qrId } = req.query;

    if (!qrId) {
      return res.status(400).json({
        success: false,
        message: 'QR ID is required',
      });
    }

    const book = await Book.findOne({ qrId: qrId.trim() });
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'No book found with this QR ID',
      });
    }

    return res.status(200).json({
      success: true,
      book,
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE BOOK (Admin only) ─────────────────────────────────────────────────
// PUT /api/books/:id
const updateBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    const { title, author, category, isbn, shelf, emoji, description, totalCopies } = req.body;

    // If ISBN is being changed, check it's not taken by another book
    if (isbn && isbn.trim() !== book.isbn) {
      const isbnExists = await Book.findOne({
        isbn: isbn.trim(),
        _id: { $ne: book._id },
      });
      if (isbnExists) {
        return res.status(409).json({
          success: false,
          message: 'Another book with this ISBN already exists',
        });
      }
    }

    // Recalculate availableCopies if totalCopies changed
    if (totalCopies !== undefined) {
      const issuedCount = book.totalCopies - book.availableCopies;
      const newTotal = Number(totalCopies);
      if (newTotal < issuedCount) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce total copies below currently issued count (${issuedCount})`,
        });
      }
      book.availableCopies = newTotal - issuedCount;
      book.totalCopies = newTotal;
    }

    // Update fields
    if (title) book.title = title.trim();
    if (author) book.author = author.trim();
    if (category) book.category = category.trim();
    if (isbn) book.isbn = isbn.trim();
    if (shelf) book.shelf = shelf.trim();
    if (emoji) book.emoji = emoji;
    if (description) book.description = description.trim();

    await book.save();

    return res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      book,
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE BOOK (Admin only) ─────────────────────────────────────────────────
// DELETE /api/books/:id
const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // Prevent delete if copies are currently issued
    const issuedCount = book.totalCopies - book.availableCopies;
    if (issuedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete book — ${issuedCount} copy/copies currently issued to students`,
      });
    }

    // Cancel any pending requests for this book
    await Request.updateMany(
      { bookId: book._id, status: 'pending' },
      { status: 'cancelled' }
    );

    await book.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Book deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addBook,
  getAllBooks,
  getBookById,
  searchBooks,
  getBookByQr,
  updateBook,
  deleteBook,
};