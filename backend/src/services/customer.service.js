const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Clean up KTP image file from server uploads folder
 * @param {string} filename 
 */
const deleteKtpFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(__dirname, '../uploads', filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`[FS Error] Failed to delete file: ${filename}`, error);
    }
  }
};

/**
 * Ensure a store exists in the database to prevent foreign key violation.
 * Defaults to the first store or creates a new fallback store.
 * @param {string} [storeId] 
 * @returns {Promise<string>}
 */
const ensureStoreExists = async (storeId) => {
  if (storeId) {
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });
    if (store) return storeId;
  }

  // Check if any store exists
  const existingStore = await prisma.store.findFirst();
  if (existingStore) return existingStore.id;

  // Create default fallback store
  const defaultStoreId = crypto.randomUUID();
  await prisma.store.create({
    data: {
      id: defaultStoreId,
      name: 'PawnHub Cabang Sudirman',
      address: 'Jl. Jendral Sudirman No. 123, Jakarta',
      phone: '021-5551234',
      updatedAt: new Date()
    }
  });

  return defaultStoreId;
};

/**
 * Retrieve all customers with pagination and optional search filter & tenant isolation
 * @param {Object} query 
 * @param {Object} [user]
 */
const getAllCustomers = async (query = {}, user) => {
  const { search, page = 1, limit = 10 } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {};

  // Tenant Isolation
  if (user && user.role !== 'SUPER_ADMIN' && user.storeId) {
    where.storeId = user.storeId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nik: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      {
        items: {
          some: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { modelName: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      }
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true, transactions: true }
        },
        items: {
          select: {
            id: true,
            name: true,
            brand: true,
            modelName: true,
            category: true,
            estimatedValue: true,
            pawnAmount: true,
            condition: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        transactions: {
          select: {
            id: true,
            transactionCode: true,
            loanAmount: true,
            status: true,
            startDate: true,
            dueDate: true,
            createdAt: true,
            item: {
              select: {
                id: true,
                name: true,
                brand: true,
                modelName: true,
                category: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    }),
    prisma.customer.count({ where })
  ]);

  return {
    customers,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / take)
    }
  };
};

/**
 * Fetch a customer details by ID with items & transaction history
 * @param {string} id 
 * @param {Object} [user]
 */
const getCustomerById = async (id, user) => {
  if (!id) {
    const error = new Error('Customer ID is required');
    error.statusCode = 400;
    throw error;
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: 'desc' }
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { name: true, category: true } }
        }
      }
    }
  });

  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  if (user && user.role !== 'SUPER_ADMIN' && user.storeId && customer.storeId !== user.storeId) {
    const error = new Error('Forbidden. You do not have access to this customer.');
    error.statusCode = 403;
    throw error;
  }

  return customer;
};

/**
 * Register a new customer
 * @param {Object} data 
 * @param {Object} [user]
 */
const createCustomer = async (data, user) => {
  const { nik, name, phone, address, ktpPhotoPath, notes, storeId } = data;

  if (!nik || !name || !phone) {
    if (ktpPhotoPath) deleteKtpFile(ktpPhotoPath);
    const error = new Error('NIK, name, and phone are required');
    error.statusCode = 400;
    throw error;
  }

  // Check NIK uniqueness
  const existingCustomer = await prisma.customer.findUnique({
    where: { nik }
  });

  if (existingCustomer) {
    if (ktpPhotoPath) deleteKtpFile(ktpPhotoPath);
    const error = new Error('Customer with this NIK is already registered');
    error.statusCode = 409;
    throw error;
  }

  const targetStoreId = (user && user.role !== 'SUPER_ADMIN') ? user.storeId : (storeId || (user ? user.storeId : null));
  const verifiedStoreId = await ensureStoreExists(targetStoreId);

  const newCustomer = await prisma.customer.create({
    data: {
      id: crypto.randomUUID(),
      nik,
      name,
      phone,
      address: address || null,
      ktpPhotoPath: ktpPhotoPath || null,
      notes: notes || null,
      storeId: verifiedStoreId,
      updatedAt: new Date()
    }
  });

  return newCustomer;
};

/**
 * Modify customer details
 * @param {string} id 
 * @param {Object} data 
 * @param {Object} [user]
 */
const updateCustomer = async (id, data, user) => {
  if (!id) {
    if (data.ktpPhotoPath) deleteKtpFile(data.ktpPhotoPath);
    const error = new Error('Customer ID is required');
    error.statusCode = 400;
    throw error;
  }

  // Find customer
  const customer = await prisma.customer.findUnique({
    where: { id }
  });

  if (!customer) {
    if (data.ktpPhotoPath) deleteKtpFile(data.ktpPhotoPath);
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  if (user && user.role !== 'SUPER_ADMIN' && user.storeId && customer.storeId !== user.storeId) {
    if (data.ktpPhotoPath) deleteKtpFile(data.ktpPhotoPath);
    const error = new Error('Forbidden. You do not have access to update this customer.');
    error.statusCode = 403;
    throw error;
  }

  // If NIK is updated, check uniqueness
  if (data.nik && data.nik !== customer.nik) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { nik: data.nik }
    });
    if (existingCustomer) {
      if (data.ktpPhotoPath) deleteKtpFile(data.ktpPhotoPath);
      const error = new Error('Customer with this NIK is already registered');
      error.statusCode = 409;
      throw error;
    }
  }

  // Prepare fields
  const updateFields = {
    name: data.name || customer.name,
    nik: data.nik || customer.nik,
    phone: data.phone || customer.phone,
    address: data.address !== undefined ? data.address : customer.address,
    notes: data.notes !== undefined ? data.notes : customer.notes,
    updatedAt: new Date()
  };

  // If new file is uploaded, remove the old file
  if (data.ktpPhotoPath) {
    updateFields.ktpPhotoPath = data.ktpPhotoPath;
    if (customer.ktpPhotoPath) {
      deleteKtpFile(customer.ktpPhotoPath);
    }
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id },
    data: updateFields
  });

  return updatedCustomer;
};

/**
 * Delete a customer record and remove their KTP photo
 * @param {string} id 
 * @param {Object} [user]
 */
const deleteCustomer = async (id, user) => {
  if (!id) {
    const error = new Error('Customer ID is required');
    error.statusCode = 400;
    throw error;
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      transactions: true,
      items: true
    }
  });

  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  if (user && user.role !== 'SUPER_ADMIN' && user.storeId && customer.storeId !== user.storeId) {
    const error = new Error('Forbidden. You do not have access to delete this customer.');
    error.statusCode = 403;
    throw error;
  }

  if (customer.transactions.length > 0) {
    const error = new Error('Cannot delete customer with existing pawn transactions.');
    error.statusCode = 400;
    throw error;
  }

  // Remove file from storage
  if (customer.ktpPhotoPath) {
    deleteKtpFile(customer.ktpPhotoPath);
  }

  // Delete items first if any unpledged items exist
  if (customer.items.length > 0) {
    await prisma.item.deleteMany({
      where: { customerId: id }
    });
  }

  await prisma.customer.delete({
    where: { id }
  });

  return { message: 'Customer deleted successfully' };
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
