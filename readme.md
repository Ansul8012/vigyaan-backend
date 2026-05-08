// OLD (remove email + password from login)
studentLogin: (payload) => api.post('/auth/student/login', payload),
adminLogin: (payload) => api.post('/auth/admin/login', payload),

// These stay the same — frontend just needs to send only { qrId } now
// The QRScanner already returns the decoded text as qrId
// So in StudentAuth.jsx and AdminAuth.jsx, remove the email/password form for login
// and directly show QR scanner