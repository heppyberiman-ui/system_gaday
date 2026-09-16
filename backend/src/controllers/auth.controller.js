const authService = require('../services/auth.service');

/**
 * Handle user registration request
 */
const register = async (req, res, next) => {
  try {
    const newUser = await authService.register(req.body);
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login request
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const authData = await authService.login(username, password);
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: authData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch authenticated user details (Me)
 */
const getMe = async (req, res, next) => {
  try {
    // req.user has already been set by authenticateJWT middleware
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user profile update
 */
const updateProfile = async (req, res, next) => {
  try {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Profil pengguna berhasil diperbarui',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle OTP Request for Forgot Password
 */
const requestOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const result = await authService.requestOTP(phone);
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle OTP Verification & Password Reset
 */
const resetPasswordOTP = async (req, res, next) => {
  try {
    const { phone, otpCode, newPassword } = req.body;
    const result = await authService.verifyOTPAndResetPassword(phone, otpCode, newPassword);
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  requestOTP,
  resetPasswordOTP
};

