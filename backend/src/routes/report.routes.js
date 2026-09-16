const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth.middleware');

// Protect all report routes with JWT
router.use(authenticateJWT);

// GET /api/reports/dashboard - Fetch dashboard KPIs
router.get('/dashboard', reportController.getDashboardStats);

// GET /api/reports/revenue - Fetch detailed revenue reports (restricted to ADMIN, SUPER_ADMIN)
router.get('/revenue', authorizeRoles('ADMIN', 'SUPER_ADMIN'), reportController.getRevenueReport);

module.exports = router;
