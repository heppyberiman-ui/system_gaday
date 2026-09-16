import React, { useEffect, useState } from 'react';
import api from '../services/api';
import PawnReceiptModal from '../components/PawnReceiptModal';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [customerItems, setCustomerItems] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });

  // Form modal states
  const [showModal, setShowModal] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [itemId, setItemId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('10.0');
  const [adminFee, setAdminFee] = useState('0');
  const [durationDays, setDurationDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Print Receipt modal states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPrintTx, setSelectedPrintTx] = useState(null);

  // Auction modal states
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [auctionTx, setAuctionTx] = useState(null);
  const [auctionSalePrice, setAuctionSalePrice] = useState('');
  const [auctionBuyerName, setAuctionBuyerName] = useState('');
  const [auctionNotes, setAuctionNotes] = useState('');
  const [auctionLoading, setAuctionLoading] = useState(false);
  const [auctionError, setAuctionError] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transactions', {
        params: { search, status, page, limit: 10 }
      });
      setTransactions(response.data.data.transactions);
      setMeta(response.data.data.meta);
      setError('');
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Gagal memuat riwayat transaksi gadai.');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaults = async () => {
    try {
      // Fetch default store configurations
      const settingsRes = await api.get('/settings');
      if (settingsRes.data.data) {
        const config = settingsRes.data.data;
        setInterestRate(String(config.defaultInterestRate));
        setAdminFee(String(config.defaultAdminFee));
        setDurationDays(config.defaultDurationDays);
      }

      // Fetch customers & items lists
      const [custRes, itemRes] = await Promise.all([
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/items', { params: { limit: 100 } })
      ]);

      setCustomers(custRes.data.data.customers);
      setAllItems(itemRes.data.data.items);
    } catch (err) {
      console.error('Error loading default form lists:', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, status]);

  useEffect(() => {
    if (showModal) {
      loadDefaults();
    }
  }, [showModal]);

  // Dynamically load items owned by selected customer
  useEffect(() => {
    if (customerId) {
      const filtered = allItems.filter(item => item.customerId === customerId);
      setCustomerItems(filtered);
      setItemId('');
    } else {
      setCustomerItems([]);
    }
  }, [customerId, allItems]);

  // Pre-fill loan amount when item is selected
  useEffect(() => {
    if (itemId) {
      const selectedItem = allItems.find(item => item.id === itemId);
      if (selectedItem) {
        setLoanAmount(String(parseFloat(selectedItem.pawnAmount)));
      }
    } else {
      setLoanAmount('');
    }
  }, [itemId, allItems]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleResetSearch = () => {
    setSearch('');
    setStatus('');
    setPage(1);
    setTimeout(() => {
      fetchTransactions();
    }, 0);
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    if (!customerId || !itemId || !loanAmount || !interestRate || !adminFee) {
      setFormError('Lengkapi semua field wajib formulir gadai.');
      return;
    }

    const parsedLoan = parseIndonesianAmount(loanAmount);
    const parsedAdmin = parseIndonesianAmount(adminFee);

    const selectedItem = allItems.find(item => item.id === itemId);
    if (selectedItem && parsedLoan > parseFloat(selectedItem.pawnAmount)) {
      setFormError(`Nilai pencairan melebihi batas nilai pinjaman maksimal barang (${formatRupiah(selectedItem.pawnAmount)})`);
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const res = await api.post('/transactions', {
        customerId,
        itemId,
        loanAmount: parsedLoan,
        interestRate: parseFloat(interestRate),
        adminFee: parsedAdmin,
        durationDays: parseInt(durationDays),
        notes
      });

      setShowModal(false);
      setPage(1);
      fetchTransactions();

      // Open print preview for newly created transaction
      if (res.data.data) {
        handleOpenPrintModal(res.data.data);
      }
    } catch (err) {
      console.error('Error creating transaction:', err);
      const errMsg = err.response?.data?.message || 'Gagal menyimpan transaksi gadai baru.';
      setFormError(errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenPrintModal = async (tx) => {
    if (!tx) return;
    try {
      if (tx.id) {
        const res = await api.get(`/transactions/${tx.id}`);
        const fullTx = res.data.data?.transaction || res.data.data || tx;
        setSelectedPrintTx(fullTx);
      } else {
        setSelectedPrintTx(tx);
      }
      setShowPrintModal(true);
    } catch (e) {
      console.error('Error fetching transaction detail:', e);
      setSelectedPrintTx(tx);
      setShowPrintModal(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!transactions.length) return;
    const exportData = transactions.map(t => ({
      KodeNota: t.transactionCode,
      Nasabah: t.customer?.name || '',
      Barang: t.item?.name || '',
      PinjamanPokok: t.loanAmount,
      Bunga: t.interestAmount,
      Admin: t.adminFee,
      Status: t.status,
      TanggalGadai: new Date(t.createdAt).toLocaleDateString('id-ID'),
      JatuhTempo: new Date(t.dueDate).toLocaleDateString('id-ID')
    }));
    const headers = Object.keys(exportData[0]).join(',');
    const rows = exportData.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi_gadai_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const formatWaNumber = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  const handleSendWaReminder = (tx) => {
    const num = formatWaNumber(tx.customer?.phone);
    const msg = `Yth. Bpk/Ibu ${tx.customer?.name}, kami dari PawnHub Cabang Sudirman menginfokan bahwa nota gadai ${tx.transactionCode} (${tx.item?.name}) dengan pinjaman ${formatRupiah(tx.loanAmount)} memiliki jatuh tempo pada ${new Date(tx.dueDate).toLocaleDateString('id-ID')}. Terima kasih.`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const formatRupiah = (val) => {
    if (val === undefined || val === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'AKTIF':
        return 'bg-primary-subtle text-primary border border-primary-subtle';
      case 'LUNAS':
        return 'bg-success-subtle text-success border border-success-subtle';
      case 'PERPANJANG':
        return 'bg-warning-subtle text-warning border border-warning-subtle';
      case 'JATUH_TEMPO':
        return 'bg-danger-subtle text-danger border border-danger-subtle';
      case 'DIJUAL':
        return 'bg-dark text-white border border-dark';
      default:
        return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
    }
  };

  const handleOpenAuctionModal = (tx) => {
    setAuctionTx(tx);
    const estSale = Math.round(parseFloat(tx.loanAmount || 0) * 1.15);
    setAuctionSalePrice(String(estSale));
    setAuctionBuyerName('');
    setAuctionNotes('');
    setAuctionError('');
    setShowAuctionModal(true);
  };

  const handleAuctionSubmit = async (e) => {
    e.preventDefault();
    const parsedSale = parseIndonesianAmount(auctionSalePrice);
    if (!parsedSale || parsedSale <= 0) {
      setAuctionError('Masukkan nominal harga jual lelang yang valid.');
      return;
    }

    setAuctionLoading(true);
    setAuctionError('');

    try {
      await api.put(`/transactions/${auctionTx.id}/auction`, {
        salePrice: parsedSale,
        buyerName: auctionBuyerName,
        notes: auctionNotes
      });

      setShowAuctionModal(false);
      fetchTransactions();
    } catch (err) {
      console.error('Error executing auction:', err);
      setAuctionError(err.response?.data?.message || 'Gagal mengeksekusi lelang barang sitaan.');
    } finally {
      setAuctionLoading(false);
    }
  };

  const parseIndonesianAmount = (input) => {
    if (!input) return 0;
    let str = String(input).toLowerCase().trim().replace(/\s+/g, '');
    
    if (str.endsWith('rb') || str.endsWith('k')) {
      const num = parseFloat(str.replace(/rb|k/g, '').replace(',', '.'));
      return isNaN(num) ? 0 : Math.round(num * 1000);
    }
    
    if (str.endsWith('jt') || str.endsWith('juta')) {
      const num = parseFloat(str.replace(/jt|juta/g, '').replace(',', '.'));
      return isNaN(num) ? 0 : Math.round(num * 1000000);
    }

    const cleaned = str.replace(/[^0-9]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;

    if (num > 0 && num <= 999) {
      return num * 1000;
    }

    return num;
  };

  const parsedLoanAmt = parseIndonesianAmount(loanAmount);
  const calcInterestAmount = (parsedLoanAmt * parseFloat(interestRate || 0)) / 100;
  const calcTotalRepay = parsedLoanAmt + calcInterestAmount;

  return (
    <div>
      {/* Hero Banner Header */}
      <div className="hero-banner-blue mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div>
          <h3 className="fw-bold mb-1 text-white d-flex align-items-center gap-2">
            <i className="bi bi-wallet2"></i> Transaksi Gadai (Pencairan)
          </h3>
          <p className="mb-0 text-white-50 small">Pencairan dana gadai baru, cetak surat perjanjian resmi, dan kelola masa tenor</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={handleExportCsv} className="btn btn-light text-dark fw-bold d-flex align-items-center gap-2 py-2 px-3 shadow-sm border-0">
            <i className="bi bi-file-earmark-excel-fill text-success fs-5"></i> Ekspor CSV
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-warning text-dark fw-bold d-flex align-items-center gap-2 shadow-sm py-2 px-3 border-0">
            <i className="bi bi-plus-circle-fill fs-5"></i> Pencairan Gadai Baru
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 mb-4 rounded-3 border-danger-subtle small" role="alert">
          <i className="bi bi-exclamation-triangle-fill"></i> {error}
        </div>
      )}

      {/* Filter Card */}
      <div className="card card-premium p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Cari berdasarkan kode nota gadai, nasabah, atau barang..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua Status Transaksi</option>
              <option value="AKTIF">AKTIF</option>
              <option value="PERPANJANG">PERPANJANG</option>
              <option value="JATUH_TEMPO">JATUH TEMPO (Ready Lelang)</option>
              <option value="DIJUAL">DIJUAL (Hasil Lelang)</option>
              <option value="LUNAS">LUNAS</option>
            </select>
          </div>
          <div className="col-12 col-md-3 d-flex gap-2">
            <button type="submit" className="btn btn-primary w-100 py-2">Filter</button>
            {(search || status) && (
              <button type="button" onClick={handleResetSearch} className="btn btn-light border py-2 text-muted px-3">
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Transactions List Card */}
      <div className="card card-premium p-4">
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <div className="text-muted fw-semibold">Memuat riwayat transaksi...</div>
          </div>
        ) : transactions.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle table-responsive-card mb-0">
                <thead className="table-light border-bottom">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Kode Nota</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Nasabah</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Barang Jaminan</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end">Pinjaman Pokok</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center">Status</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center">Jatuh Tempo</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center" style={{ width: '180px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isOverdue = tx.status === 'JATUH_TEMPO' || (tx.status !== 'LUNAS' && tx.status !== 'DIJUAL' && new Date() > new Date(tx.dueDate));
                    return (
                      <tr key={tx.id}>
                        <td className="px-3 py-3 fw-bold text-primary" data-label="Kode Nota">
                          {tx.transactionCode}
                        </td>
                        <td className="px-3 py-3 text-dark fw-semibold" data-label="Nasabah">
                          {tx.customer ? tx.customer.name : 'Unknown'}
                        </td>
                        <td className="px-3 py-3 text-muted" data-label="Barang Jaminan">
                          {tx.item ? (tx.item.brand ? `${tx.item.brand} ${tx.item.modelName || tx.item.name}` : tx.item.name) : 'Unknown'}
                        </td>
                        <td className="px-3 py-3 text-end fw-bold text-dark" data-label="Pinjaman Pokok">
                          {formatRupiah(tx.loanAmount)}
                        </td>
                        <td className="px-3 py-3 text-center" data-label="Status">
                          <span className={`badge px-2.5 py-1.5 rounded-3 fw-semibold ${getStatusBadge(tx.status)}`}>
                            {tx.status === 'DIJUAL' ? 'LELANG / DIJUAL' : tx.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-muted small" data-label="Jatuh Tempo">
                          {new Date(tx.dueDate).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-center" data-label="Aksi">
                          <div className="d-flex justify-content-center gap-1">
                            {isOverdue && tx.status !== 'DIJUAL' && (
                              <button 
                                onClick={() => handleOpenAuctionModal(tx)}
                                className="btn btn-warning text-dark btn-sm rounded-3 py-1 px-2 fw-bold"
                                title="Eksekusi Lelang Barang Sitaan"
                              >
                                <i className="bi bi-hammer me-1"></i> Lelang
                              </button>
                            )}
                            <button 
                              onClick={() => handleSendWaReminder(tx)}
                              className="btn btn-outline-success btn-sm rounded-3 py-1 px-2"
                              title="Kirim Pesan WhatsApp"
                            >
                              <i className="bi bi-whatsapp"></i>
                            </button>
                            <button 
                              onClick={() => handleOpenPrintModal(tx)} 
                              className="btn btn-outline-primary btn-sm rounded-3 py-1 px-2.5"
                              title="Cetak Surat Perjanjian Gadai / Struk"
                            >
                              <i className="bi bi-printer me-1"></i> Cetak
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <span className="text-muted small">
                  Menampilkan Halaman <strong>{meta.page}</strong> dari <strong>{meta.totalPages}</strong>
                </span>
                <nav>
                  <ul className="pagination pagination-sm mb-0 gap-1">
                    <li className={`page-item ${meta.page === 1 ? 'disabled' : ''}`}>
                      <button className="page-item btn btn-light btn-sm border" onClick={() => setPage(p => Math.max(p - 1, 1))}>
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: meta.totalPages }, (_, i) => (
                      <li key={i} className={`page-item ${meta.page === i + 1 ? 'active' : ''}`}>
                        <button className="page-link rounded-3 border px-3" onClick={() => setPage(i + 1)}>
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${meta.page === meta.totalPages ? 'disabled' : ''}`}>
                      <button className="page-item btn btn-light btn-sm border" onClick={() => setPage(p => Math.min(p + 1, meta.totalPages))}>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-5 my-3 text-muted">
            <i className="bi bi-wallet2 fs-1 d-block mb-3 text-muted"></i>
            <h5 className="fw-bold text-dark">Data Transaksi Kosong</h5>
            <p className="text-muted small">Belum ada transaksi gadai terdaftar dalam sistem.</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary mt-2">
              Cairkan Gadai Pertama <i className="bi bi-plus-lg ms-1"></i>
            </button>
          </div>
        )}
      </div>

      {/* Create Transaction Modal Overlay */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-wallet-fill text-primary"></i> Pencairan Gadai Baru (Disbursement)
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateTransaction}>
                <div className="modal-body p-4 overflow-auto" style={{ maxHeight: '70vh' }}>
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small">
                      <i className="bi bi-exclamation-triangle-fill"></i> {formError}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>1. Pilih Nasabah Pemilik</label>
                      <select 
                        className="form-select" 
                        value={customerId} 
                        onChange={(e) => setCustomerId(e.target.value)}
                      >
                        <option value="">-- Pilih Nasabah --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} - ({c.nik})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>2. Pilih Barang Jaminan Nasabah</label>
                      <select 
                        className="form-select" 
                        value={itemId} 
                        onChange={(e) => setItemId(e.target.value)}
                        disabled={!customerId}
                      >
                        <option value="">-- Pilih Barang --</option>
                        {customerItems.map((item) => (
                          <option key={item.id} value={item.id}>{item.name} (Max Pinjaman: {formatRupiah(item.pawnAmount)})</option>
                        ))}
                      </select>
                      {!customerId && (
                        <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>*Pilih nasabah terlebih dahulu untuk meload barang miliknya</div>
                      )}
                    </div>

                    <div className="col-12 border-top my-3"></div>

                    <div className="col-12 col-sm-6">
                      <div className="form-floating mb-1">
                        <input 
                          type="text" 
                          className="form-control fw-bold" 
                          id="loanAmountInput" 
                          placeholder="Jumlah Pinjaman" 
                          value={loanAmount} 
                          onChange={(e) => setLoanAmount(e.target.value)}
                        />
                        <label htmlFor="loanAmountInput">Uang Pinjaman (e.g. ketik 200 / 200rb / 1.5jt)</label>
                      </div>

                      {loanAmount && (
                        <div className="text-success fw-bold small mb-2 ms-1">
                          <i className="bi bi-check-circle-fill me-1"></i>
                          Terbaca: {formatRupiah(parseIndonesianAmount(loanAmount))}
                        </div>
                      )}

                      <div className="d-flex flex-wrap gap-1">
                        <span className="text-muted small me-1 align-self-center">Cepat:</span>
                        {['200000', '300000', '500000', '1000000', '1500000', '2000000'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${
                              String(parseIndonesianAmount(loanAmount)) === val
                                ? 'btn-success text-white'
                                : 'btn-outline-secondary text-dark bg-white'
                            }`}
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => setLoanAmount(val)}
                          >
                            {val === '200000' ? '200 rb' :
                             val === '300000' ? '300 rb' :
                             val === '500000' ? '500 rb' :
                             val === '1000000' ? '1 jt' :
                             val === '1500000' ? '1.5 jt' : '2 jt'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-12 col-sm-3">
                      <div className="form-floating mb-1">
                        <input 
                          type="number" 
                          step="0.1" 
                          className="form-control" 
                          id="interestInput" 
                          placeholder="Bunga%" 
                          value={interestRate} 
                          onChange={(e) => setInterestRate(e.target.value)}
                        />
                        <label htmlFor="interestInput">Bunga Bulanan (%)</label>
                      </div>
                      <div className="d-flex gap-1">
                        {['10', '15', '20'].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${
                              String(interestRate) === rate
                                ? 'btn-primary text-white'
                                : 'btn-outline-secondary text-dark bg-white'
                            }`}
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => setInterestRate(rate)}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-12 col-sm-3">
                      <div className="form-floating">
                        <input 
                          type="number" 
                          className="form-control" 
                          id="adminInput" 
                          placeholder="Biaya Admin" 
                          value={adminFee} 
                          onChange={(e) => setAdminFee(e.target.value)}
                        />
                        <label htmlFor="adminInput">Biaya Admin (Rp)</label>
                      </div>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>Durasi Pinjaman & Skema Bunga</label>
                      <select 
                        className="form-select py-3 fw-semibold" 
                        value={durationDays} 
                        onChange={(e) => {
                          const days = parseInt(e.target.value);
                          setDurationDays(days);
                          if (days <= 7) {
                            setInterestRate('10.0');
                          } else if (days <= 21) {
                            setInterestRate('15.0');
                          } else {
                            setInterestRate('20.0');
                          }
                        }}
                      >
                        <option value="7">7 Hari (1 Minggu) - Bunga 10%</option>
                        <option value="14">14 Hari (2 Minggu) - Bunga 15%</option>
                        <option value="21">21 Hari (3 Minggu) - Bunga 15%</option>
                        <option value="30">30 Hari (1 Bulan) - Bunga 20%</option>
                      </select>
                    </div>

                    <div className="col-12 col-sm-6">
                      <div className="form-floating" style={{ marginTop: '20px' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="notesInput" 
                          placeholder="Catatan" 
                          value={notes} 
                          onChange={(e) => setNotes(e.target.value)} 
                        />
                        <label htmlFor="notesInput">Catatan Transaksi</label>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="card bg-primary-subtle text-primary-emphasis border border-primary-subtle p-3 rounded-3">
                        <h6 className="fw-bold mb-2"><i className="bi bi-calculator me-1"></i> Rincian & Kalkulator Nota Gadai (Pencairan Full)</h6>
                        <div className="row g-2 small">
                          <div className="col-6 col-sm-3">Diterima Nasabah: <strong className="d-block text-success fw-bold">{formatRupiah(parsedLoanAmt)} (Full)</strong></div>
                          <div className="col-6 col-sm-3">Potongan Awal: <strong className="d-block text-muted">Rp 0 (Tanpa Potongan)</strong></div>
                          <div className="col-6 col-sm-3">Bunga Gadai ({interestRate}%): <strong className="d-block text-dark">{formatRupiah(calcInterestAmount)}</strong></div>
                          <div className="col-6 col-sm-3">Total Tebus Pelunasan: <strong className="d-block fs-6 text-primary fw-bold">{formatRupiah(calcTotalRepay)}</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary py-2 px-4 fw-bold" disabled={formLoading}>
                    {formLoading ? 'Memproses Pencairan...' : 'Cairkan Pinjaman'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Auction / Lelang Modal */}
      {showAuctionModal && auctionTx && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '540px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4 bg-warning bg-opacity-10" style={{ borderRadius: '1rem 1rem 0 0' }}>
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-hammer text-warning fs-4"></i> Eksekusi Lelang Barang Sitaan
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAuctionModal(false)}></button>
              </div>
              <form onSubmit={handleAuctionSubmit}>
                <div className="modal-body p-4">
                  {auctionError && (
                    <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i> {auctionError}
                    </div>
                  )}

                  {/* Summary Box */}
                  <div className="bg-light p-3 rounded-3 border mb-3 small">
                    <div className="row g-2">
                      <div className="col-6">
                        <span className="text-muted d-block">Kode Nota:</span>
                        <strong className="text-primary">{auctionTx.transactionCode}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted d-block">Nasabah Pemilik:</span>
                        <strong className="text-dark">{auctionTx.customer?.name || '-'}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted d-block">Barang Jaminan:</span>
                        <strong className="text-dark">{auctionTx.item?.brand ? `${auctionTx.item.brand} ${auctionTx.item.modelName || auctionTx.item.name}` : auctionTx.item?.name}</strong>
                      </div>
                      <div className="col-6">
                        <span className="text-muted d-block">Pinjaman Pokok Awal:</span>
                        <strong className="text-dark">{formatRupiah(auctionTx.loanAmount)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="form-floating mb-3">
                    <input 
                      type="text" 
                      className="form-control fw-bold fs-5 text-success" 
                      id="auctionSaleInput" 
                      placeholder="Harga Jual Lelang" 
                      value={auctionSalePrice} 
                      onChange={(e) => setAuctionSalePrice(e.target.value)}
                      required 
                    />
                    <label htmlFor="auctionSaleInput">Nominal Uang Penjualan Lelang (Rp)</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="auctionBuyerInput" 
                      placeholder="Nama Pembeli" 
                      value={auctionBuyerName} 
                      onChange={(e) => setAuctionBuyerName(e.target.value)} 
                    />
                    <label htmlFor="auctionBuyerInput">Nama Pembeli Lelang (Opsional / Umum)</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="auctionNotesInput" 
                      placeholder="Catatan" 
                      value={auctionNotes} 
                      onChange={(e) => setAuctionNotes(e.target.value)} 
                    />
                    <label htmlFor="auctionNotesInput">Catatan Tambahan Eksekusi Lelang</label>
                  </div>

                  {/* Realtime Profit/Loss Margin Box */}
                  {(() => {
                    const saleAmt = parseIndonesianAmount(auctionSalePrice);
                    const loanAmt = parseFloat(auctionTx.loanAmount || 0);
                    const margin = saleAmt - loanAmt;
                    return (
                      <div className={`p-3 rounded-3 border d-flex justify-content-between align-items-center ${margin >= 0 ? 'bg-success-subtle text-success border-success-subtle' : 'bg-danger-subtle text-danger border-danger-subtle'}`}>
                        <div>
                          <span className="d-block small font-semibold">Estimasi Margin Laba/Rugi Toko:</span>
                          <strong className="fs-6">{margin >= 0 ? `Keuntungan: +${formatRupiah(margin)}` : `Kerugian: ${formatRupiah(margin)}`}</strong>
                        </div>
                        <i className={`bi ${margin >= 0 ? 'bi-graph-up-arrow fs-3' : 'bi-graph-down-arrow fs-3'}`}></i>
                      </div>
                    );
                  })()}
                </div>

                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowAuctionModal(false)} disabled={auctionLoading}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-warning py-2 px-4 fw-bold text-dark shadow-sm" disabled={auctionLoading}>
                    {auctionLoading ? 'Memproses Lelang...' : 'Konfirmasi Lelang & Catat Uang Masuk'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <PawnReceiptModal 
        show={showPrintModal} 
        onClose={() => setShowPrintModal(false)} 
        transaction={selectedPrintTx} 
      />
    </div>
  );
};

export default Transactions;
