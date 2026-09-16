const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Authenticate all incoming requests for customer details
router.use(authenticateJWT);

// GET /api/customers - List customers (SUPER_ADMIN, ADMIN, KASIR allowed)
router.get('/', customerController.getAll);

// GET /api/customers/:id - Fetch customer details (SUPER_ADMIN, ADMIN, KASIR allowed)
router.get('/:id', customerController.getById);

// POST /api/customers - Create new customer (SUPER_ADMIN, ADMIN, KASIR allowed)
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'KASIR'), upload.single('fotoKtp'), customerController.create);

// PUT /api/customers/:id - Update customer details (SUPER_ADMIN, ADMIN, KASIR allowed)
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'KASIR'), upload.single('fotoKtp'), customerController.update);

// DELETE /api/customers/:id - Remove customer records (SUPER_ADMIN, ADMIN only allowed)
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), customerController.remove);

module.exports = router;
