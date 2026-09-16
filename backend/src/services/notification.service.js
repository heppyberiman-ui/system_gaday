const prisma = require('../config/prisma');

/**
 * Fetch categorized due date reminders for WhatsApp notifications
 * @param {Object} user 
 */
const getDueReminders = async (user) => {
  const where = {
    status: { in: ['AKTIF', 'PERPANJANG', 'JATUH_TEMPO'] }
  };

  if (user && user.role !== 'SUPER_ADMIN' && user.storeId) {
    where.storeId = user.storeId;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      customer: true,
      item: true,
      user: { select: { id: true, fullName: true } }
    },
    orderBy: { dueDate: 'asc' }
  });

  const now = new Date();
  
  const h3List = [];
  const h1List = [];
  const overdueList = [];

  transactions.forEach((tx) => {
    const dueDate = new Date(tx.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const totalTebus = parseFloat(tx.loanAmount) + parseFloat(tx.interestAmount) + parseFloat(tx.adminFee || 0);

    const txPayload = {
      ...tx,
      diffDays,
      totalTebus
    };

    if (diffDays <= 0) {
      overdueList.push(txPayload);
    } else if (diffDays <= 1) {
      h1List.push(txPayload);
    } else if (diffDays <= 3) {
      h3List.push(txPayload);
    }
  });

  return {
    h3List,
    h1List,
    overdueList,
    meta: {
      totalH3: h3List.length,
      totalH1: h1List.length,
      totalOverdue: overdueList.length,
      totalReminders: h3List.length + h1List.length + overdueList.length
    }
  };
};

module.exports = {
  getDueReminders
};
