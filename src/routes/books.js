const express = require('express');
const router = express.Router();
const {
  addBook,
  getAllBooks,
  getBookById,
  searchBooks,
  getBookByQr,
  updateBook,
  deleteBook,
} = require('../controllers/bookController');
const { protect, adminOnly } = require('../middleware/auth');

// Public-facing to logged in users (both student & admin)
router.get('/', protect, getAllBooks);
router.get('/search', protect, searchBooks);
router.get('/qr', protect, getBookByQr);
router.get('/:id', protect, getBookById);

// Admin only
router.post('/', protect, adminOnly, addBook);
router.put('/:id', protect, adminOnly, updateBook);
router.delete('/:id', protect, adminOnly, deleteBook);

module.exports = router;