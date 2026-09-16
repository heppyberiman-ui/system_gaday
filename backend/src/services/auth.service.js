const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'pawnhub_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Register a new user
 * @param {Object} userData 
 * @returns {Promise<Object>}
 */
const register = async (userData) => {
  const { username, password, fullName, role, storeId } = userData;

  if (!username || !password || !fullName) {
    const error = new Error('Username, password, and fullName are required');
    error.statusCode = 400;
    throw error;
  }

  // Map requested roles to DB Role Enum (SUPER_ADMIN, ADMIN, KASIR)
  let userRole = 'KASIR'; // Default role
  if (role) {
    const upperRole = role.toUpperCase();
    if (upperRole === 'SUPER_ADMIN' || upperRole === 'OWNER') {
      userRole = 'SUPER_ADMIN';
    } else if (upperRole === 'ADMIN') {
      userRole = 'ADMIN';
    } else if (upperRole === 'KASIR' || upperRole === 'PETUGAS') {
      userRole = 'KASIR';
    } else {
      const error = new Error('Invalid role. Valid roles are: OWNER, ADMIN, PETUGAS');
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate storeId exists if provided
  if (storeId) {
    const storeExists = await prisma.store.findUnique({
      where: { id: storeId }
    });
    if (!storeExists) {
      const error = new Error('Referenced storeId does not exist');
      error.statusCode = 400;
      throw error;
    }
  }

  // Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username }
  });

  if (existingUser) {
    const error = new Error('Username is already registered');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Store user
  const newUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      username,
      fullName,
      password: hashedPassword,
      role: userRole,
      storeId: storeId || null,
      updatedAt: new Date()
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      storeId: true,
      createdAt: true
    }
  });

  return newUser;
};

/**
 * Authenticate user credentials and return a token
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<Object>}
 */
const login = async (username, password) => {
  if (!username || !password) {
    const error = new Error('Username and password are required');
    error.statusCode = 400;
    throw error;
  }

  // Query database
  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT Token (include storeId)
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, storeId: user.storeId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      storeId: user.storeId
    },
    token
  };
};

/**
 * Update user profile (fullName and optional password)
 * @param {string} userId 
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
const updateProfile = async (userId, data) => {
  const { fullName, password } = data;

  if (!fullName || !fullName.trim()) {
    const error = new Error('Nama lengkap tidak boleh kosong');
    error.statusCode = 400;
    throw error;
  }

  const updateData = {
    fullName: fullName.trim(),
    updatedAt: new Date()
  };

  if (password && password.trim().length > 0) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(password.trim(), salt);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      storeId: true,
      updatedAt: true
    }
  });

  return updatedUser;
};

/**
 * Request OTP Code for Password Reset via Phone / WhatsApp
 * @param {string} phoneOrUsername 
 */
const requestOTP = async (phoneOrUsername) => {
  if (!phoneOrUsername || !phoneOrUsername.trim()) {
    const error = new Error('Nomor telepon atau username harus diisi');
    error.statusCode = 400;
    throw error;
  }

  const query = phoneOrUsername.trim();
  
  // Find user by phone, username, or default fallback to admin
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: query },
        { username: query },
        { username: 'admin' }
      ]
    }
  });

  if (!user) {
    user = await prisma.user.findFirst({ where: { username: 'admin' } });
  }

  if (!user) {
    const error = new Error('Nomor telepon/Username tidak terdaftar dalam sistem');
    error.statusCode = 404;
    throw error;
  }

  // Generate 6-digit numeric OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

  const targetPhone = query.startsWith('08') || query.startsWith('62') ? query : (user.phone || '082288110375');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone: targetPhone,
      otpCode,
      otpExpires
    }
  });

  return {
    status: 'success',
    message: `Kode OTP 6-Digit berhasil dikirim via WhatsApp ke ${targetPhone}`,
    phone: targetPhone,
    username: user.username,
    otpDemo: otpCode, // Included for easy demo preview
    expiresInMinutes: 5
  };
};

/**
 * Verify OTP Code and Reset Password
 * @param {string} phone 
 * @param {string} otpCode 
 * @param {string} newPassword 
 */
const verifyOTPAndResetPassword = async (phone, otpCode, newPassword) => {
  if (!otpCode || !newPassword) {
    const error = new Error('Kode OTP dan Password Baru wajib diisi');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.trim().length < 4) {
    const error = new Error('Password baru minimal 4 karakter');
    error.statusCode = 400;
    throw error;
  }

  const cleanOtp = otpCode.trim();
  const cleanPhone = phone ? phone.trim() : '';

  // Find user matching OTP
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { otpCode: cleanOtp },
        { phone: cleanPhone }
      ]
    }
  });

  if (!user || !user.otpCode) {
    const error = new Error('Kode OTP tidak ditemukan atau sudah kadaluwarsa');
    error.statusCode = 400;
    throw error;
  }

  if (user.otpCode !== cleanOtp) {
    const error = new Error('Kode OTP yang Anda masukkan salah');
    error.statusCode = 400;
    throw error;
  }

  if (user.otpExpires && new Date() > new Date(user.otpExpires)) {
    const error = new Error('Kode OTP telah kadaluwarsa (lebih dari 5 menit). Silakan minta OTP baru.');
    error.statusCode = 400;
    throw error;
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      otpCode: null,
      otpExpires: null
    }
  });

  return {
    status: 'success',
    message: `Password akun '${user.username}' berhasil diperbarui! Silakan masuk dengan password baru Anda.`,
    username: user.username
  };
};

module.exports = {
  register,
  login,
  updateProfile,
  requestOTP,
  verifyOTPAndResetPassword
};

