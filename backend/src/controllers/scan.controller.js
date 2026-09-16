const ocrService = require('../services/ocr.service');
const prisma = require('../config/prisma');
const fs = require('fs');

/**
 * Handle scan receipt request (POST /api/scan/surat)
 */
const scanSurat = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded. Please upload a pawn ticket image.'
    });
  }

  const filePath = req.file.path;

  try {
    const customApiKey = req.headers['x-gemini-key'] || req.headers['x-api-key'];
    const scanResult = await ocrService.scanReceipt(filePath, customApiKey);
    
    res.status(200).json({
      status: 'success',
      message: 'Pawn ticket scanned and processed successfully.',
      data: scanResult
    });
  } catch (error) {
    next(error);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`[FS Error] Failed to delete temporary scan file: ${filePath}`, err);
        }
      });
    }
  }
};

/**
 * Handle automatic import of scanned pawn ticket into Database
 * (POST /api/scan/import)
 */
const importScannedTransaction = async (req, res, next) => {
  try {
    const {
      nik,
      name,
      phone,
      address,
      itemName,
      category,
      brand,
      modelName,
      loanAmount,
      interestRate = 10.0,
      adminFee = 0,
      durationDays = 30,
      transactionCode,
      notes
    } = req.body;

    if (!name || !itemName || !loanAmount) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama Nasabah, Nama Barang, dan Uang Pinjaman wajib diisi.'
      });
    }

    const userStoreId = req.user?.storeId;
    if (!userStoreId) {
      // Find fallback store
      const firstStore = await prisma.store.findFirst();
      if (!firstStore) {
        return res.status(400).json({ status: 'error', message: 'Tidak ada toko terdaftar dalam database.' });
      }
      req.userStoreId = firstStore.id;
    } else {
      req.userStoreId = userStoreId;
    }

    const storeId = req.userStoreId;

    // 1. Find existing customer by NIK or Phone, or create new Customer
    let customer = null;
    if (nik) {
      customer = await prisma.customer.findFirst({
        where: { storeId, nik }
      });
    }
    if (!customer && phone) {
      customer = await prisma.customer.findFirst({
        where: { storeId, phone }
      });
    }

    if (!customer) {
      const generatedNik = nik && nik.length === 16 ? nik : `${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;
      customer = await prisma.customer.create({
        data: {
          storeId,
          name,
          nik: generatedNik,
          phone: phone || '081234567890',
          address: address || 'Alamat Belum Diisi',
          notes: 'Diimpor otomatis dari Smart Scan OCR Nota'
        }
      });
    }

    // 2. Create Collateral Item under Customer
    const item = await prisma.item.create({
      data: {
        customerId: customer.id,
        name: itemName,
        category: category || 'Elektronik',
        brand: brand || '',
        modelName: modelName || '',
        estimatedValue: parseFloat(loanAmount) * 1.3,
        pawnAmount: parseFloat(loanAmount),
        condition: 'Baik',
        description: 'Barang jaminan dari scan nota fisik'
      }
    });

    // 3. Calculate financial dates & amounts
    const parsedLoan = parseFloat(loanAmount);
    const parsedRate = parseFloat(interestRate);
    const parsedAdmin = parseFloat(adminFee);
    const parsedDuration = parseInt(durationDays);
    const interestAmount = (parsedLoan * parsedRate) / 100;

    const startDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parsedDuration);

    let generatedCode = transactionCode ? (transactionCode.startsWith('PH-') ? transactionCode : `PH-${transactionCode}`) : `PH-${Date.now()}`;
    const existingTx = await prisma.transaction.findUnique({ where: { transactionCode: generatedCode } });
    if (existingTx) {
      generatedCode = `${generatedCode}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // 4. Create Transaction Record
    const transaction = await prisma.transaction.create({
      data: {
        storeId,
        userId: req.user.id,
        customerId: customer.id,
        itemId: item.id,
        transactionCode: generatedCode,
        loanAmount: parsedLoan,
        interestRate: parsedRate,
        interestAmount,
        adminFee: parsedAdmin,
        durationDays: parsedDuration,
        startDate,
        dueDate,
        status: 'AKTIF',
        notes: notes || 'Pencairan hasil pindaian OCR nota'
      },
      include: {
        customer: true,
        item: true
      }
    });

    // 5. Log Cash Outflow
    await prisma.cashFlow.create({
      data: {
        storeId,
        type: 'OUT',
        amount: parsedLoan,
        category: 'PINJAMAN_GADAI',
        description: `Pencairan pinjaman gadai via Smart Scan (${generatedCode}) - ${name}`,
        transactionId: transaction.id,
        date: new Date()
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Transaksi dan Data Nasabah berhasil disimpan otomatis ke database!',
      data: {
        customer,
        item,
        transaction
      }
    });
  } catch (error) {
    console.error('Import Scanned Transaction error:', error);
    next(error);
  }
};

module.exports = {
  scanSurat,
  importScannedTransaction
};
