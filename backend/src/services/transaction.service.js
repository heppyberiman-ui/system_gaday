const prisma = require('../config/prisma');
const crypto = require('crypto');

/**
 * Generate a unique transaction code prefixing store tag and dates (PH-YYYYMMDD-XXXX)
 */
const generateTransactionCode = async () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));

  // Count transactions created today to calculate suffix code sequence
  const todayCount = await prisma.transaction.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });

  const nextSeq = String(todayCount + 1).padStart(4, '0');
  return `PH-${dateStr}-${nextSeq}`;
};

/**
 * Create a new pawn transaction (loan disbursement)
 * @param {Object} data 
 * @param {Object} user 
 */
const createTransaction = async (data, user) => {
  const { customerId, itemId, loanAmount, interestRate, adminFee, durationDays = 30, notes } = data;

  if (!customerId || !itemId || loanAmount === undefined || interestRate === undefined || adminFee === undefined) {
    const error = new Error('Missing required fields: customerId, itemId, loanAmount, interestRate, adminFee');
    error.statusCode = 400;
    throw error;
  }

  // Fetch customer and item
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  const item = await prisma.item.findUnique({ where: { id: itemId } });

  if (!customer || !item) {
    const error = new Error('Customer or Item not found');
    error.statusCode = 404;
    throw error;
  }

  const storeId = user.role === 'SUPER_ADMIN' ? customer.storeId : user.storeId;

  // Tenant security checks
  if (user.role !== 'SUPER_ADMIN') {
    if (customer.storeId !== storeId || item.customerId !== customerId) {
      const error = new Error('Store or Customer/Item ownership mismatch');
      error.statusCode = 403;
      throw error;
    }
  }

  // Double-Pawn Check: Verify item is not already pledged in an active transaction
  const activeTx = await prisma.transaction.findFirst({
    where: {
      itemId,
      status: { in: ['AKTIF', 'PERPANJANG', 'JATUH_TEMPO'] }
    }
  });

  if (activeTx) {
    const error = new Error('Item is already pledged in another active transaction (Status: Digadai)');
    error.statusCode = 400;
    throw error;
  }

  // Math Calculations
  const numLoan = parseFloat(loanAmount);
  const numInterestRate = parseFloat(interestRate); // monthly interest rate (e.g. 5%)
  const numAdmin = parseFloat(adminFee);
  const numDuration = parseInt(durationDays);

  // Calculate interest: loanAmount * interestRate / 100
  const interestAmount = (numLoan * numInterestRate) / 100;

  // Calculate Dates
  const startDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(startDate.getDate() + numDuration);

  const transactionCode = await generateTransactionCode();

  // Perform atomic transactions write via Prisma
  const transactionResult = await prisma.$transaction(async (tx) => {
    // 1. Create Transaction
    const newTx = await tx.transaction.create({
      data: {
        id: crypto.randomUUID(),
        transactionCode,
        storeId,
        customerId,
        itemId,
        userId: user.id,
        loanAmount: numLoan,
        interestRate: numInterestRate,
        interestAmount,
        adminFee: numAdmin,
        durationDays: numDuration,
        startDate,
        dueDate,
        status: 'AKTIF',
        notes: notes || null
      }
    });

    // 2. Record Cash Flow Outflow (loan payout to customer)
    await tx.cashFlow.create({
      data: {
        id: crypto.randomUUID(),
        storeId,
        transactionId: newTx.id,
        type: 'OUT',
        amount: numLoan,
        category: 'PINJAMAN_GADAI',
        description: `Pencairan Gadai ${transactionCode} - ${item.name}`,
        date: startDate
      }
    });

    // 3. Record Cash Flow Inflow (administrative fee collected, if any)
    if (numAdmin > 0) {
      await tx.cashFlow.create({
        data: {
          id: crypto.randomUUID(),
          storeId,
          transactionId: newTx.id,
          type: 'IN',
          amount: numAdmin,
          category: 'BIAYA_ADMIN',
          description: `Biaya Admin Gadai ${transactionCode}`,
          date: startDate
        }
      });
    }

    return newTx;
  });

  // Return full populated transaction record
  return await prisma.transaction.findUnique({
    where: { id: transactionResult.id },
    include: {
      customer: true,
      item: true,
      user: { select: { id: true, fullName: true, role: true } }
    }
  });
};

/**
 * Get list of transactions
 * @param {Object} query 
 * @param {Object} user 
 */
const getAllTransactions = async (query = {}, user) => {
  const { status, search, page = 1, limit = 10 } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {};

  // Tenant Isolation
  if (user.role !== 'SUPER_ADMIN') {
    where.storeId = user.storeId;
  }

  if (status) {
    if (status.includes(',')) {
      const statuses = status.split(',').map(s => s.trim());
      where.status = { in: statuses };
    } else {
      where.status = status;
    }
  }

  if (search) {
    where.OR = [
      { transactionCode: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { item: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take,
      include: {
        customer: true,
        item: true,
        user: { select: { id: true, fullName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.transaction.count({ where })
  ]);

  return {
    transactions,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / take)
    }
  };
};

/**
 * Get details of a single transaction
 * @param {string} id 
 * @param {Object} user 
 */
const getTransactionById = async (id, user) => {
  if (!id) {
    const error = new Error('Transaction ID is required');
    error.statusCode = 400;
    throw error;
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      customer: true,
      item: true,
      user: { select: { id: true, fullName: true, role: true } },
      cashFlows: true,
      payments: true
    }
  });

  if (!transaction) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  // Tenant Isolation
  if (user.role !== 'SUPER_ADMIN' && transaction.storeId !== user.storeId) {
    const error = new Error('Forbidden. You do not have access to this transaction.');
    error.statusCode = 403;
    throw error;
  }

  return transaction;
};

const redeemTransaction = async (id, data, user) => {
  const { notes } = data;
  const now = new Date();

  // Find transaction
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { item: true }
  });

  if (!tx) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  // Tenant Isolation
  if (user.role !== 'SUPER_ADMIN' && tx.storeId !== user.storeId) {
    const error = new Error('Forbidden. You do not have access to this transaction.');
    error.statusCode = 403;
    throw error;
  }

  if (tx.status === 'LUNAS' || tx.status === 'DIJUAL') {
    const error = new Error(`Cannot redeem transaction in status ${tx.status}`);
    error.statusCode = 400;
    throw error;
  }

  // Calculate final payoff amount
  const isOverdue = now > new Date(tx.dueDate);
  let penalty = 0;
  if (isOverdue) {
    const diffTime = Math.abs(now - new Date(tx.dueDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // 0.2% penalty per day overdue
    penalty = parseFloat(tx.loanAmount) * 0.002 * diffDays;
  }

  const finalAmount = parseFloat(tx.loanAmount) + parseFloat(tx.interestAmount) + penalty;

  const result = await prisma.$transaction(async (prismaTx) => {
    // 1. Update status
    const updated = await prismaTx.transaction.update({
      where: { id },
      data: {
        status: 'LUNAS',
        endDate: now
      }
    });

    // 2. Create Payment record
    await prismaTx.payment.create({
      data: {
        id: crypto.randomUUID(),
        transactionId: id,
        userId: user.id,
        paymentType: 'PENEBUSAN',
        amount: finalAmount,
        paymentDate: now,
        notes: notes || 'Penebusan barang gadai'
      }
    });

    // 3. Create Cash Flow record
    await prismaTx.cashFlow.create({
      data: {
        id: crypto.randomUUID(),
        storeId: tx.storeId,
        transactionId: id,
        type: 'IN',
        amount: finalAmount,
        category: 'PENEBUSAN',
        description: `Pelunasan gadai ${tx.transactionCode} - ${tx.item.name}`,
        date: now
      }
    });

    return updated;
  });

  return { transaction: result, finalAmount, penalty };
};

const extendTransaction = async (id, data, user) => {
  const { extensionDays, extensionInterestRate, notes } = data;
  const now = new Date();

  // Find transaction
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { item: true }
  });

  if (!tx) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  // Tenant Isolation
  if (user.role !== 'SUPER_ADMIN' && tx.storeId !== user.storeId) {
    const error = new Error('Forbidden. You do not have access to this transaction.');
    error.statusCode = 403;
    throw error;
  }

  if (tx.status !== 'AKTIF' && tx.status !== 'PERPANJANG' && tx.status !== 'JATUH_TEMPO') {
    const error = new Error(`Cannot extend transaction in status ${tx.status}`);
    error.statusCode = 400;
    throw error;
  }

  // Calculate extension days & tiered interest rate
  const extDays = extensionDays ? parseInt(extensionDays) : (tx.durationDays || 30);
  let extRate = extensionInterestRate ? parseFloat(extensionInterestRate) : null;

  if (extRate === null || isNaN(extRate)) {
    if (extDays <= 7) {
      extRate = 10.0;
    } else if (extDays <= 21) {
      extRate = 15.0;
    } else {
      extRate = 20.0;
    }
  }

  const loanAmt = parseFloat(tx.loanAmount);
  const interestToPay = (loanAmt * extRate) / 100;

  // New due date = old due date + extDays
  const currentDueDate = new Date(tx.dueDate);
  const newDueDate = new Date(currentDueDate.getTime() + extDays * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (prismaTx) => {
    // 1. Update Transaction
    const updated = await prismaTx.transaction.update({
      where: { id },
      data: {
        dueDate: newDueDate,
        durationDays: extDays,
        interestRate: extRate,
        interestAmount: interestToPay,
        status: 'PERPANJANG'
      }
    });

    // 2. Create Payment record
    await prismaTx.payment.create({
      data: {
        id: crypto.randomUUID(),
        transactionId: id,
        userId: user.id,
        paymentType: 'PERPANJANGAN',
        amount: interestToPay,
        paymentDate: now,
        notes: notes || `Perpanjang gadai (${extDays} Hari), Jatuh Tempo baru: ${newDueDate.toLocaleDateString('id-ID')}`
      }
    });

    // 3. Create Cash Flow record
    await prismaTx.cashFlow.create({
      data: {
        id: crypto.randomUUID(),
        storeId: tx.storeId,
        transactionId: id,
        type: 'IN',
        amount: interestToPay,
        category: 'PERPANJANGAN',
        description: `Pembayaran bunga perpanjangan gadai (${extDays} Hari) ${tx.transactionCode}`,
        date: now
      }
    });

    return updated;
  });

  return { transaction: result, interestPaid: interestToPay, newDueDate };
};

/**
 * Execute auction sale for an overdue/confiscated pawn transaction
 * @param {string} id 
 * @param {Object} data 
 * @param {Object} user 
 */
const auctionTransaction = async (id, data, user) => {
  const { salePrice, buyerName, notes } = data;
  const now = new Date();

  if (!salePrice || isNaN(parseFloat(salePrice)) || parseFloat(salePrice) <= 0) {
    const error = new Error('Harga jual lelang harus berupa angka positif');
    error.statusCode = 400;
    throw error;
  }

  const numSalePrice = parseFloat(salePrice);

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { item: true, customer: true }
  });

  if (!tx) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== 'SUPER_ADMIN' && tx.storeId !== user.storeId) {
    const error = new Error('Forbidden. You do not have access to this transaction.');
    error.statusCode = 403;
    throw error;
  }

  if (tx.status === 'LUNAS' || tx.status === 'DIJUAL') {
    const error = new Error(`Cannot execute auction for transaction with status ${tx.status}`);
    error.statusCode = 400;
    throw error;
  }

  const loanAmt = parseFloat(tx.loanAmount);
  const profitMargin = numSalePrice - loanAmt;

  const result = await prisma.$transaction(async (prismaTx) => {
    // 1. Update Transaction status to DIJUAL
    const updated = await prismaTx.transaction.update({
      where: { id },
      data: {
        status: 'DIJUAL',
        endDate: now,
        notes: notes ? `${tx.notes || ''}\n[LELANG]: ${notes}` : tx.notes
      }
    });

    // 2. Create Payment record
    await prismaTx.payment.create({
      data: {
        id: crypto.randomUUID(),
        transactionId: id,
        userId: user.id,
        paymentType: 'PENJUALAN_LELANG',
        amount: numSalePrice,
        paymentDate: now,
        notes: buyerName ? `Penjualan lelang kepada: ${buyerName}` : 'Hasil Penjualan Lelang Barang Sitaan'
      }
    });

    // 3. Create Cash Flow IN record
    await prismaTx.cashFlow.create({
      data: {
        id: crypto.randomUUID(),
        storeId: tx.storeId,
        transactionId: id,
        type: 'IN',
        amount: numSalePrice,
        category: 'PENJUALAN_LELANG',
        description: `Penjualan lelang barang sitaan ${tx.transactionCode} (${tx.item.name}) - Pembeli: ${buyerName || 'Umum'}`,
        date: now
      }
    });

    return updated;
  });

  return { transaction: result, salePrice: numSalePrice, profitMargin };
};

module.exports = {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  redeemTransaction,
  extendTransaction,
  auctionTransaction
};
