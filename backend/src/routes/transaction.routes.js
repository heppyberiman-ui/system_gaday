const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth.middleware');

// Protect all routes with JWT authentication
router.use(authenticateJWT);

// GET /api/transactions - Retrieve list of transactions (SUPER_ADMIN, ADMIN, KASIR allowed)
router.get('/', transactionController.getAll);

// GET /api/transactions/:id - Retrieve specific transaction details (SUPER_ADMIN, ADMIN, KASIR allowed)
router.get('/:id', transactionController.getById);

// POST /api/transactions - Disburse a new pawn loan (SUPER_ADMIN, ADMIN, KASIR allowed)
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'KASIR'), transactionController.create);

// PUT /api/transactions/:id/redeem - Redeem a pawned item (SUPER_ADMIN, ADMIN, KASIR allowed)
router.put('/:id/redeem', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'KASIR'), transactionController.redeem);

// PUT /api/transactions/:id/extend - Extend a pawn loan duration (SUPER_ADMIN, ADMIN, KASIR allowed)
router.put('/:id/extend', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'KASIR'), transactionController.extend);

// PUT /api/transactions/:id/auction - Execute auction sale of confiscated item (SUPER_ADMIN, ADMIN, KASIR allowed)
router.put('/:id/auction', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'KASIR'), transactionController.auction);

module.exports = router;
