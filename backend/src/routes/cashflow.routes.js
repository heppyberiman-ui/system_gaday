const express = require('express');
const router = express.Router();
const cashflowController = require('../controllers/cashflow.controller');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth.middleware');

// Protect all cashflow routes
router.use(authenticateJWT);

// GET /api/cashflows - Retrieve cash flow records
router.get('/', cashflowController.getAll);

// GET /api/cashflows/summary - Retrieve cash flow totals
router.get('/summary', cashflowController.getSummary);

// POST /api/cashflows/expense - Log operational expense (KASIR, ADMIN, SUPER_ADMIN allowed)
router.post('/expense', authorizeRoles('KASIR', 'ADMIN', 'SUPER_ADMIN'), cashflowController.createExpense);

module.exports = router;
