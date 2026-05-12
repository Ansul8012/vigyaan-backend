const Request = require('../models/Request');
const Book = require('../models/Book');
const Student = require('../models/Student');

// ─── RAISE ISSUE REQUEST (Student only) ──────────────────────────────────────
// POST /api/requests/issue
const raiseIssueRequest = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const student = req.user;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Book ID is required',
      });
    }

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No copies available for this book currently',
      });
    }

    const existingPendingRequest = await Request.findOne({
      studentId: student._id,
      bookId: book._id,
      type: 'issue',
      status: 'pending',
    });

    if (existingPendingRequest) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending issue request for this book',
      });
    }

    const alreadyIssued = student.issuedBooks.find(
      (b) =>
        b.bookId &&
        b.bookId.toString() === book._id.toString() &&
        (b.status === 'issued' || b.status === 'overdue')
    );

    if (alreadyIssued) {
      return res.status(409).json({
        success: false,
        message: 'You already have this book issued',
      });
    }

    const currentlyIssued = student.issuedBooks.filter(
      (b) =>
        b.bookId &&
        (b.status === 'issued' || b.status === 'overdue')
    );

    if (currentlyIssued.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'You can have maximum 3 books issued at a time',
      });
    }

    const request = await Request.create({
      type: 'issue',
      status: 'pending',
      studentId: student._id,
      studentName: student.fullName,
      studentRollId: student.studentId,
      bookId: book._id,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookEmoji: book.emoji,
      bookShelf: book.shelf,
      bookIsbn: book.isbn,
    });

    return res.status(201).json({
      success: true,
      message:
        'Issue request raised successfully. Visit the library to collect your book.',
      request,
    });
  } catch (error) {
    next(error);
  }
};

// ─── RAISE RETURN REQUEST (Student only) ─────────────────────────────────────
// POST /api/requests/return
const raiseReturnRequest = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const student = req.user;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Book ID is required',
      });
    }

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    const issuedEntry = student.issuedBooks.find(
      (b) =>
        b.bookId &&
        b.bookId.toString() === book._id.toString() &&
        (b.status === 'issued' || b.status === 'overdue')
    );

    if (!issuedEntry) {
      return res.status(400).json({
        success: false,
        message: 'You do not have this book issued',
      });
    }

    const existingReturn = await Request.findOne({
      studentId: student._id,
      bookId: book._id,
      type: 'return',
      status: 'pending',
    });

    if (existingReturn) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending return request for this book',
      });
    }

    const request = await Request.create({
      type: 'return',
      status: 'pending',
      studentId: student._id,
      studentName: student.fullName,
      studentRollId: student.studentId,
      bookId: book._id,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookEmoji: book.emoji,
      bookShelf: book.shelf,
      bookIsbn: book.isbn,
    });

    return res.status(201).json({
      success: true,
      message:
        'Return request raised. Visit the library to return your book.',
      request,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET MY REQUESTS ──────────────────────────────────────────────────────────
const getMyRequests = async (req, res, next) => {
  try {
    const requests = await Request.find({
      studentId: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET ALL REQUESTS ─────────────────────────────────────────────────────────
const getAllRequests = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const requests = await Request.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// ─── CANCEL REQUEST ───────────────────────────────────────────────────────────
const cancelRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    if (
      request.studentId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own requests',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a request that is already ${request.status}`,
      });
    }

    request.status = 'cancelled';

    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Request cancelled successfully',
      request,
    });
  } catch (error) {
    next(error);
  }
};

// ─── FULFILL REQUEST ──────────────────────────────────────────────────────────
const fulfillRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`,
      });
    }

    const book = await Book.findById(request.bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    const student = await Student.findById(request.studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // ── ISSUE ─────────────────────────────────────────────
    if (request.type === 'issue') {
      const { months } = req.body;

      if (!months || months < 1 || months > 6) {
        return res.status(400).json({
          success: false,
          message: 'Months must be between 1 and 6',
        });
      }

      if (book.availableCopies <= 0) {
        return res.status(400).json({
          success: false,
          message: 'No copies available anymore',
        });
      }

      const dueDate = new Date();

      dueDate.setMonth(
        dueDate.getMonth() + Number(months)
      );

      book.availableCopies -= 1;

      await book.save();

      student.issuedBooks.push({
        bookId: book._id,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookEmoji: book.emoji,
        bookShelf: book.shelf,
        bookIsbn: book.isbn,
        issuedAt: new Date(),
        dueDate,
        status: 'issued',
      });

      await student.save();

      request.status = 'fulfilled';
      request.issuedMonths = Number(months);
      request.dueDate = dueDate;
      request.processedBy = req.user._id;
      request.processedAt = new Date();

      await request.save();

      return res.status(200).json({
        success: true,
        message: 'Book issued successfully',
        request,
        dueDate,
      });
    }

    // ── RETURN ────────────────────────────────────────────
    if (request.type === 'return') {
      const issuedIndex = student.issuedBooks.findIndex(
        (b) =>
          b.bookId &&
          b.bookId.toString() === book._id.toString() &&
          (b.status === 'issued' || b.status === 'overdue')
      );

      if (issuedIndex === -1) {
        return res.status(400).json({
          success: false,
          message:
            'No issued record found for this student and book',
        });
      }

      student.issuedBooks[issuedIndex].status =
        'returned';

      await student.save();

      book.availableCopies += 1;

      await book.save();

      request.status = 'fulfilled';
      request.processedBy = req.user._id;
      request.processedAt = new Date();

      await request.save();

      return res.status(200).json({
        success: true,
        message: 'Book returned successfully',
        request,
      });
    }
  } catch (error) {
    next(error);
  }
};

// ─── GET MY ISSUED BOOKS ──────────────────────────────────────────────────────
const getMyIssuedBooks = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user._id);

    const now = new Date();

    let updated = false;

    student.issuedBooks.forEach((book) => {
      if (
        book.status === 'issued' &&
        book.dueDate &&
        new Date(book.dueDate) < now
      ) {
        book.status = 'overdue';
        updated = true;
      }
    });

    if (updated) {
      await student.save();
    }

    const activeBooks = student.issuedBooks.filter(
      (b) =>
        b.bookId &&
        (b.status === 'issued' || b.status === 'overdue')
    );

    return res.status(200).json({
      success: true,
      count: activeBooks.length,
      books: activeBooks,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  raiseIssueRequest,
  raiseReturnRequest,
  getMyRequests,
  getAllRequests,
  cancelRequest,
  fulfillRequest,
  getMyIssuedBooks,
};