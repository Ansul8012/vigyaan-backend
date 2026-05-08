const Student = require('../models/Student');
const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');

// ─── STUDENT SIGNUP ───────────────────────────────────────────────────────────
// POST /api/auth/student/signup
// Body: { studentId, fullName, email, course, completionYear, qrId }
const studentSignup = async (req, res, next) => {
  try {
    const { studentId, fullName, email, course, completionYear, qrId } = req.body;

    // Validate required fields
    if (!studentId || !fullName || !email || !course || !completionYear || !qrId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: studentId, fullName, email, course, completionYear, qrId',
      });
    }

    // Check duplicate email in students
    const emailExistsStudent = await Student.findOne({ email: email.toLowerCase() });
    if (emailExistsStudent) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered as a student',
      });
    }

    // Check duplicate email in admins
    const emailExistsAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (emailExistsAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered as an admin',
      });
    }

    // Check duplicate studentId
    const studentIdExists = await Student.findOne({
      studentId: studentId.toUpperCase(),
    });
    if (studentIdExists) {
      return res.status(409).json({
        success: false,
        message: 'Student ID already registered',
      });
    }

    // Check duplicate qrId across both collections
    const qrExistsStudent = await Student.findOne({ qrId: qrId.trim() });
    const qrExistsAdmin = await Admin.findOne({ qrId: qrId.trim() });
    if (qrExistsStudent || qrExistsAdmin) {
      return res.status(409).json({
        success: false,
        message: 'This QR ID is already registered',
      });
    }

    // Create student
    const student = await Student.create({
      studentId: studentId.toUpperCase(),
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      course: course.trim(),
      completionYear,
      qrId: qrId.trim(),
    });

    const token = generateToken(student._id, 'student');

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      token,
      user: {
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email,
        course: student.course,
        completionYear: student.completionYear,
        role: 'student',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── STUDENT LOGIN — QR ONLY ──────────────────────────────────────────────────
// POST /api/auth/student/login
// Body: { qrId }
// Student just scans their ID card QR — that's it
const studentLogin = async (req, res, next) => {
  try {
    const { qrId } = req.body;

    if (!qrId) {
      return res.status(400).json({
        success: false,
        message: 'QR ID is required. Please scan your student ID card.',
      });
    }

    // Find student by QR ID
    const student = await Student.findOne({ qrId: qrId.trim() });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid QR ID. No student account found for this QR code.',
      });
    }

    // Check account is active
    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the library admin.',
      });
    }

    // Safety: make sure this QR doesn't somehow belong to an admin
    const adminWithSameQr = await Admin.findOne({ qrId: qrId.trim() });
    if (adminWithSameQr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid QR ID for student login.',
      });
    }

    const token = generateToken(student._id, 'student');

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${student.fullName}!`,
      token,
      user: {
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email,
        course: student.course,
        completionYear: student.completionYear,
        role: 'student',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN SIGNUP ─────────────────────────────────────────────────────────────
// POST /api/auth/admin/signup
// Body: { staffId, fullName, email, department, qrId }
const adminSignup = async (req, res, next) => {
  try {
    const { staffId, fullName, email, department, qrId } = req.body;

    if (!staffId || !fullName || !email || !department || !qrId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: staffId, fullName, email, department, qrId',
      });
    }

    // Check duplicate email
    const emailExistsAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (emailExistsAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered as an admin',
      });
    }

    const emailExistsStudent = await Student.findOne({ email: email.toLowerCase() });
    if (emailExistsStudent) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered as a student',
      });
    }

    // Check duplicate staffId
    const staffIdExists = await Admin.findOne({
      staffId: staffId.toUpperCase(),
    });
    if (staffIdExists) {
      return res.status(409).json({
        success: false,
        message: 'Staff ID already registered',
      });
    }

    // Check duplicate qrId across both collections
    const qrExistsAdmin = await Admin.findOne({ qrId: qrId.trim() });
    const qrExistsStudent = await Student.findOne({ qrId: qrId.trim() });
    if (qrExistsAdmin || qrExistsStudent) {
      return res.status(409).json({
        success: false,
        message: 'This QR ID is already registered',
      });
    }

    const admin = await Admin.create({
      staffId: staffId.toUpperCase(),
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      department: department.trim(),
      qrId: qrId.trim(),
    });

    const token = generateToken(admin._id, 'admin');

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      token,
      user: {
        id: admin._id,
        staffId: admin.staffId,
        fullName: admin.fullName,
        email: admin.email,
        department: admin.department,
        role: 'admin',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN LOGIN — QR ONLY ────────────────────────────────────────────────────
// POST /api/auth/admin/login
// Body: { qrId }
// Admin just scans their staff ID card QR
const adminLogin = async (req, res, next) => {
  try {
    const { qrId } = req.body;

    if (!qrId) {
      return res.status(400).json({
        success: false,
        message: 'QR ID is required. Please scan your admin ID card.',
      });
    }

    // Find admin by QR ID
    const admin = await Admin.findOne({ qrId: qrId.trim() });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid QR ID. No admin account found for this QR code.',
      });
    }

    // Check account is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your admin account has been deactivated.',
      });
    }

    // Safety: make sure this QR doesn't somehow belong to a student
    const studentWithSameQr = await Student.findOne({ qrId: qrId.trim() });
    if (studentWithSameQr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid QR ID for admin login.',
      });
    }

    const token = generateToken(admin._id, 'admin');

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${admin.fullName}!`,
      token,
      user: {
        id: admin._id,
        staffId: admin.staffId,
        fullName: admin.fullName,
        email: admin.email,
        department: admin.department,
        role: 'admin',
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────
// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'student') {
      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          studentId: user.studentId,
          fullName: user.fullName,
          email: user.email,
          course: user.course,
          completionYear: user.completionYear,
          role: 'student',
          isActive: user.isActive,
        },
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        staffId: user.staffId,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        role: 'admin',
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  studentSignup,
  studentLogin,
  adminSignup,
  adminLogin,
  getMe,
};