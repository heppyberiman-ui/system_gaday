const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Delete item photo file from uploads folder
 * @param {string} photoPath 
 */
const deleteItemPhotoFile = (photoPath) => {
  if (!photoPath) return;
  const filename = path.basename(photoPath);
  const filePath = path.join(__dirname, '../uploads/barang', filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`[FS Error] Failed to delete file: ${photoPath}`, error);
    }
  }
};

/**
 * Fetch all collateral items with query search/filters
 * @param {Object} query 
 * @param {Object} user 
 */
const getAllItems = async (query = {}, user) => {
  const { search, category, page = 1, limit = 10 } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {};

  // Tenant Isolation: Non-SUPER_ADMIN users only see items belonging to their store
  if (user.role !== 'SUPER_ADMIN') {
    where.customer = {
      storeId: user.storeId
    };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { imei: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (category) {
    where.category = { contains: category, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      skip,
      take,
      include: {
        customer: { select: { id: true, name: true, phone: true, storeId: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.item.count({ where })
  ]);

  return {
    items,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / take)
    }
  };
};

/**
 * Fetch item by ID verifying tenant boundaries
 * @param {string} id 
 * @param {Object} user 
 */
const getItemById = async (id, user) => {
  if (!id) {
    const error = new Error('Item ID is required');
    error.statusCode = 400;
    throw error;
  }

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, storeId: true } }
    }
  });

  if (!item) {
    const error = new Error('Item not found');
    error.statusCode = 404;
    throw error;
  }

  // Tenant boundaries check
  if (user.role !== 'SUPER_ADMIN' && item.customer.storeId !== user.storeId) {
    const error = new Error('Forbidden. You do not have access to this item.');
    error.statusCode = 403;
    throw error;
  }

  return item;
};

/**
 * Register a new pawned item
 * @param {Object} data 
 * @param {Object} user 
 */
const createItem = async (data, user) => {
  const {
    customerId, name, category, brand, modelName,
    imei, serialNumber, color, equipment, condition,
    estimatedValue, pawnAmount, description, photoPath
  } = data;

  const estVal = (estimatedValue !== undefined && estimatedValue !== null && estimatedValue !== '')
    ? parseFloat(estimatedValue)
    : parseFloat(pawnAmount || 0);

  if (!customerId || !name || !category || pawnAmount === undefined) {
    if (photoPath) deleteItemPhotoFile(photoPath);
    const error = new Error('Missing required fields: customerId, name, category, pawnAmount');
    error.statusCode = 400;
    throw error;
  }

  // Check customer existence
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    if (photoPath) deleteItemPhotoFile(photoPath);
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify store alignment
  if (user.role !== 'SUPER_ADMIN' && customer.storeId !== user.storeId) {
    if (photoPath) deleteItemPhotoFile(photoPath);
    const error = new Error('Forbidden. Cannot register item for customer in another store.');
    error.statusCode = 403;
    throw error;
  }

  const newItem = await prisma.item.create({
    data: {
      id: crypto.randomUUID(),
      customerId,
      name,
      category,
      brand: brand || null,
      modelName: modelName || null,
      imei: imei || null,
      serialNumber: serialNumber || null,
      color: color || null,
      equipment: equipment || null,
      condition: condition || null,
      estimatedValue: estVal,
      pawnAmount: parseFloat(pawnAmount),
      description: description || null,
      photoPath: photoPath || null,
      updatedAt: new Date()
    },
    include: {
      customer: { select: { name: true } }
    }
  });

  return newItem;
};

/**
 * Update item details
 * @param {string} id 
 * @param {Object} data 
 * @param {Object} user 
 */
const updateItem = async (id, data, user) => {
  if (!id) {
    if (data.photoPath) deleteItemPhotoFile(data.photoPath);
    const error = new Error('Item ID is required');
    error.statusCode = 400;
    throw error;
  }

  const item = await prisma.item.findUnique({
    where: { id },
    include: { customer: true }
  });

  if (!item) {
    if (data.photoPath) deleteItemPhotoFile(data.photoPath);
    const error = new Error('Item not found');
    error.statusCode = 404;
    throw error;
  }

  // Tenant boundaries check
  if (user.role !== 'SUPER_ADMIN' && item.customer.storeId !== user.storeId) {
    if (data.photoPath) deleteItemPhotoFile(data.photoPath);
    const error = new Error('Forbidden. You do not have access to this item.');
    error.statusCode = 403;
    throw error;
  }

  const {
    name, category, brand, modelName, imei, serialNumber,
    color, equipment, condition, estimatedValue, pawnAmount,
    description, photoPath
  } = data;

  const updateFields = { updatedAt: new Date() };
  if (name) updateFields.name = name;
  if (category) updateFields.category = category;
  if (brand !== undefined) updateFields.brand = brand;
  if (modelName !== undefined) updateFields.modelName = modelName;
  if (imei !== undefined) updateFields.imei = imei;
  if (serialNumber !== undefined) updateFields.serialNumber = serialNumber;
  if (color !== undefined) updateFields.color = color;
  if (equipment !== undefined) updateFields.equipment = equipment;
  if (condition !== undefined) updateFields.condition = condition;
  if (estimatedValue !== undefined) updateFields.estimatedValue = parseFloat(estimatedValue);
  if (pawnAmount !== undefined) updateFields.pawnAmount = parseFloat(pawnAmount);
  if (description !== undefined) updateFields.description = description;

  if (photoPath) {
    updateFields.photoPath = photoPath;
    // Remove old item photo from uploads
    if (item.photoPath) {
      deleteItemPhotoFile(item.photoPath);
    }
  }

  const updatedItem = await prisma.item.update({
    where: { id },
    data: updateFields,
    include: {
      customer: { select: { name: true } }
    }
  });

  return updatedItem;
};

/**
 * Delete item
 * @param {string} id 
 * @param {Object} user 
 */
const deleteItem = async (id, user) => {
  if (!id) {
    const error = new Error('Item ID is required');
    error.statusCode = 400;
    throw error;
  }

  const item = await prisma.item.findUnique({
    where: { id },
    include: { customer: true }
  });

  if (!item) {
    const error = new Error('Item not found');
    error.statusCode = 404;
    throw error;
  }

  // Tenant boundaries check
  if (user.role !== 'SUPER_ADMIN' && item.customer.storeId !== user.storeId) {
    const error = new Error('Forbidden. You do not have access to this item.');
    error.statusCode = 403;
    throw error;
  }

  // Prevent delete if item is active/pawned in any transactions
  const linkedTx = await prisma.transaction.findFirst({
    where: { itemId: id }
  });

  if (linkedTx) {
    const error = new Error('Cannot delete item because it is associated with pawn transactions.');
    error.statusCode = 400;
    throw error;
  }

  // Clear photo from disk
  if (item.photoPath) {
    deleteItemPhotoFile(item.photoPath);
  }

  await prisma.item.delete({
    where: { id }
  });

  return { message: 'Item deleted successfully' };
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
};
