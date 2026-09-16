const prisma = require('./config/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function seed() {
  try {
    console.log('Seeding database with full PawnHub demo dataset...');
    
    // 1. Create a default store
    let store = await prisma.store.findFirst();
    if (!store) {
      store = await prisma.store.create({
        data: {
          id: crypto.randomUUID(),
          name: 'PawnHub Cabang Sudirman',
          address: 'Jl. Jendral Sudirman No. 123, Jakarta Selatan',
          phone: '021-5551234',
          updatedAt: new Date()
        }
      });
      console.log('Default store created:', store.name);
    } else {
      console.log('Store already exists:', store.name);
    }

    // 2. Create default Admin settings
    let setting = await prisma.setting.findUnique({
      where: { storeId: store.id }
    });
    if (!setting) {
      setting = await prisma.setting.create({
        data: {
          id: crypto.randomUUID(),
          storeId: store.id,
          defaultInterestRate: 10.0,
          defaultAdminFee: 0,
          defaultDurationDays: 30,
          storeName: store.name,
          storeAddress: store.address,
          storePhone: store.phone,
          updatedAt: new Date()
        }
      });
      console.log('Default settings created for store:', store.name);
    }

    // 3. Create default users
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const hashedKasirPassword = await bcrypt.hash('kasir123', 10);

    const usersToCreate = [
      {
        username: 'admin',
        password: hashedAdminPassword,
        fullName: 'PawnHub Admin Manager',
        phone: '082288110375',
        role: 'ADMIN',
        storeId: store.id
      },
      {
        username: 'kasir',
        password: hashedKasirPassword,
        fullName: 'Siti Kasir',
        phone: '082288110375',
        role: 'KASIR',
        storeId: store.id
      }
    ];

    let adminUser = null;
    for (const u of usersToCreate) {
      let existing = await prisma.user.findUnique({
        where: { username: u.username }
      });
      if (!existing) {
        existing = await prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            username: u.username,
            password: u.password,
            fullName: u.fullName,
            role: u.role,
            storeId: u.storeId,
            updatedAt: new Date()
          }
        });
        console.log(`User created: ${existing.username} (${existing.role})`);
      } else {
        console.log(`User already exists: ${existing.username}`);
      }
      if (u.username === 'admin') adminUser = existing;
    }

    // 4. Create Sample Customers
    const customersData = [
      { nik: '3171011508900001', name: 'Budi Santoso', phone: '081234567890', address: 'Jl. Gatot Subroto No. 45, Jakarta', notes: 'Nasabah Reguler' },
      { nik: '3171022204850002', name: 'Siti Rahmawati', phone: '081987654321', address: 'Jl. Melawai Raya No. 12, Kebayoran Baru', notes: 'Nasabah VIP' },
      { nik: '3171031011920003', name: 'Agus Wijaya', phone: '085712345678', address: 'Jl. Palmerah Barat No. 88, Jakarta Barat', notes: 'Pemilik Toko HP' },
      { nik: '3171040506950004', name: 'Dewi Lestari', phone: '081399887766', address: 'Jl. Tebet Raya No. 34, Jakarta Selatan', notes: 'Nasabah Emas' },
      { nik: '3171051809980005', name: 'Hendra Pratama', phone: '082144556677', address: 'Jl. Pancoran No. 7, Jakarta Selatan', notes: 'Gadai Elektronik' }
    ];

    const customerMap = {};
    for (const c of customersData) {
      let cust = await prisma.customer.findUnique({ where: { nik: c.nik } });
      if (!cust) {
        cust = await prisma.customer.create({
          data: {
            id: crypto.randomUUID(),
            storeId: store.id,
            nik: c.nik,
            name: c.name,
            phone: c.phone,
            address: c.address,
            notes: c.notes,
            updatedAt: new Date()
          }
        });
        console.log(`Customer created: ${cust.name} (${cust.nik})`);
      }
      customerMap[c.name] = cust;
    }

    // 5. Create Sample Items
    const itemsData = [
      {
        customerName: 'Budi Santoso',
        name: 'Laptop ASUS ROG Strix G15',
        category: 'Elektronik',
        brand: 'ASUS',
        modelName: 'ROG Strix G15 G513',
        serialNumber: 'SN-ASUS-994821',
        color: 'Hitam',
        equipment: 'Unit, Charger Original, Dus',
        condition: 'Mulus 95%',
        estimatedValue: 12000000,
        pawnAmount: 7500000,
        description: 'Laptop gaming mulus no minus'
      },
      {
        customerName: 'Siti Rahmawati',
        name: 'iPhone 14 Pro 256GB Deep Purple',
        category: 'Elektronik',
        brand: 'Apple',
        modelName: 'iPhone 14 Pro',
        imei: '354892109847102',
        color: 'Deep Purple',
        equipment: 'Unit, Cable, Box Original',
        condition: 'Lecet Pemakaian Halus',
        estimatedValue: 14000000,
        pawnAmount: 9000000,
        description: 'Garansi resmi iBox aktif'
      },
      {
        customerName: 'Dewi Lestari',
        name: 'Kalung Emas 700 (15 Gram)',
        category: 'Emas & Logam Mulia',
        brand: 'Antam',
        modelName: 'Kalung Rantai 18K',
        color: 'Kuning Gold',
        condition: 'Sangat Baik',
        estimatedValue: 18000000,
        pawnAmount: 13500000,
        description: 'Disertai surat toko emas asli'
      },
      {
        customerName: 'Agus Wijaya',
        name: 'Samsung Galaxy S23 Ultra 512GB',
        category: 'Elektronik',
        brand: 'Samsung',
        modelName: 'SM-S918B',
        imei: '864201928374102',
        color: 'Phantom Black',
        equipment: 'Fullset Original',
        condition: 'Mulus Like New',
        estimatedValue: 15000000,
        pawnAmount: 10000000,
        description: 'S-Pen lengkap lancar'
      },
      {
        customerName: 'Hendra Pratama',
        name: 'Honda Vario 160 ABS (B9912UOR)',
        category: 'Kendaraan',
        brand: 'Honda',
        modelName: 'Vario 160',
        serialNumber: 'MH1KF7118NK004812',
        color: 'Matte Blue',
        equipment: 'BPKB + STNK Lengkap, 2 Kunci Remote',
        condition: 'Mesin Halus, Pajak Hidup',
        estimatedValue: 22000000,
        pawnAmount: 14000000,
        description: 'Bisa dipake harian kasir'
      }
    ];

    const itemMap = {};
    for (const itemDef of itemsData) {
      const cust = customerMap[itemDef.customerName];
      let existingItem = await prisma.item.findFirst({
        where: { customerId: cust.id, name: itemDef.name }
      });
      if (!existingItem) {
        existingItem = await prisma.item.create({
          data: {
            id: crypto.randomUUID(),
            customerId: cust.id,
            name: itemDef.name,
            category: itemDef.category,
            brand: itemDef.brand,
            modelName: itemDef.modelName,
            imei: itemDef.imei || null,
            serialNumber: itemDef.serialNumber || null,
            color: itemDef.color || null,
            equipment: itemDef.equipment || null,
            condition: itemDef.condition || null,
            estimatedValue: itemDef.estimatedValue,
            pawnAmount: itemDef.pawnAmount,
            description: itemDef.description,
            updatedAt: new Date()
          }
        });
        console.log(`Item created: ${existingItem.name} for ${cust.name}`);
      }
      itemMap[itemDef.name] = existingItem;
    }

    // 6. Create Sample Transactions if empty
    const txCount = await prisma.transaction.count({ where: { storeId: store.id } });
    if (txCount === 0) {
      console.log('Creating sample transactions and cash flows...');

      const now = new Date();
      const sampleTxSpecs = [
        {
          code: 'PH-20260715-0001',
          cust: customerMap['Budi Santoso'],
          item: itemMap['Laptop ASUS ROG Strix G15'],
          loan: 7500000,
          interestRate: 10.0,
          adminFee: 0,
          days: 30,
          status: 'AKTIF',
          daysAgo: 10
        },
        {
          code: 'PH-20260710-0002',
          cust: customerMap['Siti Rahmawati'],
          item: itemMap['iPhone 14 Pro 256GB Deep Purple'],
          loan: 9000000,
          interestRate: 10.0,
          adminFee: 0,
          days: 30,
          status: 'PERPANJANG',
          daysAgo: 20
        },
        {
          code: 'PH-20260620-0003',
          cust: customerMap['Dewi Lestari'],
          item: itemMap['Kalung Emas 700 (15 Gram)'],
          loan: 13500000,
          interestRate: 10.0,
          adminFee: 0,
          days: 30,
          status: 'LUNAS',
          daysAgo: 40
        },
        {
          code: 'PH-20260701-0004',
          cust: customerMap['Agus Wijaya'],
          item: itemMap['Samsung Galaxy S23 Ultra 512GB'],
          loan: 10000000,
          interestRate: 10.0,
          adminFee: 0,
          days: 15,
          status: 'JATUH_TEMPO',
          daysAgo: 25
        }
      ];

      for (const spec of sampleTxSpecs) {
        const startDate = new Date(now.getTime() - spec.daysAgo * 24 * 60 * 60 * 1000);
        const dueDate = new Date(startDate.getTime() + spec.days * 24 * 60 * 60 * 1000);
        const interestAmount = (spec.loan * spec.interestRate) / 100;

        const newTx = await prisma.transaction.create({
          data: {
            id: crypto.randomUUID(),
            transactionCode: spec.code,
            storeId: store.id,
            customerId: spec.cust.id,
            itemId: spec.item.id,
            userId: adminUser.id,
            loanAmount: spec.loan,
            interestRate: spec.interestRate,
            interestAmount,
            adminFee: spec.adminFee,
            durationDays: spec.days,
            startDate,
            dueDate,
            endDate: spec.status === 'LUNAS' ? now : null,
            status: spec.status,
            notes: `Sample transaction ${spec.code}`,
            updatedAt: new Date()
          }
        });

        // Cash flow payouts & admin fee
        await prisma.cashFlow.create({
          data: {
            id: crypto.randomUUID(),
            storeId: store.id,
            transactionId: newTx.id,
            type: 'OUT',
            amount: spec.loan,
            category: 'PINJAMAN_GADAI',
            description: `Pencairan Gadai ${spec.code} - ${spec.item.name}`,
            date: startDate,
            updatedAt: new Date()
          }
        });

        await prisma.cashFlow.create({
          data: {
            id: crypto.randomUUID(),
            storeId: store.id,
            transactionId: newTx.id,
            type: 'IN',
            amount: spec.adminFee,
            category: 'BIAYA_ADMIN',
            description: `Biaya Admin Gadai ${spec.code}`,
            date: startDate,
            updatedAt: new Date()
          }
        });

        if (spec.status === 'LUNAS') {
          const totalPayoff = spec.loan + interestAmount;
          await prisma.cashFlow.create({
            data: {
              id: crypto.randomUUID(),
              storeId: store.id,
              transactionId: newTx.id,
              type: 'IN',
              amount: totalPayoff,
              category: 'PENEBUSAN',
              description: `Pelunasan gadai ${spec.code} - ${spec.item.name}`,
              date: now,
              updatedAt: new Date()
            }
          });
        }
      }
      console.log('Sample transactions & cash flows created successfully!');
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
