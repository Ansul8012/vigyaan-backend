const Request = require('../models/Request');
const Book = require('../models/Book');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const VigyaanSession = require('../models/VigyaanSession');

// ─── OPEN VIGYAAN ─────────────────────────────────────────────────────────────
// POST /api/vigyaan/open
// Admin opens the kiosk session
const openVigyaan = async (req, res, next) => {
  try {
    // Check if already open
    let session = await VigyaanSession.findOne({ isOpen: true });
    if (session) {
      return res.status(200).json({
        success: true,
        message: 'Vigyaan is already open',
        session,
      });
    }

    // Create new session
    session = await VigyaanSession.create({
      isOpen: true,
      openedBy: req.user._id,
      openedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: 'Vigyaan Digital Library is now open',
      session,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET VIGYAAN STATUS ───────────────────────────────────────────────────────
// GET /api/vigyaan/status
const getVigyaanStatus = async (req, res, next) => {
  try {
    const session = await VigyaanSession.findOne({ isOpen: true });

    return res.status(200).json({
      success: true,
      isOpen: !!session,
      session: session || null,
    });
  } catch (error) {
    next(error);
  }
};

// ─── CLOSE VIGYAAN ────────────────────────────────────────────────────────────
// POST /api/vigyaan/close
// Admin scans their QR to close the kiosk
// Body: { qrId }
const closeVigyaan = async (req, res, next) => {
  try {
    const { qrId } = req.body;

    if (!qrId) {
      return res.status(400).json({
        success: false,
        message: 'Admin QR ID is required to close Vigyaan',
      });
    }

    // Verify the closing admin QR matches their stored QR
    const admin = await Admin.findById(req.user._id);
    if (admin.qrId !== qrId.trim()) {
      return res.status(401).json({
        success: false,
        message: 'QR ID does not match. Only the authenticated admin can close Vigyaan.',
      });
    }

    // Find open session
    const session = await VigyaanSession.findOne({ isOpen: true });
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Vigyaan is not currently open',
      });
    }

    session.isOpen = false;
    session.closedAt = new Date();
    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Vigyaan Digital Library closed successfully',
      session,
    });
  } catch (error) {
    next(error);
  }
};

// ─── STEP 1: VERIFY STUDENT QR ────────────────────────────────────────────────
// POST /api/vigyaan/verify-student
// Body: { qrId, requestId }
// Checks:
//   1. Vigyaan is open
//   2. Request exists and is pending
//   3. Scanned QR belongs to the student who raised this request
const verifyStudentQr = async (req, res, next) => {
  try {
    const { qrId, requestId } = req.body;

    if (!qrId || !requestId) {
      return res.status(400).json({
        success: false,
        message: 'QR ID and Request ID are required',
      });
    }

    // Check Vigyaan is open
    const session = await VigyaanSession.findOne({ isOpen: true });
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Vigyaan is not open. Please open the kiosk first.',
      });
    }

    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request is already ${request.status}`,
      });
    }

    // Find the student who raised this request
    const student = await Student.findById(request.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // THE CORE CHECK: scanned QR must match the request owner's QR
    if (student.qrId !== qrId.trim()) {
      return res.status(401).json({
        success: false,
        message: 'QR ID does not match the student who raised this request. Wrong person or wrong ID card.',
      });
    }

    // Check student account is active
    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This student account has been deactivated',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Student verified successfully. Hello ${student.fullName}!`,
      student: {
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        course: student.course,
      },
      request: {
        id: request._id,
        type: request.type,
        bookTitle: request.bookTitle,
        bookShelf: request.bookShelf,
        bookIsbn: request.bookIsbn,
        bookEmoji: request.bookEmoji,
      },
      // Tell frontend where to guide the student
      nextStep: request.type === 'issue'
        ? `Guide student to shelf: ${request.bookShelf} to collect the book`
        : `Student needs to bring the book from shelf: ${request.bookShelf}`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── STEP 2: VERIFY BOOK QR ───────────────────────────────────────────────────
// POST /api/vigyaan/verify-book
// Body: { qrId, requestId }
// After student goes to shelf and scans book QR
// Checks:
//   1. Vigyaan is open
//   2. Request exists and is pending
//   3. Scanned book QR matches the book in the request
const verifyBookQr = async (req, res, next) => {
  try {
    const { qrId, requestId } = req.body;

    if (!qrId || !requestId) {
      return res.status(400).json({
        success: false,
        message: 'Book QR ID and Request ID are required',
      });
    }

    // Check Vigyaan is open
    const session = await VigyaanSession.findOne({ isOpen: true });
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Vigyaan is not open',
      });
    }

    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request is already ${request.status}`,
      });
    }

    // Find the book linked to this request
    const book = await Book.findById(request.bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // THE CORE CHECK: scanned book QR must match the requested book's QR
    if (book.qrId !== qrId.trim()) {
      return res.status(401).json({
        success: false,
        message: `Wrong book scanned. Expected: "${request.bookTitle}". Please scan the correct book.`,
      });
    }

    // For issue: check availability again
    if (request.type === 'issue' && book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No copies available for this book anymore',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Book verified: "${book.title}"`,
      book: {
        id: book._id,
        title: book.title,
        author: book.author,
        shelf: book.shelf,
        isbn: book.isbn,
        emoji: book.emoji,
        availableCopies: book.availableCopies,
      },
      request: {
        id: request._id,
        type: request.type,
        studentName: request.studentName,
        studentRollId: request.studentRollId,
      },
      nextStep: request.type === 'issue'
        ? 'Book verified. Ask student how many months they need.'
        : `Book verified. Ask student to place the book back at shelf: ${book.shelf}`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── STEP 3A: COMPLETE ISSUE ──────────────────────────────────────────────────
// POST /api/vigyaan/issue
// Body: { requestId, months }
// Called after both QRs verified and admin confirms months
const completeIssue = async (req, res, next) => {
  try {
    const { requestId, months } = req.body;

    if (!requestId || !months) {
      return res.status(400).json({
        success: false,
        message: 'Request ID and months are required',
      });
    }

    if (months < 1 || months > 6) {
      return res.status(400).json({
        success: false,
        message: 'Months must be between 1 and 6',
      });
    }

    // Check Vigyaan is open
    const session = await VigyaanSession.findOne({ isOpen: true });
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Vigyaan is not open',
      });
    }

    const request = await Request.findById(requestId);
    if (!request || request.type !== 'issue') {
      return res.status(404).json({
        success: false,
        message: 'Issue request not found',
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`,
      });
    }

    const book = await Book.findById(request.bookId);
    if (!book || book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Book not available',
      });
    }

    const student = await Student.findById(request.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + Number(months));

    // Decrease book available copies
    book.availableCopies -= 1;
    await book.save();

    // Add to student issued books record
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

    // Mark request as fulfilled
    request.status = 'fulfilled';
    request.issuedMonths = Number(months);
    request.dueDate = dueDate;
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    await request.save();

    return res.status(200).json({
      success: true,
      message: `Book "${book.title}" issued to ${student.fullName} for ${months} month(s)`,
      dueDate,
      request,
      summary: {
        studentName: student.fullName,
        studentId: student.studentId,
        bookTitle: book.title,
        bookShelf: book.shelf,
        issuedFor: `${months} month(s)`,
        returnBy: dueDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── STEP 3B: COMPLETE RETURN ─────────────────────────────────────────────────
// POST /api/vigyaan/return
// Body: { requestId }
// Called after both QRs verified for return
const completeReturn = async (req, res, next) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required',
      });
    }

    // Check Vigyaan is open
    const session = await VigyaanSession.findOne({ isOpen: true });
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Vigyaan is not open',
      });
    }

    const request = await Request.findById(requestId);
    if (!request || request.type !== 'return') {
      return res.status(404).json({
        success: false,
        message: 'Return request not found',
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

    // Find the issued entry in student record
    const issuedIndex = student.issuedBooks.findIndex(
      (b) =>
        b.bookId.toString() === book._id.toString() &&
        (b.status === 'issued' || b.status === 'overdue')
    );

    if (issuedIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'No active issued record found for this student and book',
      });
    }

    // Mark as returned in student record
    student.issuedBooks[issuedIndex].status = 'returned';
    await student.save();

    // Increase book available copies
    book.availableCopies = Math.min(book.availableCopies + 1, book.totalCopies);
    await book.save();

    // Mark request fulfilled
    request.status = 'fulfilled';
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    await request.save();

    return res.status(200).json({
      success: true,
      message: `Book "${book.title}" returned successfully by ${student.fullName}`,
      summary: {
        studentName: student.fullName,
        studentId: student.studentId,
        bookTitle: book.title,
        bookShelf: book.shelf,
        returnedAt: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        instruction: `Place the book back at shelf: ${book.shelf}`,
      },
      request,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  openVigyaan,
  getVigyaanStatus,
  closeVigyaan,
  verifyStudentQr,
  verifyBookQr,
  completeIssue,
  completeReturn,
};