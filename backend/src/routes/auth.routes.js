const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth.middleware');

// Public authentication paths
router.post('/register', authController.register);
router.post('/login', authController.login);

// Token-protected profile check & update
router.get('/me', authenticateJWT, authController.getMe);
router.put('/profile', authenticateJWT, authController.updateProfile);

// Role authorization verification testing endpoints
router.get('/test/admin-only', authenticateJWT, authorizeRoles('ADMIN'), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Authorized: Access granted to ADMIN role.',
    user: req.user
  });
});

router.get('/test/petugas-only', authenticateJWT, authorizeRoles('KASIR', 'ADMIN'), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Authorized: Access granted to PETUGAS (KASIR) or ADMIN role.',
    user: req.user
  });
});

router.get('/test/owner-only', authenticateJWT, authorizeRoles('SUPER_ADMIN'), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Authorized: Access granted to OWNER (SUPER_ADMIN) role.',
    user: req.user
  });
});

module.exports = router;
