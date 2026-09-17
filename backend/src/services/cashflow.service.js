const prisma = require('../config/prisma');
const crypto = require('crypto');

/**
 * Fetch all cash flow records with filter parameters
 * @param {Object} query 
 * @param {Object} user 
 */
const getAllCashFlows = async (query = {}, user) => {
  const { type, category, startDate, endDate, storeId, page = 1, limit = 10 } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {};

  // Tenant Isolation
  if (user.role !== 'SUPER_ADMIN') {
    where.storeId = user.storeId;
  } else if (storeId) {
    where.storeId = storeId;
  }

  if (type) {
    where.type = type.toUpperCase();
  }

  if (category) {
    where.category = { contains: category, mode: 'insensitive' };
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      where.date.gte = new Date(startDate);
    }
    if (endDate) {
      where.date.lte = new Date(endDate);
    }
  }

  const [cashFlows, total] = await Promise.all([
    prisma.cashFlow.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
      include: {
        store: { select: { name: true } },
        transaction: { select: { transactionCode: true } }
      }
    }),
    prisma.cashFlow.count({ where })
  ]);

  return {
    cashFlows,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / take)
    }
  };
};

/**
 * Record an operational expense and create corresponding cash flow outflow
 * @param {Object} data 
 * @param {Object} user 
 */
const createExpense = async (data, user) => {
  const { amount, category, description, date, storeId } = data;

  if (amount === undefined || !category || !description) {
    const error = new Error('Amount, category, and description are required');
    error.statusCode = 400;
    throw error;
  }

  const verifiedStoreId = user.role === 'SUPER_ADMIN' ? storeId : user.storeId;
  if (!verifiedStoreId) {
    const error = new Error('Store ID is required for recording expenses');
    error.statusCode = 400;
    throw error;
  }

  // Validate store exists
  const storeExists = await prisma.store.findUnique({
    where: { id: verifiedStoreId }
  });
  if (!storeExists) {
    const error = new Error('Store not found');
    error.statusCode = 404;
    throw error;
  }

  const numAmount = parseFloat(amount);
  const expenseDate = date ? new Date(date) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create operational expense record
    const expense = await tx.expense.create({
      data: {
        id: crypto.randomUUID(),
        storeId: verifiedStoreId,
        userId: user.id,
        amount: numAmount,
        category,
        description,
        date: expenseDate,
        updatedAt: new Date()
      }
    });

    // 2. Create corresponding CashFlow OUT entry
    const cashFlow = await tx.cashFlow.create({
      data: {
        id: crypto.randomUUID(),
        storeId: verifiedStoreId,
        type: 'OUT',
        amount: numAmount,
        category: 'PENGELUARAN_OPERASIONAL',
        description: `Pengeluaran ${category}: ${description}`,
        date: expenseDate,
        updatedAt: new Date()
      }
    });

    return { expense, cashFlow };
  });

  return result;
};

/**
 * Fetch cash flow summary (total in, total out, net balance)
 * @param {Object} query 
 * @param {Object} user 
 */
const getCashFlowSummary = async (query = {}, user) => {
  const { startDate, endDate, storeId } = query;

  const where = {};

  // Tenant Isolation
  if (user.role !== 'SUPER_ADMIN') {
    where.storeId = user.storeId;
  } else if (storeId) {
    where.storeId = storeId;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      where.date.gte = new Date(startDate);
    }
    if (endDate) {
      where.date.lte = new Date(endDate);
    }
  }

  // Fetch all cash flows for calculation
  const cashFlows = await prisma.cashFlow.findMany({
    where,
    select: {
      type: true,
      amount: true,
      category: true
    }
  });

  let totalIn = 0;
  let totalOut = 0;
  const breakdownIn = {};
  const breakdownOut = {};

  cashFlows.forEach(cf => {
    const val = parseFloat(cf.amount);
    if (cf.type === 'IN') {
      totalIn += val;
      breakdownIn[cf.category] = (breakdownIn[cf.category] || 0) + val;
    } else if (cf.type === 'OUT') {
      totalOut += val;
      breakdownOut[cf.category] = (breakdownOut[cf.category] || 0) + val;
    }
  });

  return {
    totalIn,
    totalOut,
    balance: totalIn - totalOut,
    count: cashFlows.length,
    breakdownIn,
    breakdownOut
  };
};

module.exports = {
  getAllCashFlows,
  createExpense,
  getCashFlowSummary
};
