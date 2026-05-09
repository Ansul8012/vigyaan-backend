require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Vigyaan API is running',
    timestamp: new Date().toISOString()
  });
});


// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/books', require('./src/routes/books'));
app.use('/api/requests', require('./src/routes/requests'));
app.use('/api/student', require('./src/routes/student'));
app.use('/api/vigyaan', require('./src/routes/vigyaan'));
app.use('/api/slots', require('./src/routes/slots'));
app.use('/api/admin/students', require('./src/routes/adminStudents'));
app.use('/api/ai', require('./src/routes/ai'));

// Error handlers (always last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});