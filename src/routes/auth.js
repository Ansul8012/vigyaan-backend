const express = require('express');
const router = express.Router();
const {
  studentSignup,
  studentLogin,
  adminSignup,
  adminLogin,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Student
router.post('/student/signup', studentSignup);
router.post('/student/login', studentLogin);

// Admin
router.post('/admin/signup', adminSignup);
router.post('/admin/login', adminLogin);

// Protected - get current user
router.get('/me', protect, getMe);

module.exports = router;