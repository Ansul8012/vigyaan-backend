const express = require('express');
const router = express.Router();
const {
  getSlots,
  bookSlot,
  cancelSlot,
  getMyBookings,
  getAdminSlotView,
} = require('../controllers/slotController');
const { protect, adminOnly, studentOnly } = require('../middleware/auth');

// Student routes
router.get('/', protect, studentOnly, getSlots);
router.post('/book', protect, studentOnly, bookSlot);
router.post('/cancel', protect, studentOnly, cancelSlot);
router.get('/mine', protect, studentOnly, getMyBookings);

// Admin route
router.get('/admin', protect, adminOnly, getAdminSlotView);

module.exports = router;