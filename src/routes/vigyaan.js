const express = require('express');
const router = express.Router();
const {
  openVigyaan,
  getVigyaanStatus,
  closeVigyaan,
  verifyStudentQr,
  verifyBookQr,
  completeIssue,
  completeReturn,
} = require('../controllers/vigyaanController');
const { protect, adminOnly } = require('../middleware/auth');

// Status - any logged in user can check
router.get('/status', protect, getVigyaanStatus);

// Admin only operations
router.post('/open', protect, adminOnly, openVigyaan);
router.post('/close', protect, adminOnly, closeVigyaan);
router.post('/verify-student', protect, adminOnly, verifyStudentQr);
router.post('/verify-book', protect, adminOnly, verifyBookQr);
router.post('/issue', protect, adminOnly, completeIssue);
router.post('/return', protect, adminOnly, completeReturn);

module.exports = router;