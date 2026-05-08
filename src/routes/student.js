const express = require('express');
const router = express.Router();
const {
  raiseIssueRequest,
  raiseReturnRequest,
  getMyRequests,
  getAllRequests,
  cancelRequest,
  fulfillRequest,
} = require('../controllers/requestController');
const { protect, adminOnly, studentOnly } = require('../middleware/auth');

// Student routes
router.post('/issue', protect, studentOnly, raiseIssueRequest);
router.post('/return', protect, studentOnly, raiseReturnRequest);
router.get('/mine', protect, studentOnly, getMyRequests);
router.delete('/:id', protect, studentOnly, cancelRequest);

// Admin routes
router.get('/', protect, adminOnly, getAllRequests);
router.post('/:id/fulfill', protect, adminOnly, fulfillRequest);

module.exports = router;