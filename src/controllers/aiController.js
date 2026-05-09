const { GoogleGenerativeAI } = require('@google/generative-ai');
const Book = require('../models/Book');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── AI CHAT WITH BOOK RECOMMENDATIONS ───────────────────────────────────────
// POST /api/ai/chat
// Body: { message }
const aiChat = async (req, res, next) => {
  try {
    const { message } = req.body;
    const student = req.user;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Fetch all books from database
    const books = await Book.find({}).select(
      'title author category description shelf availableCopies totalCopies emoji'
    );

    if (books.length === 0) {
      return res.status(200).json({
        success: true,
        reply: "The library catalog is currently empty. Please check back later when books have been added.",
      });
    }

    // Build book catalog string for Gemini context
    const bookCatalog = books
      .map((book, index) => {
        const availability =
          book.availableCopies > 0
            ? `Available (${book.availableCopies} copies)`
            : 'Currently not available';

        return `${index + 1}. ${book.emoji} "${book.title}" by ${book.author}
   Category: ${book.category}
   Description: ${book.description || 'No description'}
   Shelf: ${book.shelf}
   Status: ${availability}`;
      })
      .join('\n\n');

    // Build the prompt
    const prompt = `You are Vigyaan, an intelligent AI library assistant for Graphic Era Deemed to be University. You help students find the best books from the library catalog.

LIBRARY CATALOG (these are the ONLY books available in this library):
${bookCatalog}

STUDENT QUERY: "${message.trim()}"
STUDENT NAME: ${student.fullName}

INSTRUCTIONS:
- Recommend books ONLY from the catalog above
- If a book is not available (0 copies), still mention it but note it is currently unavailable
- Be conversational, friendly and helpful
- Keep response concise and structured
- If the query is unrelated to books or library, politely redirect to library topics
- Format your response with book title, author, shelf location and why you recommend it
- If no books match the query, say so honestly and suggest the closest alternatives`;

    // Call Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return res.status(200).json({
      success: true,
      reply,
      studentName: student.fullName,
    });
  } catch (error) {
    // Handle Gemini API errors gracefully
    if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
      return res.status(500).json({
        success: false,
        message: 'AI service configuration error. Please contact admin.',
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return res.status(429).json({
        success: false,
        message: 'AI service is busy right now. Please try again in a moment.',
      });
    }

    next(error);
  }
};

module.exports = { aiChat };