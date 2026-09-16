const prisma = require('../config/prisma');
const crypto = require('crypto');

/**
 * Fetch or initialize setting record for a store
 * @param {Object} user 
 */
const getSettings = async (user) => {
  // Determine storeId
  let storeId = user.storeId;
  if (!storeId && user.role === 'SUPER_ADMIN') {
    // If super admin has no store, fetch the first available store
    const firstStore = await prisma.store.findFirst();
    if (firstStore) {
      storeId = firstStore.id;
    }
  }

  if (!storeId) {
    // Fallback default config if no stores exist yet
    return {
      defaultInterestRate: 10.0,
      defaultAdminFee: 0,
      defaultDurationDays: 30,
      storeName: 'PawnHub Central Store',
      storeAddress: 'Central Street No. 42',
      storePhone: '081234567890'
    };
  }

  // Look up setting for this storeId
  let setting = await prisma.setting.findUnique({
    where: { storeId }
  });

  // Lazy initialize settings if it doesn't exist yet
  if (!setting) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    setting = await prisma.setting.create({
      data: {
        id: crypto.randomUUID(),
        storeId,
        defaultInterestRate: 10.0,
        defaultAdminFee: 0,
        defaultDurationDays: 30,
        storeName: store ? store.name : 'PawnHub Store',
        storeAddress: store ? store.address : 'Store Address',
        storePhone: store ? store.phone : 'Store Phone',
        updatedAt: new Date()
      }
    });
  }

  return {
    ...setting,
    defaultInterestRate: parseFloat(setting.defaultInterestRate),
    defaultAdminFee: parseFloat(setting.defaultAdminFee)
  };
};

/**
 * Update store setting configurations
 * @param {Object} data 
 * @param {Object} user 
 */
const updateSettings = async (data, user) => {
  const { defaultInterestRate, defaultAdminFee, defaultDurationDays, storeName, storeAddress, storePhone, storePhotoPath, termsConditions, waGatewayToken, storeId: targetStoreId } = data;

  let storeId = user.role === 'SUPER_ADMIN' ? targetStoreId || user.storeId : user.storeId;
  if (!storeId && user.role === 'SUPER_ADMIN') {
    const firstStore = await prisma.store.findFirst();
    if (firstStore) storeId = firstStore.id;
  }

  if (!storeId) {
    const error = new Error('No store associated with this request');
    error.statusCode = 400;
    throw error;
  }

  // Upsert settings config
  const existingSetting = await prisma.setting.findUnique({ where: { storeId } });

  let updatedSetting;
  const updateFields = {
    defaultInterestRate: defaultInterestRate !== undefined ? parseFloat(defaultInterestRate) : undefined,
    defaultAdminFee: defaultAdminFee !== undefined ? parseFloat(defaultAdminFee) : undefined,
    defaultDurationDays: defaultDurationDays !== undefined ? parseInt(defaultDurationDays) : undefined,
    storeName,
    storeAddress,
    storePhone,
    storePhotoPath: storePhotoPath !== undefined ? storePhotoPath : undefined,
    termsConditions: termsConditions !== undefined ? termsConditions : undefined,
    waGatewayToken: waGatewayToken !== undefined ? waGatewayToken : undefined,
    updatedAt: new Date()
  };

  if (existingSetting) {
    updatedSetting = await prisma.setting.update({
      where: { storeId },
      data: updateFields
    });
  } else {
    updatedSetting = await prisma.setting.create({
      data: {
        id: crypto.randomUUID(),
        storeId,
        defaultInterestRate: defaultInterestRate !== undefined ? parseFloat(defaultInterestRate) : 10.0,
        defaultAdminFee: defaultAdminFee !== undefined ? parseFloat(defaultAdminFee) : 0,
        defaultDurationDays: defaultDurationDays !== undefined ? parseInt(defaultDurationDays) : 30,
        storeName: storeName || 'PawnHub Store',
        storeAddress: storeAddress || 'Store Address',
        storePhone: storePhone || 'Store Phone',
        storePhotoPath: storePhotoPath || null,
        termsConditions: termsConditions || null,
        waGatewayToken: waGatewayToken || null,
        updatedAt: new Date()
      }
    });
  }

  return {
    ...updatedSetting,
    defaultInterestRate: parseFloat(updatedSetting.defaultInterestRate),
    defaultAdminFee: parseFloat(updatedSetting.defaultAdminFee)
  };
};

/**
 * Clear all transactional and customer data from database
 */
const clearAllData = async () => {
  const clearDataScript = require('../clear-data');
  await clearDataScript();
  return { message: 'Seluruh data transaksi dan nasabah berhasil dihapus.' };
};

/**
 * Export full JSON database backup
 */
const exportBackup = async () => {
  const stores = await prisma.store.findMany();
  const users = await prisma.user.findMany();
  const customers = await prisma.customer.findMany();
  const items = await prisma.item.findMany();
  const itemPhotos = await prisma.itemPhoto.findMany();
  const transactions = await prisma.transaction.findMany();
  const payments = await prisma.payment.findMany();
  const cashFlows = await prisma.cashFlow.findMany();
  const expenses = await prisma.expense.findMany();
  const settings = await prisma.setting.findMany();
  const auditLogs = await prisma.auditLog.findMany();

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      stores,
      users,
      customers,
      items,
      itemPhotos,
      transactions,
      payments,
      cashFlows,
      expenses,
      settings,
      auditLogs
    }
  };
};

/**
 * Import full JSON database restore
 */
const importRestore = async (backupPayload) => {
  if (!backupPayload || !backupPayload.data) {
    const error = new Error('File backup JSON tidak valid atau format data rusak.');
    error.statusCode = 400;
    throw error;
  }

  const { stores, users, customers, items, itemPhotos, transactions, payments, cashFlows, expenses, settings, auditLogs } = backupPayload.data;

  // Execute restore within prisma transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing records in dependency order
    await tx.auditLog.deleteMany({});
    await tx.cashFlow.deleteMany({});
    await tx.payment.deleteMany({});
    await tx.expense.deleteMany({});
    await tx.transaction.deleteMany({});
    await tx.itemPhoto.deleteMany({});
    await tx.item.deleteMany({});
    await tx.customer.deleteMany({});
    await tx.setting.deleteMany({});
    await tx.user.deleteMany({});
    await tx.store.deleteMany({});

    // Re-insert data
    if (stores?.length) {
      await tx.store.createMany({
        data: stores.map(s => ({
          ...s,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
        }))
      });
    }

    if (users?.length) {
      await tx.user.createMany({
        data: users.map(u => ({
          ...u,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
        }))
      });
    }

    if (settings?.length) {
      await tx.setting.createMany({
        data: settings.map(st => ({
          ...st,
          createdAt: st.createdAt ? new Date(st.createdAt) : new Date(),
          updatedAt: st.updatedAt ? new Date(st.updatedAt) : new Date()
        }))
      });
    }

    if (customers?.length) {
      await tx.customer.createMany({
        data: customers.map(c => ({
          ...c,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date()
        }))
      });
    }

    if (items?.length) {
      await tx.item.createMany({
        data: items.map(i => ({
          ...i,
          createdAt: i.createdAt ? new Date(i.createdAt) : new Date(),
          updatedAt: i.updatedAt ? new Date(i.updatedAt) : new Date()
        }))
      });
    }

    if (itemPhotos?.length) {
      await tx.itemPhoto.createMany({
        data: itemPhotos.map(ip => ({
          ...ip,
          createdAt: ip.createdAt ? new Date(ip.createdAt) : new Date()
        }))
      });
    }

    if (transactions?.length) {
      await tx.transaction.createMany({
        data: transactions.map(t => ({
          ...t,
          startDate: t.startDate ? new Date(t.startDate) : new Date(),
          dueDate: t.dueDate ? new Date(t.dueDate) : new Date(),
          endDate: t.endDate ? new Date(t.endDate) : null,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date()
        }))
      });
    }

    if (payments?.length) {
      await tx.payment.createMany({
        data: payments.map(p => ({
          ...p,
          paymentDate: p.paymentDate ? new Date(p.paymentDate) : new Date(),
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
        }))
      });
    }

    if (cashFlows?.length) {
      await tx.cashFlow.createMany({
        data: cashFlows.map(cf => ({
          ...cf,
          date: cf.date ? new Date(cf.date) : new Date(),
          createdAt: cf.createdAt ? new Date(cf.createdAt) : new Date(),
          updatedAt: cf.updatedAt ? new Date(cf.updatedAt) : new Date()
        }))
      });
    }

    if (expenses?.length) {
      await tx.expense.createMany({
        data: expenses.map(e => ({
          ...e,
          date: e.date ? new Date(e.date) : new Date(),
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date()
        }))
      });
    }

    if (auditLogs?.length) {
      await tx.auditLog.createMany({
        data: auditLogs.map(a => ({
          ...a,
          createdAt: a.createdAt ? new Date(a.createdAt) : new Date()
        }))
      });
    }
  });

  return { message: 'Database system berhasil di-restore secara utuh dari file backup.' };
};

module.exports = {
  getSettings,
  updateSettings,
  clearAllData,
  exportBackup,
  importRestore
};
