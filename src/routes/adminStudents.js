const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudentById,
  deactivateStudent,
  reactivateStudent,
  deleteStudent,
  getOverdueStudents,
} = require('../controllers/studentController');
const { protect, adminOnly } = require('../middleware/auth');

// All routes are admin only
router.use(protect, adminOnly);

router.get('/', getAllStudents);
router.get('/overdue', getOverdueStudents);
router.get('/:id', getStudentById);
router.put('/:id/deactivate', deactivateStudent);
router.put('/:id/reactivate', reactivateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;