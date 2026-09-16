const prisma = require('../config/prisma');

/**
 * Fetch dashboard statistics with tenant isolation
 * @param {Object} query 
 * @param {Object} user 
 */
const getDashboardStats = async (query = {}, user) => {
  const { storeId } = query;
  const where = {};

  // Tenant Isolation
  if (user.role !== 'SUPER_ADMIN') {
    where.storeId = user.storeId;
  } else if (storeId) {
    where.storeId = storeId;
  }

  // 1. Active Transactions Count and Value
  const activeTransactions = await prisma.transaction.findMany({
    where: {
      ...where,
      status: { in: ['AKTIF', 'PERPANJANG', 'JATUH_TEMPO'] }
    },
    select: {
      loanAmount: true
    }
  });

  const activeTransactionsCount = activeTransactions.length;
  const activeLoanValue = activeTransactions.reduce((sum, tx) => sum + parseFloat(tx.loanAmount), 0);

  // 2. Customer Count
  const customerCount = await prisma.customer.count({ where });

  // 3. Cash Flow Summary (In, Out, Balance)
  const cashFlows = await prisma.cashFlow.findMany({
    where,
    include: {
      transaction: true
    }
  });

  let totalIn = 0;
  let totalOut = 0;
  let revenue = 0;

  cashFlows.forEach(cf => {
    const val = parseFloat(cf.amount);
    if (cf.type === 'IN') {
      totalIn += val;
      
      // Calculate Revenue:
      // - 100% of admin fee (BIAYA_ADMIN) and extension payment (PERPANJANGAN)
      // - Redemption (PENEBUSAN) amount minus original loan amount is interest/penalty revenue
      if (cf.category === 'BIAYA_ADMIN' || cf.category === 'PERPANJANGAN') {
        revenue += val;
      } else if (cf.category === 'PENEBUSAN' && cf.transaction) {
        const profit = val - parseFloat(cf.transaction.loanAmount);
        if (profit > 0) {
          revenue += profit;
        }
      }
    } else if (cf.type === 'OUT') {
      totalOut += val;
    }
  });

  // 4. Today's Operational Summary (Barang Gadai Masuk & Tebusan Hari Ini)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const detectItemType = (itemName = '') => {
    const name = itemName.toLowerCase();
    if (name.includes('hp') || name.includes('phone') || name.includes('handphone') || name.includes('oppo') || name.includes('samsung') || name.includes('iphone') || name.includes('vivo') || name.includes('realme') || name.includes('xiaomi') || name.includes('redmi')) return 'HP';
    if (name.includes('tab') || name.includes('ipad') || name.includes('tablet')) return 'Tablet';
    if (name.includes('laptop') || name.includes('notebook') || name.includes('asus') || name.includes('lenovo') || name.includes('macbook') || name.includes('acer')) return 'Laptop';
    if (name.includes('tv') || name.includes('televisi') || name.includes('lg') || name.includes('polytron')) return 'TV';
    if (name.includes('kamera') || name.includes('camera') || name.includes('canon') || name.includes('nikon') || name.includes('sony')) return 'Kamera';
    return 'Lainnya';
  };

  // 4a. Barang Gadai Baru Hari Ini
  const pawnedTodayTxs = await prisma.transaction.findMany({
    where: {
      ...where,
      createdAt: { gte: startOfToday, lte: endOfToday }
    },
    include: {
      customer: { select: { name: true } },
      item: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const pawnedTodayBreakdown = { HP: 0, Tablet: 0, Laptop: 0, TV: 0, Kamera: 0, Lainnya: 0 };
  let pawnedTodayTotalLoan = 0;

  const pawnedTodayItems = pawnedTodayTxs.map(tx => {
    const type = detectItemType(tx.item?.name);
    pawnedTodayBreakdown[type] = (pawnedTodayBreakdown[type] || 0) + 1;
    const loanAmt = parseFloat(tx.loanAmount);
    pawnedTodayTotalLoan += loanAmt;
    return {
      id: tx.id,
      code: tx.transactionCode,
      customerName: tx.customer?.name || '-',
      itemName: tx.item?.name || '-',
      itemType: type,
      loanAmount: loanAmt,
      createdAt: tx.createdAt
    };
  });

  // 4b. Barang Ditebus (Pelunasan) Hari Ini
  const redeemedTodayTxs = await prisma.transaction.findMany({
    where: {
      ...where,
      status: 'LUNAS',
      updatedAt: { gte: startOfToday, lte: endOfToday }
    },
    include: {
      customer: { select: { name: true } },
      item: true
    },
    orderBy: { updatedAt: 'desc' }
  });

  const redeemedTodayBreakdown = { HP: 0, Tablet: 0, Laptop: 0, TV: 0, Kamera: 0, Lainnya: 0 };
  let redeemedTodayTotalValue = 0;

  const redeemedTodayItems = redeemedTodayTxs.map(tx => {
    const type = detectItemType(tx.item?.name);
    redeemedTodayBreakdown[type] = (redeemedTodayBreakdown[type] || 0) + 1;
    const totalRepay = parseFloat(tx.loanAmount) + parseFloat(tx.interestAmount);
    redeemedTodayTotalValue += totalRepay;
    return {
      id: tx.id,
      code: tx.transactionCode,
      customerName: tx.customer?.name || '-',
      itemName: tx.item?.name || '-',
      itemType: type,
      totalRepay,
      updatedAt: tx.updatedAt
    };
  });

  // 4c. Perpanjangan Hari Ini
  const extendedTodayPayments = await prisma.payment.findMany({
    where: {
      paymentType: 'PERPANJANGAN',
      paymentDate: { gte: startOfToday, lte: endOfToday }
    }
  });
  const extendedTodayCount = extendedTodayPayments.length;
  const extendedTodayInterest = extendedTodayPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // 5. Recent Transactions (last 5)
  const recentTransactions = await prisma.transaction.findMany({
    where,
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true } },
      item: { select: { name: true } }
    }
  });

  return {
    metrics: {
      activeTransactionsCount,
      activeLoanValue,
      customerCount,
      revenue,
      cashSummary: {
        totalIn,
        totalOut,
        balance: totalIn - totalOut
      }
    },
    todaySummary: {
      pawned: {
        count: pawnedTodayItems.length,
        totalLoanAmount: pawnedTodayTotalLoan,
        breakdown: pawnedTodayBreakdown,
        items: pawnedTodayItems
      },
      redeemed: {
        count: redeemedTodayItems.length,
        totalValue: redeemedTodayTotalValue,
        breakdown: redeemedTodayBreakdown,
        items: redeemedTodayItems
      },
      extended: {
        count: extendedTodayCount,
        totalInterest: extendedTodayInterest
      }
    },
    recentTransactions: recentTransactions.map(tx => ({
      id: tx.id,
      code: tx.transactionCode,
      customerName: tx.customer.name,
      itemName: tx.item.name,
      loanAmount: parseFloat(tx.loanAmount),
      status: tx.status,
      createdAt: tx.createdAt
    }))
  };
};

/**
 * Fetch detailed monthly revenue report
 * @param {Object} query 
 * @param {Object} user 
 */
const getRevenueReport = async (query = {}, user) => {
  const { storeId, year = new Date().getFullYear() } = query;
  const where = {
    date: {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31T23:59:59.999Z`)
    }
  };

  // Tenant Isolation
  if (user.role !== 'SUPER_ADMIN') {
    where.storeId = user.storeId;
  } else if (storeId) {
    where.storeId = storeId;
  }

  const cashFlows = await prisma.cashFlow.findMany({
    where,
    include: {
      transaction: true
    }
  });

  // Initialize 12 months array
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    adminFees: 0,
    extensions: 0,
    redemptions: 0,
    total: 0
  }));

  cashFlows.forEach(cf => {
    if (cf.type !== 'IN') return;

    const date = new Date(cf.date);
    const monthIndex = date.getMonth();
    const val = parseFloat(cf.amount);

    if (cf.category === 'BIAYA_ADMIN') {
      monthlyRevenue[monthIndex].adminFees += val;
      monthlyRevenue[monthIndex].total += val;
    } else if (cf.category === 'PERPANJANGAN') {
      monthlyRevenue[monthIndex].extensions += val;
      monthlyRevenue[monthIndex].total += val;
    } else if (cf.category === 'PENEBUSAN' && cf.transaction) {
      const profit = val - parseFloat(cf.transaction.loanAmount);
      if (profit > 0) {
        monthlyRevenue[monthIndex].redemptions += profit;
        monthlyRevenue[monthIndex].total += profit;
      }
    }
  });

  return {
    year: parseInt(year),
    monthlyRevenue
  };
};

module.exports = {
  getDashboardStats,
  getRevenueReport
};
