const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scan.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');
const scanUpload = require('../middleware/scanUpload.middleware');

// Protect all routes with JWT authentication
router.use(authenticateJWT);

// POST /api/scan/surat - Scan pawn ticket with OCR
router.post('/surat', scanUpload.single('file'), scanController.scanSurat);

// POST /api/scan/import - Automatically import scanned ticket into Database
router.post('/import', scanController.importScannedTransaction);

module.exports = router;
