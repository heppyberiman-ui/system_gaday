const prisma = require('./config/prisma');
const fs = require('fs');
const path = require('path');

async function clearData() {
  try {
    console.log('Clearing all application data from database...');

    // Delete in reverse order of foreign key dependencies
    const deletePayments = await prisma.payment.deleteMany({});
    console.log(`Deleted ${deletePayments.count} payments.`);

    const deleteCashFlows = await prisma.cashFlow.deleteMany({});
    console.log(`Deleted ${deleteCashFlows.count} cash flows.`);

    const deleteExpenses = await prisma.expense.deleteMany({});
    console.log(`Deleted ${deleteExpenses.count} expenses.`);

    const deleteTransactions = await prisma.transaction.deleteMany({});
    console.log(`Deleted ${deleteTransactions.count} transactions.`);

    const deleteItemPhotos = await prisma.itemPhoto.deleteMany({});
    console.log(`Deleted ${deleteItemPhotos.count} item photos.`);

    const deleteItems = await prisma.item.deleteMany({});
    console.log(`Deleted ${deleteItems.count} items.`);

    const deleteCustomers = await prisma.customer.deleteMany({});
    console.log(`Deleted ${deleteCustomers.count} customers.`);

    const deleteAuditLogs = await prisma.auditLog.deleteMany({});
    console.log(`Deleted ${deleteAuditLogs.count} audit logs.`);

    // Clear uploads folder files (excluding .gitkeep)
    const cleanDir = (dirPath) => {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file !== '.gitkeep') {
            const filePath = path.join(dirPath, file);
            try {
              if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
              }
            } catch (err) {
              console.error(`Could not delete file ${filePath}:`, err.message);
            }
          }
        }
      }
    };

    cleanDir(path.join(__dirname, 'uploads', 'barang'));
    cleanDir(path.join(__dirname, 'uploads', 'scan'));

    console.log('--- ALL DATA CLEARED SUCCESSFULLY ---');
  } catch (error) {
    console.error('Failed to clear data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  clearData();
}

module.exports = clearData;
