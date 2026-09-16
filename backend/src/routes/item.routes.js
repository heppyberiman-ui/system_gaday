const express = require('express');
const router = express.Router();
const itemController = require('../controllers/item.controller');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth.middleware');
const itemUpload = require('../middleware/itemUpload.middleware');

// Protect all routes with JWT authentication
router.use(authenticateJWT);

// GET /api/items - Retrieve all items (SUPER_ADMIN, ADMIN, KASIR allowed)
router.get('/', itemController.getAll);

// GET /api/items/:id - Retrieve specific item details (SUPER_ADMIN, ADMIN, KASIR allowed)
router.get('/:id', itemController.getById);

// POST /api/items - Add a new item (SUPER_ADMIN, ADMIN, KASIR allowed)
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'KASIR'), itemUpload.single('photo'), itemController.create);

// PUT /api/items/:id - Update item details (SUPER_ADMIN, ADMIN, KASIR allowed)
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'KASIR'), itemUpload.single('photo'), itemController.update);

// DELETE /api/items/:id - Remove item (SUPER_ADMIN, ADMIN allowed)
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), itemController.remove);

module.exports = router;
