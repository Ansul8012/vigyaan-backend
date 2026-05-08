const Student = require('../models/Student');
const Request = require('../models/Request');
const Slot = require('../models/Slot');

// ─── GET ALL STUDENTS ─────────────────────────────────────────────────────────
// GET /api/admin/students
const getAllStudents = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const filter = {};

    // Filter by active/inactive
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    // Search by name, email, studentId
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await Student.find(filter)
      .select('-qrId') // don't expose QR in list
      .sort({ createdAt: -1 });

    // Enrich with issued + overdue count
    const enriched = students.map((s) => {
      const issued = s.issuedBooks.filter(
        (b) => b.status === 'issued' || b.status === 'overdue'
      ).length;
      const overdue = s.issuedBooks.filter(
        (b) => b.status === 'overdue'
      ).length;

      return {
        _id: s._id,
        studentId: s.studentId,
        fullName: s.fullName,
        email: s.email,
        course: s.course,
        completionYear: s.completionYear,
        isActive: s.isActive,
        issuedBooksCount: issued,
        overdueCount: overdue,
        createdAt: s.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      students: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE STUDENT DETAILS ───────────────────────────────────────────────
// GET /api/admin/students/:id
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id).select('-qrId');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check and update overdue status
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
    if (updated) await student.save();

    // Get pending requests for this student
    const pendingRequests = await Request.find({
      studentId: student._id,
      status: 'pending',
    });

    return res.status(200).json({
      success: true,
      student: {
        _id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email,
        course: student.course,
        completionYear: student.completionYear,
        isActive: student.isActive,
        issuedBooks: student.issuedBooks,
        createdAt: student.createdAt,
      },
      pendingRequests,
    });
  } catch (error) {
    next(error);
  }
};

// ─── DEACTIVATE STUDENT ───────────────────────────────────────────────────────
// PUT /api/admin/students/:id/deactivate
const deactivateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (!student.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Student account is already deactivated',
      });
    }

    // Check if student has books currently issued
    const hasIssuedBooks = student.issuedBooks.some(
      (b) => b.status === 'issued' || b.status === 'overdue'
    );

    if (hasIssuedBooks) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot deactivate. Student has books currently issued. Ensure all books are returned first.',
        issuedBooks: student.issuedBooks.filter(
          (b) => b.status === 'issued' || b.status === 'overdue'
        ),
      });
    }

    student.isActive = false;
    await student.save();

    // Cancel all pending requests for this student
    await Request.updateMany(
      { studentId: student._id, status: 'pending' },
      { status: 'cancelled' }
    );

    return res.status(200).json({
      success: true,
      message: `Student account for ${student.fullName} has been deactivated`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── REACTIVATE STUDENT ───────────────────────────────────────────────────────
// PUT /api/admin/students/:id/reactivate
const reactivateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (student.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Student account is already active',
      });
    }

    student.isActive = true;
    await student.save();

    return res.status(200).json({
      success: true,
      message: `Student account for ${student.fullName} has been reactivated`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE STUDENT ACCOUNT ───────────────────────────────────────────────────
// DELETE /api/admin/students/:id
// Only deactivated students can be deleted
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Safety check — only deactivated accounts can be deleted
    if (student.isActive) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete an active student account. Deactivate the account first before deleting.',
      });
    }

    // Safety check — no books currently issued
    const hasIssuedBooks = student.issuedBooks.some(
      (b) => b.status === 'issued' || b.status === 'overdue'
    );
    if (hasIssuedBooks) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete. Student still has books issued.',
      });
    }

    const studentName = student.fullName;
    const studentDbId = student._id;

    // Delete student
    await Student.findByIdAndDelete(studentDbId);

    // Cancel + clean up their requests
    await Request.deleteMany({ studentId: studentDbId });

    // Remove from any future slot bookings
    const today = new Date().toISOString().split('T')[0];
    const futureSlots = await Slot.find({
      date: { $gte: today },
      'bookedBy.studentId': studentDbId,
    });

    for (const slot of futureSlots) {
      const index = slot.bookedBy.findIndex(
        (b) => b.studentId.toString() === studentDbId.toString()
      );
      if (index !== -1) {
        slot.bookedBy.splice(index, 1);
        slot.booked = Math.max(slot.booked - 1, 0);
        await slot.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Student account for "${studentName}" has been permanently deleted along with all their data.`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET ALL OVERDUE STUDENTS ─────────────────────────────────────────────────
// GET /api/admin/students/overdue
const getOverdueStudents = async (req, res, next) => {
  try {
    const now = new Date();

    // Update overdue statuses across all students
    const allStudents = await Student.find({
      'issuedBooks.status': 'issued',
    });

    for (const student of allStudents) {
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
      if (updated) await student.save();
    }

    // Find students with overdue books
    const overdueStudents = await Student.find({
      'issuedBooks.status': 'overdue',
    }).select('-qrId');

    const result = overdueStudents.map((s) => {
      const overdueBooks = s.issuedBooks.filter((b) => b.status === 'overdue');

      return {
        _id: s._id,
        studentId: s.studentId,
        fullName: s.fullName,
        email: s.email,
        course: s.course,
        isActive: s.isActive,
        overdueBooks: overdueBooks.map((b) => ({
          bookId: b.bookId,
          bookTitle: b.bookTitle,
          bookAuthor: b.bookAuthor,
          bookShelf: b.bookShelf,
          issuedAt: b.issuedAt,
          dueDate: b.dueDate,
          daysOverdue: Math.floor(
            (now - new Date(b.dueDate)) / (1000 * 60 * 60 * 24)
          ),
        })),
      };
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      overdueStudents: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  deactivateStudent,
  reactivateStudent,
  deleteStudent,
  getOverdueStudents,
};