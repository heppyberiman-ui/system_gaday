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

module.exports = {
  register,
  login,
  updateProfile
};
