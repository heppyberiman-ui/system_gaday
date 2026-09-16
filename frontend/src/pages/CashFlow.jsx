import React, { useEffect, useState } from 'react';
import api from '../services/api';

const CashFlow = () => {
  const [cashFlows, setCashFlows] = useState([]);
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, logsRes] = await Promise.all([
        api.get('/cashflows/summary'),
        api.get('/cashflows', {
          params: { type, category, page, limit: 10 }
        })
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
  }, [page, type, category]);

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
    a.download = `mutasi_kas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-0">Arus Kas & Operasional</h3>
          <p className="text-muted mb-0 small">Buku kas masuk/keluar harian, catat biaya, dan kelola laporan operasional toko</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={handleExportCsv} className="btn btn-outline-success d-flex align-items-center gap-2 py-2">
            <i className="bi bi-file-earmark-excel-fill"></i> Ekspor CSV
          </button>
          <button onClick={handleOpenModal} className="btn btn-danger d-flex align-items-center gap-2 shadow-sm py-2">
            <i className="bi bi-dash-circle-fill"></i> Catat Biaya Operasional
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 mb-4 rounded-3 border-danger-subtle small">
          <i className="bi bi-exclamation-triangle-fill"></i> {error}
        </div>
      )}

      {/* Summary Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card card-premium p-3 border-start border-3 border-success h-100">
            <span className="text-muted small fw-semibold">Total Uang Masuk (Inflow)</span>
            <h4 className="fw-bold text-success mt-1 mb-0">{formatRupiah(summary.totalIn)}</h4>
            <span className="text-muted small mt-2 d-block" style={{ fontSize: '0.75rem' }}>Biaya admin + bunga + tebusan</span>
          </div>
        </div>
        
        <div className="col-12 col-md-4">
          <div className="card card-premium p-3 border-start border-3 border-danger h-100">
            <span className="text-muted small fw-semibold">Total Uang Keluar (Outflow)</span>
            <h4 className="fw-bold text-danger mt-1 mb-0">{formatRupiah(summary.totalOut)}</h4>
            <span className="text-muted small mt-2 d-block" style={{ fontSize: '0.75rem' }}>Pencairan gadai + operasional</span>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card card-premium p-3 border-start border-3 border-primary h-100">
            <span className="text-muted small fw-semibold">Saldo Kas Bersih (Net Cash)</span>
            <h4 className={`fw-bold mt-1 mb-0 ${summary.balance >= 0 ? 'text-primary' : 'text-danger'}`}>{formatRupiah(summary.balance)}</h4>
            <span className="text-muted small mt-2 d-block" style={{ fontSize: '0.75rem' }}>Selisih kas masuk & kas keluar</span>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card card-premium p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <select className="form-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="">Semua Tipe Kas</option>
              <option value="IN">Kas Masuk (IN)</option>
              <option value="OUT">Kas Keluar (OUT)</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <select className="form-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              <option value="">Semua Kategori</option>
              <option value="PINJAMAN_GADAI">Pinjaman Gadai</option>
              <option value="BIAYA_ADMIN">Biaya Admin</option>
              <option value="PENEBUSAN">Pelunasan Penebusan</option>
              <option value="PERPANJANGAN">Perpanjangan Tempo</option>
              <option value="PENGELUARAN_OPERASIONAL">Pengeluaran Operasional</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            {(type || category) && (
              <button onClick={() => { setType(''); setCategory(''); setPage(1); }} className="btn btn-light border w-100 py-2 text-muted">
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="card card-premium p-4">
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
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Tanggal</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Kategori</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Keterangan Deskripsi</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center" style={{ width: '100px' }}>Tipe</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end" style={{ width: '180px' }}>Jumlah Kas</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlows.map((cf) => (
                    <tr key={cf.id}>
                      <td className="px-3 py-3 text-muted small" data-label="Tanggal">
                        {new Date(cf.date).toLocaleDateString('id-ID')} {new Date(cf.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-3" data-label="Kategori">
                        <span className="badge bg-light text-dark border px-2.5 py-1.5 rounded-3 fw-medium">{cf.category}</span>
                      </td>
                      <td className="px-3 py-3 text-dark fw-medium" data-label="Keterangan Deskripsi">
                        {cf.description}
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
            <h5 className="fw-bold text-dark">Data Mutasi Kas Kosong</h5>
            <p className="text-muted small">Tidak ada riwayat mutasi kas dalam database.</p>
          </div>
        )}
      </div>

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
