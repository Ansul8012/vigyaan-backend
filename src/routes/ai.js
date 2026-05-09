const express = require('express');
const router = express.Router();
const { aiChat } = require('../controllers/aiController');
const { protect, studentOnly } = require('../middleware/auth');

router.post('/chat', protect, studentOnly, aiChat);

module.exports = router;