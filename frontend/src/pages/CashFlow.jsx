import React, { useEffect, useState } from 'react';
import api from '../services/api';

const CashFlow = () => {
  const [cashFlows, setCashFlows] = useState([]);
  const [summary, setSummary] = useState({ 
    totalIn: 0, 
    totalOut: 0, 
    balance: 0, 
    count: 0,
    breakdownIn: {}, 
    breakdownOut: {} 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Period / Date filter states (Default: 'today' for daily closing/pembukuan harian)
  const [period, setPeriod] = useState('today');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // Filtering states
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });

  // Expense form states
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [expCategory, setExpCategory] = useState('ATK');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Daily Closing Print Modal
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');

  // Calculate Start & End Date based on active period
  const getDateRange = () => {
    const now = new Date();
    if (period === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { 
        startDate: start.toISOString(), 
        endDate: end.toISOString(), 
        label: `Hari Ini (${now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})` 
      };
    }
    if (period === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      return { 
        startDate: start.toISOString(), 
        endDate: end.toISOString(), 
        label: `Kemarin (${yesterday.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})` 
      };
    }
    if (period === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { 
        startDate: start.toISOString(), 
        endDate: end.toISOString(), 
        label: `Bulan ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` 
      };
    }
    if (period === 'custom' && customDate) {
      const [y, m, d] = customDate.split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      return { 
        startDate: start.toISOString(), 
        endDate: end.toISOString(), 
        label: `Tanggal ${start.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` 
      };
    }
    return { startDate: '', endDate: '', label: 'Semua Waktu (Keseluruhan)' };
  };

  const currentRange = getDateRange();

  const fetchData = async () => {
    setLoading(true);
    try {
      const range = getDateRange();
      const paramsSummary = {};
      const paramsLogs = { type, category, page, limit: 15 };

      if (range.startDate) {
        paramsSummary.startDate = range.startDate;
        paramsLogs.startDate = range.startDate;
      }
      if (range.endDate) {
        paramsSummary.endDate = range.endDate;
        paramsLogs.endDate = range.endDate;
      }

      const [sumRes, logsRes] = await Promise.all([
        api.get('/cashflows/summary', { params: paramsSummary }),
        api.get('/cashflows', { params: paramsLogs })
      ]);

      setSummary(sumRes.data.data);
      setCashFlows(logsRes.data.data.cashFlows);
      setMeta(logsRes.data.data.meta);
      setError('');
    } catch (err) {
      console.error('Error fetching cash flow data:', err);
      setError('Gagal memuat catatan transaksi kas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, type, category, period, customDate]);

  const handleOpenModal = () => {
    setAmount('');
    setExpCategory('ATK');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setFormError('');
    setShowModal(true);
  };

  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !expCategory || !description) {
      setFormError('Lengkapi semua field wajib pengeluaran operasional.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const savedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
      const storeId = savedUser ? savedUser.storeId : null;

      await api.post('/cashflows/expense', {
        amount: parseFloat(amount),
        category: expCategory,
        description,
        date,
        storeId
      });

      setShowModal(false);
      setPage(1);
      fetchData();
    } catch (err) {
      console.error('Error creating operational expense:', err);
      const errMsg = err.response?.data?.message || 'Gagal menyimpan pengeluaran.';
      setFormError(errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const formatRupiah = (val) => {
    if (val === undefined || val === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handleExportCsv = () => {
    if (!cashFlows.length) return;
    const exportData = cashFlows.map(cf => ({
      Tanggal: new Date(cf.date).toLocaleDateString('id-ID'),
      Jam: new Date(cf.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      Kategori: cf.category,
      Deskripsi: cf.description,
      Tipe: cf.type,
      Jumlah: cf.amount
    }));
    const headers = Object.keys(exportData[0]).join(',');
    const rows = exportData.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pembukuan_kas_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handlePrintClosing = () => {
    window.print();
  };

  const savedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-wallet2 text-primary"></i> Pembukuan & Arus Kas
          </h3>
          <p className="text-muted mb-0 small">
            Pantau uang masuk & keluar harian secara presisi untuk mempermudah tutup buku dan rekonsiliasi kas harian
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button 
            onClick={() => setShowClosingModal(true)} 
            className="btn btn-primary d-flex align-items-center gap-2 py-2 px-3 shadow-sm fw-semibold"
          >
            <i className="bi bi-receipt-cutoff"></i> Cetak Tutup Buku Harian
          </button>
          <button onClick={handleExportCsv} className="btn btn-outline-success d-flex align-items-center gap-2 py-2 px-3">
            <i className="bi bi-file-earmark-excel-fill"></i> Ekspor CSV
          </button>
          <button onClick={handleOpenModal} className="btn btn-danger d-flex align-items-center gap-2 shadow-sm py-2 px-3 fw-semibold">
            <i className="bi bi-dash-circle-fill"></i> Catat Biaya Operasional
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 mb-4 rounded-3 border-danger-subtle small">
          <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
        </div>
      )}

      {/* Period Filter Card (Pembukuan Harian Selector) */}
      <div className="card card-premium p-3 mb-4 border-0 shadow-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="fw-bold text-dark small me-1">
              <i className="bi bi-calendar-range-fill text-primary me-1"></i> Periode Kas:
            </span>
            <button 
              type="button" 
              onClick={() => { setPeriod('today'); setPage(1); }} 
              className={`btn btn-sm px-3 py-1.5 rounded-pill fw-bold ${period === 'today' ? 'btn-primary shadow-sm' : 'btn-outline-secondary bg-white'}`}
            >
              ☀️ Hari Ini
            </button>
            <button 
              type="button" 
              onClick={() => { setPeriod('yesterday'); setPage(1); }} 
              className={`btn btn-sm px-3 py-1.5 rounded-pill fw-bold ${period === 'yesterday' ? 'btn-primary shadow-sm' : 'btn-outline-secondary bg-white'}`}
            >
              ⏪ Kemarin
            </button>
            <button 
              type="button" 
              onClick={() => { setPeriod('thisMonth'); setPage(1); }} 
              className={`btn btn-sm px-3 py-1.5 rounded-pill fw-bold ${period === 'thisMonth' ? 'btn-primary shadow-sm' : 'btn-outline-secondary bg-white'}`}
            >
              📅 Bulan Ini
            </button>
            <button 
              type="button" 
              onClick={() => { setPeriod('custom'); setPage(1); }} 
              className={`btn btn-sm px-3 py-1.5 rounded-pill fw-bold ${period === 'custom' ? 'btn-primary shadow-sm' : 'btn-outline-secondary bg-white'}`}
            >
              🔍 Pilih Tanggal
            </button>
            <button 
              type="button" 
              onClick={() => { setPeriod('all'); setPage(1); }} 
              className={`btn btn-sm px-3 py-1.5 rounded-pill fw-bold ${period === 'all' ? 'btn-dark shadow-sm' : 'btn-outline-secondary bg-white'}`}
            >
              🌐 Semua Waktu
            </button>
          </div>

          {period === 'custom' && (
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-semibold">Tanggal:</span>
              <input 
                type="date" 
                className="form-control form-control-sm bg-white border-primary" 
                value={customDate} 
                onChange={(e) => { setCustomDate(e.target.value); setPage(1); }}
                style={{ width: '160px' }}
              />
            </div>
          )}

          <div className="text-muted small fw-semibold">
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1.5 rounded-pill">
              {currentRange.label}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards Row (Reflects Active Period) */}
      <div className="row g-3 mb-4">
        {/* Total Inflow */}
        <div className="col-12 col-md-4">
          <div className="card card-premium p-4 border-start border-4 border-success h-100 shadow-sm">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span className="text-muted small fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  Uang Masuk ({period === 'today' ? 'Hari Ini' : period === 'yesterday' ? 'Kemarin' : 'Periode Ini'})
                </span>
                <h3 className="fw-bold text-success mt-1 mb-0">{formatRupiah(summary.totalIn)}</h3>
              </div>
              <div className="bg-success-subtle text-success rounded-circle p-2.5 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                <i className="bi bi-arrow-down-left-circle-fill fs-4"></i>
              </div>
            </div>
            <div className="mt-3 pt-2 border-top border-light-subtle small text-muted">
              <div className="d-flex justify-content-between mb-1">
                <span>Pelunasan / Tebusan:</span>
                <span className="fw-semibold text-dark">{formatRupiah(summary.breakdownIn?.PENEBUSAN || 0)}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span>Bunga Perpanjangan:</span>
                <span className="fw-semibold text-dark">{formatRupiah(summary.breakdownIn?.PERPANJANGAN || 0)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Biaya Administrasi:</span>
                <span className="fw-semibold text-dark">{formatRupiah(summary.breakdownIn?.BIAYA_ADMIN || 0)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Total Outflow */}
        <div className="col-12 col-md-4">
          <div className="card card-premium p-4 border-start border-4 border-danger h-100 shadow-sm">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span className="text-muted small fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  Uang Keluar ({period === 'today' ? 'Hari Ini' : period === 'yesterday' ? 'Kemarin' : 'Periode Ini'})
                </span>
                <h3 className="fw-bold text-danger mt-1 mb-0">{formatRupiah(summary.totalOut)}</h3>
              </div>
              <div className="bg-danger-subtle text-danger rounded-circle p-2.5 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                <i className="bi bi-arrow-up-right-circle-fill fs-4"></i>
              </div>
            </div>
            <div className="mt-3 pt-2 border-top border-light-subtle small text-muted">
              <div className="d-flex justify-content-between mb-1">
                <span>Pencairan Pinjaman:</span>
                <span className="fw-semibold text-dark">{formatRupiah(summary.breakdownOut?.PINJAMAN_GADAI || 0)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Biaya Operasional Toko:</span>
                <span className="fw-semibold text-dark">{formatRupiah(summary.breakdownOut?.PENGELUARAN_OPERASIONAL || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Cash Balance */}
        <div className="col-12 col-md-4">
          <div className={`card card-premium p-4 border-start border-4 ${summary.balance >= 0 ? 'border-primary' : 'border-danger'} h-100 shadow-sm`}>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span className="text-muted small fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>
                  Saldo Kas Bersih ({period === 'today' ? 'Hari Ini' : period === 'yesterday' ? 'Kemarin' : 'Periode Ini'})
                </span>
                <h3 className={`fw-bold mt-1 mb-0 ${summary.balance >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {formatRupiah(summary.balance)}
                </h3>
              </div>
              <div className={`${summary.balance >= 0 ? 'bg-primary-subtle text-primary' : 'bg-danger-subtle text-danger'} rounded-circle p-2.5 d-flex align-items-center justify-content-center`} style={{ width: '45px', height: '45px' }}>
                <i className="bi bi-cash-stack fs-4"></i>
              </div>
            </div>
            <div className="mt-3 pt-2 border-top border-light-subtle small text-muted">
              <div className="d-flex justify-content-between mb-1">
                <span>Status Kas:</span>
                <span className={`badge ${summary.balance >= 0 ? 'bg-success' : 'bg-danger'} rounded-pill`}>
                  {summary.balance >= 0 ? 'Surplus (Kas Masuk > Keluar)' : 'Defisit (Pencairan > Kas Masuk)'}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Total Aktivitas:</span>
                <span className="fw-semibold text-dark">{summary.count || 0} Mutasi Transaksi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card for Category & Type */}
      <div className="card card-premium p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <select className="form-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="">Semua Tipe Kas (IN & OUT)</option>
              <option value="IN">Hanya Kas Masuk (+)</option>
              <option value="OUT">Hanya Kas Keluar (-)</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <select className="form-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              <option value="">Semua Kategori Mutasi</option>
              <option value="PINJAMAN_GADAI">Pencairan Pinjaman Gadai</option>
              <option value="BIAYA_ADMIN">Biaya Admin</option>
              <option value="PENEBUSAN">Pelunasan Penebusan</option>
              <option value="PERPANJANGAN">Bunga Perpanjangan Tempo</option>
              <option value="PENGELUARAN_OPERASIONAL">Pengeluaran Operasional Toko</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            {(type || category) && (
              <button onClick={() => { setType(''); setCategory(''); setPage(1); }} className="btn btn-light border w-100 py-2 text-muted">
                <i className="bi bi-x-circle me-1"></i> Reset Filter Kategori
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="card card-premium p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold text-dark mb-0">Rincian Buku Kas {currentRange.label}</h5>
          <span className="badge bg-light text-dark border px-3 py-1.5 rounded-pill">
            Total {meta.total || 0} Catatan
          </span>
        </div>

        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <div className="text-muted fw-semibold">Memuat catatan mutasi kas...</div>
          </div>
        ) : cashFlows.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle table-responsive-card mb-0">
                <thead className="table-light border-bottom">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold" style={{ width: '160px' }}>Waktu</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold" style={{ width: '170px' }}>Kategori</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Keterangan Deskripsi</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center" style={{ width: '90px' }}>Tipe</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end" style={{ width: '180px' }}>Jumlah Kas</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlows.map((cf) => (
                    <tr key={cf.id}>
                      <td className="px-3 py-3 text-muted small" data-label="Waktu">
                        <div className="fw-semibold text-dark">{new Date(cf.date).toLocaleDateString('id-ID')}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-clock me-1"></i>
                          {new Date(cf.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </div>
                      </td>
                      <td className="px-3 py-3" data-label="Kategori">
                        <span className="badge bg-light text-dark border px-2.5 py-1.5 rounded-3 fw-medium">{cf.category}</span>
                      </td>
                      <td className="px-3 py-3 text-dark fw-medium" data-label="Keterangan Deskripsi">
                        {cf.description}
                        {cf.transaction?.transactionCode && (
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle ms-2">
                            {cf.transaction.transactionCode}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center" data-label="Tipe">
                        <span className={`badge rounded-3 px-2 py-1 ${cf.type === 'IN' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'}`}>
                          {cf.type}
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-end fw-bold ${cf.type === 'IN' ? 'text-success' : 'text-danger'}`} data-label="Jumlah Kas">
                        {cf.type === 'IN' ? '+' : '-'}{formatRupiah(cf.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
            <i className="bi bi-inbox fs-1 d-block mb-3 text-muted"></i>
            <h5 className="fw-bold text-dark">Tidak Ada Mutasi Kas untuk {currentRange.label}</h5>
            <p className="text-muted small">Belum ada transaksi pencairan gadai, tebusan, maupun biaya operasional yang tercatat.</p>
          </div>
        )}
      </div>

      {/* Modal Cetak Tutup Buku Kas Harian */}
      {showClosingModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg my-4">
            <div className="modal-content border-0 shadow-2xl" style={{ borderRadius: '1.25rem' }}>
              <div className="modal-header border-bottom py-3 px-4 bg-primary text-white" style={{ borderRadius: '1.25rem 1.25rem 0 0' }}>
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-journal-bookmark-fill"></i> Berita Acara & Pembukuan Tutup Kas Harian
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowClosingModal(false)}></button>
              </div>

              <div className="modal-body p-4" id="dailyClosingPrintable">
                {/* Print Sheet Header */}
                <div className="text-center pb-3 mb-3 border-bottom">
                  <h4 className="fw-bold text-dark mb-1">BELVIN88 CELLULAR & GADAI</h4>
                  <p className="text-muted mb-1 small">Jl. Jendral Sudirman No. 123 • Telp: 0822-8811-0375</p>
                  <div className="badge bg-dark text-white px-3 py-1.5 rounded-pill fs-7">
                    LEMBAR TUTUP BUKU & REKONSILIASI KAS LACI
                  </div>
                </div>

                <div className="row g-2 mb-3 small">
                  <div className="col-6">
                    <span className="text-muted">Periode Tanggal:</span>
                    <div className="fw-bold text-dark">{currentRange.label}</div>
                  </div>
                  <div className="col-6 text-end">
                    <span className="text-muted">Petugas Kasir / Operator:</span>
                    <div className="fw-bold text-dark">{savedUser?.fullName || 'Petugas Kasir'}</div>
                  </div>
                </div>

                {/* Table Rekap Tutup Buku */}
                <div className="table-responsive mb-3">
                  <table className="table table-bordered border-secondary-subtle align-middle small">
                    <thead className="table-light">
                      <tr>
                        <th className="py-2">Pos Rekapitulasi Kas</th>
                        <th className="py-2 text-center" style={{ width: '120px' }}>Tipe</th>
                        <th className="py-2 text-end" style={{ width: '200px' }}>Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>1. UANG KAS MASUK (INFLOW)</strong></td>
                        <td className="text-center"><span className="badge bg-success text-white">MASUK</span></td>
                        <td className="text-end fw-bold text-success">+{formatRupiah(summary.totalIn)}</td>
                      </tr>
                      <tr>
                        <td className="ps-4 text-muted">• Penerimaan Pelunasan / Tebusan</td>
                        <td></td>
                        <td className="text-end text-muted">{formatRupiah(summary.breakdownIn?.PENEBUSAN || 0)}</td>
                      </tr>
                      <tr>
                        <td className="ps-4 text-muted">• Penerimaan Bunga Perpanjangan</td>
                        <td></td>
                        <td className="text-end text-muted">{formatRupiah(summary.breakdownIn?.PERPANJANGAN || 0)}</td>
                      </tr>
                      <tr>
                        <td className="ps-4 text-muted">• Penerimaan Biaya Administrasi</td>
                        <td></td>
                        <td className="text-end text-muted">{formatRupiah(summary.breakdownIn?.BIAYA_ADMIN || 0)}</td>
                      </tr>

                      <tr>
                        <td><strong>2. UANG KAS KELUAR (OUTFLOW)</strong></td>
                        <td className="text-center"><span className="badge bg-danger text-white">KELUAR</span></td>
                        <td className="text-end fw-bold text-danger">-{formatRupiah(summary.totalOut)}</td>
                      </tr>
                      <tr>
                        <td className="ps-4 text-muted">• Pencairan Pinjaman Gadai Baru</td>
                        <td></td>
                        <td className="text-end text-muted">{formatRupiah(summary.breakdownOut?.PINJAMAN_GADAI || 0)}</td>
                      </tr>
                      <tr>
                        <td className="ps-4 text-muted">• Pengeluaran Operasional / Beban Toko</td>
                        <td></td>
                        <td className="text-end text-muted">{formatRupiah(summary.breakdownOut?.PENGELUARAN_OPERASIONAL || 0)}</td>
                      </tr>

                      <tr className="table-primary border-top border-2 border-primary">
                        <td className="py-2.5">
                          <strong className="fs-6">3. SALDO KAS BERSIH (Uang Masuk - Keluar)</strong>
                        </td>
                        <td className="text-center py-2.5">
                          <span className={`badge ${summary.balance >= 0 ? 'bg-primary' : 'bg-danger'}`}>
                            {summary.balance >= 0 ? 'SURPLUS' : 'DEFISIT'}
                          </span>
                        </td>
                        <td className={`text-end py-2.5 fw-bold fs-6 ${summary.balance >= 0 ? 'text-primary' : 'text-danger'}`}>
                          {formatRupiah(summary.balance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Catatan Kasir */}
                <div className="mb-4">
                  <label className="form-label text-muted small fw-semibold">Catatan Tutup Buku Kasir:</label>
                  <textarea 
                    className="form-control form-control-sm" 
                    rows="2" 
                    placeholder="Contoh: Seluruh kas fisik di laci telah dihitung dan sesuai dengan pembukuan sistem..."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                  />
                </div>

                {/* Kolom Tanda Tangan */}
                <div className="row text-center mt-4 pt-2">
                  <div className="col-6">
                    <p className="text-muted small mb-5">Petugas Kasir yang Menghitung,</p>
                    <div className="fw-bold text-dark border-bottom border-dark d-inline-block px-4 pb-1">
                      ( {savedUser?.fullName || 'Petugas Kasir'} )
                    </div>
                  </div>
                  <div className="col-6">
                    <p className="text-muted small mb-5">Diverifikasi Pimpinan / Owner,</p>
                    <div className="fw-bold text-dark border-bottom border-dark d-inline-block px-4 pb-1">
                      ( ............................................ )
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top py-3 px-4 bg-light d-flex justify-content-between" style={{ borderRadius: '0 0 1.25rem 1.25rem' }}>
                <span className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i> Lembar rekapitulasi siap dicetak ke printer kertas atau PDF.
                </span>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowClosingModal(false)}>
                    Tutup
                  </button>
                  <button type="button" className="btn btn-primary py-2 px-4 fw-bold d-flex align-items-center gap-2 shadow-sm" onClick={handlePrintClosing}>
                    <i className="bi bi-printer-fill"></i> Cetak / Simpan PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal Overlay */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-dash-circle-fill text-danger"></i> Catat Pengeluaran Operasional
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleAddExpenseSubmit}>
                <div className="modal-body p-4">
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small">
                      <i className="bi bi-exclamation-triangle-fill"></i> {formError}
                    </div>
                  )}

                  <div className="form-floating mb-3">
                    <input 
                      type="number" 
                      className="form-control" 
                      id="expenseAmount" 
                      placeholder="Jumlah Pengeluaran" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                    />
                    <label htmlFor="expenseAmount">Biaya Dikeluarkan (Rp)</label>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>Kategori Pengeluaran</label>
                    <select className="form-select" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                      <option value="ATK">Peralatan Kantor (ATK)</option>
                      <option value="Listrik & Air">Listrik, Air & Internet</option>
                      <option value="Sewa Tempat">Sewa Tempat Operasional</option>
                      <option value="Gaji Karyawan">Gaji Staf Toko</option>
                      <option value="Lainnya">Operasional Lainnya</option>
                    </select>
                  </div>

                  <div className="form-floating mb-3">
                    <input 
                      type="date" 
                      className="form-control" 
                      id="expenseDate" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                    />
                    <label htmlFor="expenseDate">Tanggal Transaksi</label>
                  </div>

                  <div className="form-floating mb-1">
                    <textarea 
                      className="form-control" 
                      id="expenseDesc" 
                      placeholder="Keterangan" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      style={{ height: '70px' }}
                    />
                    <label htmlFor="expenseDesc">Keterangan / Rincian Pengeluaran</label>
                  </div>
                </div>
                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-danger py-2 px-4 fw-bold" disabled={formLoading}>
                    {formLoading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlow;
