# Vigyaan Backend — API Reference & Frontend Integration Guide

**Base URL:** `http://localhost:5002`  
**Auth:** Bearer token in `Authorization` header → `Authorization: Bearer <token>`  
**Content-Type:** `application/json`

---

## Quick Start

1. All protected routes require a valid JWT token.
2. After login/signup, store the `token` from the response and send it with every protected request.
3. Role-based access: some routes are `student only`, some `admin only`, some `both`.

---

## 1. Auth Routes — `/api/auth`

### POST `/api/auth/student/signup`
Register a new student.

**Body:**
```json
{
  "studentId": "STU2024001",
  "fullName": "Arjun Sharma",
  "email": "arjun@geu.ac.in",
  "course": "B.Tech CSE",
  "completionYear": "2026",
  "qrId": "QR_UNIQUE_STRING_FROM_ID_CARD"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "studentId": "STU2024001",
    "fullName": "Arjun Sharma",
    "email": "arjun@geu.ac.in",
    "course": "B.Tech CSE",
    "completionYear": "2026",
    "role": "student"
  }
}
```

---

### POST `/api/auth/student/login`
Login with QR scan (no password).

**Body:**
```json
{
  "qrId": "QR_UNIQUE_STRING_FROM_ID_CARD"
}
```

**Response:** Same shape as signup (token + user).

---

### POST `/api/auth/admin/signup`
Register a new admin/staff.

**Body:**
```json
{
  "staffId": "ADM2024001",
  "fullName": "Dr. Priya Verma",
  "email": "priya@geu.ac.in",
  "department": "Library Sciences",
  "qrId": "QR_UNIQUE_STRING_FROM_STAFF_CARD"
}
```

---

### POST `/api/auth/admin/login`
Admin login with QR scan.

**Body:**
```json
{
  "qrId": "QR_UNIQUE_STRING_FROM_STAFF_CARD"
}
```

---

### GET `/api/auth/me` 🔒 *Protected*
Get currently logged-in user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response (student):**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "studentId": "STU2024001",
    "fullName": "Arjun Sharma",
    "role": "student",
    "isActive": true
  }
}
```

---

## 2. Book Routes — `/api/books`

### GET `/api/books` 🔒 *Student + Admin*
Get all books in the catalog.

**Response:**
```json
{
  "success": true,
  "count": 12,
  "books": [
    {
      "_id": "...",
      "title": "Deep Learning",
      "author": "Ian Goodfellow",
      "category": "AI/ML",
      "isbn": "978-0262035613",
      "shelf": "B-12",
      "emoji": "🧠",
      "description": "...",
      "totalCopies": 5,
      "availableCopies": 3,
      "available": true,
      "qrId": "BOOK_QR_STRING"
    }
  ]
}
```

---

### GET `/api/books/search?q=keyword` 🔒 *Student + Admin*
Search books by title, author, category, ISBN, or description.

**Query Params:** `q=machine learning`

---

### GET `/api/books/qr?qrId=TEXT` 🔒 *Student + Admin*
Find a book by its QR ID (used by Vigyaan kiosk).

**Query Params:** `qrId=BOOK_QR_STRING`

---

### GET `/api/books/:id` 🔒 *Student + Admin*
Get a single book by MongoDB `_id`.

---

### POST `/api/books` 🔒 *Admin only*
Add a new book to the catalog.

**Body:**
```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "category": "Software Engineering",
  "isbn": "978-0132350884",
  "shelf": "A-05",
  "emoji": "💻",
  "description": "A handbook of agile software craftsmanship.",
  "totalCopies": 4,
  "qrId": "BOOK_QR_STRING_FROM_SCAN"
}
```

---

### PUT `/api/books/:id` 🔒 *Admin only*
Update book details. Send only the fields you want to update.

**Body (partial update ok):**
```json
{
  "shelf": "A-06",
  "totalCopies": 6
}
```

---

### DELETE `/api/books/:id` 🔒 *Admin only*
Delete a book. Will fail if any copies are currently issued.

---

## 3. Request Routes — `/api/requests`

### POST `/api/requests/issue` 🔒 *Student only*
Student raises a request to issue a book.

**Body:**
```json
{
  "bookId": "MONGO_BOOK_ID"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Issue request raised successfully.",
  "request": {
    "_id": "...",
    "type": "issue",
    "status": "pending",
    "studentName": "Arjun Sharma",
    "bookTitle": "Deep Learning",
    "bookShelf": "B-12"
  }
}
```

---

### POST `/api/requests/return` 🔒 *Student only*
Student raises a return request for a book they have.

**Body:**
```json
{
  "bookId": "MONGO_BOOK_ID"
}
```

---

### GET `/api/requests/mine` 🔒 *Student only*
Get all requests for the currently logged-in student.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "requests": [
    {
      "_id": "...",
      "type": "issue",
      "status": "pending",
      "bookTitle": "Deep Learning",
      "createdAt": "..."
    }
  ]
}
```

---

### DELETE `/api/requests/:id` 🔒 *Student only*
Cancel a pending request. Only works on `pending` requests.

---

### GET `/api/requests` 🔒 *Admin only*
Get all requests. Optional query filters:

| Param | Values | Example |
|-------|--------|---------|
| `status` | `pending`, `fulfilled`, `cancelled` | `?status=pending` |
| `type` | `issue`, `return` | `?type=issue` |

**Example:** `GET /api/requests?status=pending&type=issue`

---

### POST `/api/requests/:id/fulfill` 🔒 *Admin only*
Fulfill a request (issue or return). Called from Vigyaan kiosk after QR verification.

**Body (issue only — months required):**
```json
{
  "months": 2
}
```

**Body (return — no extra fields needed):**
```json
{}
```

---

## 4. Student Management — `/api/admin/students`
*All routes — Admin only*

### GET `/api/admin/students`
Get all registered students.

**Query Params (optional):**
- `search=arjun` — search by name, email, or student ID
- `status=active` or `status=inactive`

**Response:**
```json
{
  "success": true,
  "count": 5,
  "students": [
    {
      "_id": "...",
      "studentId": "STU2024001",
      "fullName": "Arjun Sharma",
      "email": "arjun@geu.ac.in",
      "course": "B.Tech CSE",
      "isActive": true,
      "issuedBooksCount": 2,
      "overdueCount": 0
    }
  ]
}
```

---

### GET `/api/admin/students/overdue`
Get all students who have overdue books.

---

### GET `/api/admin/students/:id`
Get full details of a single student including issued books and pending requests.

---

### PUT `/api/admin/students/:id/deactivate`
Deactivate a student account. Fails if student has books issued.

---

### PUT `/api/admin/students/:id/reactivate`
Reactivate a deactivated student account.

---

### DELETE `/api/admin/students/:id`
Permanently delete a student. Student must be deactivated first and have no books issued.

---

## 5. Slot Routes — `/api/slots`

### GET `/api/slots` 🔒 *Student only*
Get today's and tomorrow's available library slots. Auto-generates slots and cleans up expired ones.

**Response:**
```json
{
  "success": true,
  "today": {
    "date": "2026-05-10",
    "slots": [
      {
        "_id": "...",
        "time": "10:00 AM – 11:00 AM",
        "startHour": 10,
        "total": 30,
        "booked": 12,
        "available": 18,
        "isFull": false,
        "isBookedByMe": false
      }
    ]
  },
  "tomorrow": { "date": "2026-05-11", "slots": [...] }
}
```

---

### POST `/api/slots/book` 🔒 *Student only*
Book a slot. One booking per student per day.

**Body:**
```json
{
  "slotId": "MONGO_SLOT_ID"
}
```

---

### POST `/api/slots/cancel` 🔒 *Student only*
Cancel a booked slot. Cannot cancel if slot already started.

**Body:**
```json
{
  "slotId": "MONGO_SLOT_ID"
}
```

---

### GET `/api/slots/mine` 🔒 *Student only*
Get the logged-in student's upcoming slot bookings.

---

### GET `/api/slots/admin?date=YYYY-MM-DD` 🔒 *Admin only*
Admin view of all slots for a specific date with list of students who booked.

**Example:** `GET /api/slots/admin?date=2026-05-10`

---

## 6. Vigyaan Kiosk Routes — `/api/vigyaan`

> These routes power the isolated full-screen Vigyaan kiosk. All require admin auth.

### GET `/api/vigyaan/status` 🔒 *Any logged-in user*
Check if Vigyaan kiosk is currently open.

**Response:**
```json
{
  "success": true,
  "isOpen": true,
  "session": { "_id": "...", "openedAt": "...", "openedBy": "..." }
}
```

---

### POST `/api/vigyaan/open` 🔒 *Admin only*
Open the Vigyaan kiosk session.

**Body:** *(empty)*

---

### POST `/api/vigyaan/close` 🔒 *Admin only*
Close the Vigyaan kiosk. Admin must scan their own QR to confirm.

**Body:**
```json
{
  "qrId": "ADMIN_QR_STRING"
}
```

---

### POST `/api/vigyaan/verify-student` 🔒 *Admin only*
Step 1 of issue/return flow. Verifies the student's QR matches the request owner.

**Body:**
```json
{
  "qrId": "STUDENT_QR_STRING",
  "requestId": "MONGO_REQUEST_ID"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student verified successfully. Hello Arjun Sharma!",
  "student": { "studentId": "STU2024001", "fullName": "Arjun Sharma", "course": "B.Tech CSE" },
  "nextStep": "Guide student to shelf: B-12 to collect the book"
}
```

---

### POST `/api/vigyaan/verify-book` 🔒 *Admin only*
Step 2. Verifies the scanned book QR matches the book in the request.

**Body:**
```json
{
  "qrId": "BOOK_QR_STRING",
  "requestId": "MONGO_REQUEST_ID"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Book verified: \"Deep Learning\"",
  "book": { "title": "Deep Learning", "shelf": "B-12", "availableCopies": 3 },
  "nextStep": "Book verified. Ask student how many months they need."
}
```

---

### POST `/api/vigyaan/issue` 🔒 *Admin only*
Step 3a. Completes the issue after both QRs are verified.

**Body:**
```json
{
  "requestId": "MONGO_REQUEST_ID",
  "months": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Book \"Deep Learning\" issued to Arjun Sharma for 2 month(s)",
  "dueDate": "2026-07-10T...",
  "summary": {
    "studentName": "Arjun Sharma",
    "bookTitle": "Deep Learning",
    "issuedFor": "2 month(s)",
    "returnBy": "10 July 2026"
  }
}
```

---

### POST `/api/vigyaan/return` 🔒 *Admin only*
Step 3b. Completes the return after both QRs are verified.

**Body:**
```json
{
  "requestId": "MONGO_REQUEST_ID"
}
```

---

## 7. AI Chat — `/api/ai`

### POST `/api/ai/chat` 🔒 *Student only*
Ask the AI assistant for book recommendations. Uses Gemini AI with live catalog context.

**Body:**
```json
{
  "message": "I want to learn about machine learning, what books do you have?"
}
```

**Response:**
```json
{
  "success": true,
  "reply": "Based on your interest in machine learning, I recommend...",
  "studentName": "Arjun Sharma"
}
```

---

## Error Response Format

All errors follow this shape:
```json
{
  "success": false,
  "message": "Descriptive error message here"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| 400 | Bad request / missing fields |
| 401 | Unauthorized / invalid token or QR |
| 403 | Forbidden (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate entry) |
| 429 | Rate limit (AI service) |
| 500 | Server error |

---

## Postman Quick-Test Strings

Copy these directly into Postman. Replace `TOKEN`, `ID` placeholders after first login.

```
# 1. Student Signup
POST http://localhost:5002/api/auth/student/signup
Body: {"studentId":"STU2024001","fullName":"Arjun Sharma","email":"arjun@geu.ac.in","course":"B.Tech CSE","completionYear":"2026","qrId":"STUDENT_QR_TEST_001"}

# 2. Student Login
POST http://localhost:5002/api/auth/student/login
Body: {"qrId":"STUDENT_QR_TEST_001"}

# 3. Admin Signup
POST http://localhost:5002/api/auth/admin/signup
Body: {"staffId":"ADM2024001","fullName":"Dr. Priya Verma","email":"priya@geu.ac.in","department":"Library Sciences","qrId":"ADMIN_QR_TEST_001"}

# 4. Admin Login
POST http://localhost:5002/api/auth/admin/login
Body: {"qrId":"ADMIN_QR_TEST_001"}

# 5. Get My Profile (use token from login)
GET http://localhost:5002/api/auth/me
Headers: Authorization: Bearer TOKEN_HERE

# 6. Add Book (admin token)
POST http://localhost:5002/api/books
Headers: Authorization: Bearer ADMIN_TOKEN
Body: {"title":"Deep Learning","author":"Ian Goodfellow","category":"AI/ML","isbn":"978-0262035613","shelf":"B-12","emoji":"🧠","description":"Comprehensive deep learning textbook.","totalCopies":5,"qrId":"BOOK_QR_001"}

# 7. Get All Books
GET http://localhost:5002/api/books
Headers: Authorization: Bearer TOKEN_HERE

# 8. Search Books
GET http://localhost:5002/api/books/search?q=machine learning
Headers: Authorization: Bearer TOKEN_HERE

# 9. Raise Issue Request (student token, replace bookId)
POST http://localhost:5002/api/requests/issue
Headers: Authorization: Bearer STUDENT_TOKEN
Body: {"bookId":"MONGO_BOOK_ID_HERE"}

# 10. Get My Requests
GET http://localhost:5002/api/requests/mine
Headers: Authorization: Bearer STUDENT_TOKEN

# 11. Get All Pending Issue Requests (admin)
GET http://localhost:5002/api/requests?status=pending&type=issue
Headers: Authorization: Bearer ADMIN_TOKEN

# 12. Cancel Request (student)
DELETE http://localhost:5002/api/requests/REQUEST_ID_HERE
Headers: Authorization: Bearer STUDENT_TOKEN

# 13. Get All Students (admin)
GET http://localhost:5002/api/admin/students
Headers: Authorization: Bearer ADMIN_TOKEN

# 14. Get Overdue Students
GET http://localhost:5002/api/admin/students/overdue
Headers: Authorization: Bearer ADMIN_TOKEN

# 15. Deactivate Student (admin)
PUT http://localhost:5002/api/admin/students/STUDENT_MONGO_ID/deactivate
Headers: Authorization: Bearer ADMIN_TOKEN

# 16. Get Slots (student)
GET http://localhost:5002/api/slots
Headers: Authorization: Bearer STUDENT_TOKEN

# 17. Book a Slot
POST http://localhost:5002/api/slots/book
Headers: Authorization: Bearer STUDENT_TOKEN
Body: {"slotId":"SLOT_ID_HERE"}

# 18. Cancel a Slot
POST http://localhost:5002/api/slots/cancel
Headers: Authorization: Bearer STUDENT_TOKEN
Body: {"slotId":"SLOT_ID_HERE"}

# 19. Check Vigyaan Status
GET http://localhost:5002/api/vigyaan/status
Headers: Authorization: Bearer ADMIN_TOKEN

# 20. Open Vigyaan
POST http://localhost:5002/api/vigyaan/open
Headers: Authorization: Bearer ADMIN_TOKEN

# 21. Verify Student QR (Vigyaan step 1)
POST http://localhost:5002/api/vigyaan/verify-student
Headers: Authorization: Bearer ADMIN_TOKEN
Body: {"qrId":"STUDENT_QR_TEST_001","requestId":"REQUEST_ID_HERE"}

# 22. Verify Book QR (Vigyaan step 2)
POST http://localhost:5002/api/vigyaan/verify-book
Headers: Authorization: Bearer ADMIN_TOKEN
Body: {"qrId":"BOOK_QR_001","requestId":"REQUEST_ID_HERE"}

# 23. Complete Issue (Vigyaan step 3a)
POST http://localhost:5002/api/vigyaan/issue
Headers: Authorization: Bearer ADMIN_TOKEN
Body: {"requestId":"REQUEST_ID_HERE","months":2}

# 24. Complete Return (Vigyaan step 3b)
POST http://localhost:5002/api/vigyaan/return
Headers: Authorization: Bearer ADMIN_TOKEN
Body: {"requestId":"REQUEST_ID_HERE"}

# 25. Close Vigyaan
POST http://localhost:5002/api/vigyaan/close
Headers: Authorization: Bearer ADMIN_TOKEN
Body: {"qrId":"ADMIN_QR_TEST_001"}

# 26. AI Chat
POST http://localhost:5002/api/ai/chat
Headers: Authorization: Bearer STUDENT_TOKEN
Body: {"message":"Recommend books for machine learning"}
```

---

## Frontend Integration Checklist

- [ ] **Store token** in `localStorage` as `vigyaan_token` after login/signup
- [ ] **Store user** in `localStorage` as `vigyaan_user` (JSON string)
- [ ] **Attach token** to all API calls via `Authorization: Bearer <token>` header
- [ ] On `401` response, clear storage and redirect to `/` (already handled in `src/lib/api.js`)
- [ ] **QR scan flow:** the decoded QR string is sent as `qrId` in login/signup/verify calls
- [ ] **Vigyaan kiosk flow order:** open → verify-student → (guide shelf) → verify-book → issue OR return → close
- [ ] Use `GET /api/vigyaan/status` on app load to restore `isOpen` state in `vigyaanStore`
- [ ] Use `GET /api/auth/me` on app load (inside `checkAuth`) to restore user session from token

---

## Environment Variables Required (`.env`)

```env
PORT=5002
MONGO_URI=mongodb://localhost:27017/vigyaan
JWT_SECRET=your_super_secret_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
NODE_ENV=development
```


------------------------------------------------

# Vigyaan Backend APIs

**Base URL:** `http://localhost:5002/api`
**Auth Header:** `Authorization: Bearer <token>` (required on all protected routes)

---

## Auth
- `POST /auth/student/signup` — Register student with `{ studentId, fullName, email, course, completionYear, qrId }`
- `POST /auth/student/login` — Student login with `{ qrId }` → returns `{ token, user }`
- `POST /auth/admin/signup` — Register admin with `{ staffId, fullName, email, department, qrId }`
- `POST /auth/admin/login` — Admin login with `{ qrId }` → returns `{ token, user }`
- `GET /auth/me` — Get current logged-in user profile

## Books
- `GET /books` — Get all books in catalog
- `GET /books/search?q=keyword` — Search books by title, author, category
- `GET /books/:id` — Get single book by ID
- `GET /books/qr?qrId=text` — Find book by its QR code (used in Vigyaan kiosk)
- `POST /books` — Add new book `{ title, author, category, isbn, shelf, emoji, description, totalCopies, qrId }` (admin only)
- `PUT /books/:id` — Update book details (admin only)
- `DELETE /books/:id` — Delete book (admin only)

## Requests
- `POST /requests/issue` — Student raises issue request `{ bookId }`
- `POST /requests/return` — Student raises return request `{ bookId }`
- `GET /requests/mine` — Get all requests of logged-in student
- `DELETE /requests/:id` — Student cancels their pending request
- `GET /requests` — Get all requests, filterable `?status=pending&type=issue` (admin only)
- `POST /requests/:id/fulfill` — Admin fulfills a request `{ months }` for issue, empty body for return (admin only)

## Students (Admin only)
- `GET /admin/students` — Get all students, supports `?search=name&status=active`
- `GET /admin/students/overdue` — Get all students with overdue books
- `GET /admin/students/:id` — Get single student full details
- `PUT /admin/students/:id/deactivate` — Deactivate student account
- `PUT /admin/students/:id/reactivate` — Reactivate student account
- `DELETE /admin/students/:id` — Permanently delete student

## Slots
- `GET /slots` — Get today and tomorrow available time slots (student only)
- `POST /slots/book` — Book a slot `{ slotId }` (student only)
- `POST /slots/cancel` — Cancel a booked slot `{ slotId }` (student only)
- `GET /slots/mine` — Get student's upcoming bookings
- `GET /slots/admin?date=YYYY-MM-DD` — Admin view of all bookings for a date

## Vigyaan Kiosk (Admin only)
- `GET /vigyaan/status` — Check if Vigyaan kiosk is open or closed
- `POST /vigyaan/open` — Open the Vigyaan kiosk session
- `POST /vigyaan/close` — Close kiosk, requires admin QR `{ qrId }`
- `POST /vigyaan/verify-student` — Step 1: verify student identity `{ qrId, requestId }`
- `POST /vigyaan/verify-book` — Step 2: verify scanned book matches request `{ qrId, requestId }`
- `POST /vigyaan/issue` — Step 3a: complete book issue `{ requestId, months }`
- `POST /vigyaan/return` — Step 3b: complete book return `{ requestId }`

## AI
- `POST /ai/chat` — AI book recommendations `{ message }` → returns `{ reply }` (student only)