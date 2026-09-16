const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth.middleware');

const storePhotoUpload = require('../middleware/storePhotoUpload.middleware');

// Protect all settings endpoints
router.use(authenticateJWT);

// GET /api/settings - Retrieve store settings config
router.get('/', settingController.getSettings);

// PUT /api/settings - Modify store settings config (ADMIN, SUPER_ADMIN only allowed)
router.put('/', authorizeRoles('ADMIN', 'SUPER_ADMIN'), storePhotoUpload.single('storePhoto'), settingController.updateSettings);

// GET /api/settings/backup - Download JSON backup file (ADMIN, SUPER_ADMIN)
router.get('/backup', authorizeRoles('ADMIN', 'SUPER_ADMIN'), settingController.exportBackup);

// POST /api/settings/restore - Restore JSON database backup (ADMIN, SUPER_ADMIN)
router.post('/restore', authorizeRoles('ADMIN', 'SUPER_ADMIN'), settingController.importRestore);

// DELETE /api/settings/clear-data - Clear all transactional & customer data (ADMIN, SUPER_ADMIN only)
router.delete('/clear-data', authorizeRoles('ADMIN', 'SUPER_ADMIN'), settingController.clearData);

module.exports = router;
