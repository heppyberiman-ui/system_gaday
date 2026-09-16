const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');

// Authenticate all notification endpoints
router.use(authenticateJWT);

// GET /api/notifications/due-reminders - Get categorized due date reminders (H-3, H-1, Overdue)
router.get('/due-reminders', notificationController.getReminders);

module.exports = router;
