import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Extend = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Extend Action modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [notes, setNotes] = useState('');
  const [extensionDays, setExtensionDays] = useState(7);
  const [customRate, setCustomRate] = useState(10.0);
  const [calculatedInterest, setCalculatedInterest] = useState(0);
  const [newDueDate, setNewDueDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Receipt Modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [extendedTx, setExtendedTx] = useState(null);

  const fetchExtendableTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transactions', {
        params: { search, status: 'AKTIF,PERPANJANG,JATUH_TEMPO', page, limit: 20 }
      });
      const allActive = response.data.data.transactions;
      allActive.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      setTransactions(allActive);
      setError('');
    } catch (err) {
      console.error('Error fetching extendable transactions:', err);
      setError('Gagal memuat daftar jaminan aktif.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtendableTransactions();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchExtendableTransactions();
  };

  const handleResetSearch = () => {
    setSearch('');
    setPage(1);
    setTimeout(() => {
      fetchExtendableTransactions();
    }, 0);
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
    const msg = `Yth. Bpk/Ibu ${tx.customer?.name}, kami dari PawnHub Cabang Sudirman menginfokan bahwa nota gadai ${tx.transactionCode} (${tx.item?.name}) memiliki tanggal jatuh tempo pada ${new Date(tx.dueDate).toLocaleDateString('id-ID')}. Mohon lakukan perpanjangan atau pelunasan. Terima kasih.`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDurationSelect = (days, tx = selectedTx) => {
    setExtensionDays(days);
    let rate = 10.0;
    if (days <= 7) rate = 10.0;
    else if (days <= 21) rate = 15.0;
    else rate = 20.0;

    setCustomRate(rate);
    if (tx) {
      const loan = parseFloat(tx.loanAmount || 0);
      const interest = (loan * rate) / 100;
      setCalculatedInterest(interest);

      const oldDueDate = new Date(tx.dueDate);
      const updatedDate = new Date(oldDueDate.getTime() + days * 24 * 60 * 60 * 1000);
      setNewDueDate(updatedDate.toLocaleDateString('id-ID'));
    }
  };

  const handleOpenExtendModal = (tx) => {
    setSelectedTx(tx);
    setNotes(`Perpanjangan tempo gadai (${tx.transactionCode})`);
    setActionError('');
    handleDurationSelect(7, tx);
    setShowModal(true);
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');

    try {
      const res = await api.put(`/transactions/${selectedTx.id}/extend`, {
        extensionDays,
        extensionInterestRate: customRate,
        notes
      });

      setShowModal(false);
      fetchExtendableTransactions();

      const resTx = res.data.data?.transaction || selectedTx;

      setExtendedTx({
        ...resTx,
        customer: selectedTx.customer,
        item: selectedTx.item,
        interestAmount: calculatedInterest,
        newDueDate
      });
      setShowReceiptModal(true);
    } catch (err) {
      console.error('Extend submit error:', err);
      const errMsg = err.response?.data?.message || 'Gagal memproses perpanjangan gadai.';
      setActionError(errMsg);
    } finally {
      setActionLoading(false);
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

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'AKTIF':
        return 'bg-primary-subtle text-primary border border-primary-subtle';
      case 'PERPANJANG':
        return 'bg-warning-subtle text-warning border border-warning-subtle';
      case 'JATUH_TEMPO':
        return 'bg-danger-subtle text-danger border border-danger-subtle';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-0">Perpanjangan Jangka Waktu Gadai</h3>
        <p className="text-muted mb-0 small">Perpanjang jatuh tempo nota dengan membayar bunga berjalan nasabah</p>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 mb-4 rounded-3 border-danger-subtle small">
          <i className="bi bi-exclamation-triangle-fill"></i> {error}
        </div>
      )}

      {/* Search Filter */}
      <div className="card card-premium p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-12 col-md-8 col-lg-6">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Cari berdasarkan kode nota gadai, nasabah, atau barang..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4 col-lg-3 d-flex gap-2">
            <button type="submit" className="btn btn-primary w-100 py-2">Cari Nota</button>
            {search && (
              <button type="button" onClick={handleResetSearch} className="btn btn-light border py-2 text-muted px-3">
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Extendable List Card */}
      <div className="card card-premium p-4">
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <div className="text-muted fw-semibold">Memuat daftar jaminan aktif...</div>
          </div>
        ) : transactions.length > 0 ? (
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
                  <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center" style={{ width: '160px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-3 py-3 fw-bold text-primary" data-label="Kode Nota">
                      {tx.transactionCode}
                    </td>
                    <td className="px-3 py-3 text-dark fw-semibold" data-label="Nasabah">
                      {tx.customer ? tx.customer.name : 'Unknown'}
                    </td>
                    <td className="px-3 py-3 text-muted" data-label="Barang Jaminan">
                      {tx.item ? tx.item.name : 'Unknown'}
                    </td>
                    <td className="px-3 py-3 text-end fw-bold text-dark" data-label="Pinjaman Pokok">
                      {formatRupiah(tx.loanAmount)}
                    </td>
                    <td className="px-3 py-3 text-center" data-label="Status">
                      <span className={`badge px-2.5 py-1.5 rounded-3 fw-semibold ${getStatusBadge(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-muted small" data-label="Jatuh Tempo">
                      {new Date(tx.dueDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-3 py-3 text-center" data-label="Aksi">
                      <div className="d-flex justify-content-center gap-1">
                        <button 
                          onClick={() => handleSendWaReminder(tx)}
                          className="btn btn-outline-success btn-sm rounded-3 py-1.5 px-2"
                          title="Kirim Pengingat WhatsApp"
                        >
                          <i className="bi bi-whatsapp"></i>
                        </button>
                        <button 
                          onClick={() => handleOpenExtendModal(tx)}
                          className="btn btn-warning btn-sm rounded-3 py-1.5 px-2.5 fw-semibold text-white"
                        >
                          <i className="bi bi-calendar-plus me-1"></i> Perpanjang
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-5 my-3 text-muted">
            <i className="bi bi-inbox fs-1 d-block mb-3 text-muted"></i>
            <h5 className="fw-bold text-dark">Data Kosong</h5>
            <p className="text-muted small">Tidak ada jaminan aktif yang perlu diperpanjang saat ini.</p>
          </div>
        )}
      </div>

      {/* Extend Modal Overlay */}
      {showModal && selectedTx && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-plus text-warning"></i> Form Perpanjangan Tempo
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleExtendSubmit}>
                <div className="modal-body p-4">
                  {actionError && (
                    <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small">
                      <i className="bi bi-exclamation-triangle-fill"></i> {actionError}
                    </div>
                  )}

                  <div className="bg-light p-3 rounded-3 mb-4 border">
                    <table className="table table-borderless table-sm mb-0 small text-dark">
                      <tbody>
                        <tr><td>Kode Nota:</td><td className="fw-bold">{selectedTx.transactionCode}</td></tr>
                        <tr><td>Nama Nasabah:</td><td className="fw-bold">{selectedTx.customer?.name}</td></tr>
                        <tr><td>Barang Jaminan:</td><td className="fw-bold">{selectedTx.item?.name}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold text-dark small mb-1">Pilih Durasi Perpanjangan Gadai <span className="text-danger">*</span></label>
                    <select 
                      className="form-select py-2.5 fw-bold text-primary border-primary-subtle"
                      value={extensionDays}
                      onChange={(e) => handleDurationSelect(parseInt(e.target.value))}
                    >
                      <option value="7">🗓️ 7 Hari (1 Minggu) - Bunga 10%</option>
                      <option value="14">🗓️ 14 Hari (2 Minggu) - Bunga 15%</option>
                      <option value="21">🗓️ 21 Hari (3 Minggu) - Bunga 15%</option>
                      <option value="30">🗓️ 30 Hari (1 Bulan) - Bunga 20%</option>
                    </select>
                  </div>

                  <div className="border-bottom pb-2 mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Jatuh Tempo Lama:</span>
                      <strong className="text-dark">{new Date(selectedTx.dueDate).toLocaleDateString('id-ID')}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Jatuh Tempo Baru (+{extensionDays} hari):</span>
                      <strong className="text-primary fs-6">{newDueDate}</strong>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-4 bg-warning-subtle p-3 rounded-3 border border-warning-subtle">
                    <div>
                      <div className="fw-bold text-dark">Pembayaran Bunga Perpanjangan:</div>
                      <div className="text-muted extra-small" style={{ fontSize: '0.75rem' }}>Bunga ({customRate}%) dari Pinjaman {formatRupiah(selectedTx.loanAmount)}</div>
                    </div>
                    <strong className="fs-3 text-warning">{formatRupiah(calculatedInterest)}</strong>
                  </div>

                  <div className="form-floating">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="notesInput" 
                      placeholder="Catatan" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                    />
                    <label htmlFor="notesInput">Catatan Perpanjangan</label>
                  </div>
                </div>
                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-warning py-2 px-4 fw-bold text-white" disabled={actionLoading}>
                    {actionLoading ? 'Memproses Perpanjangan...' : 'Bayar Bunga & Perpanjang'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && extendedTx && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4 justify-content-between">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-printer-fill text-warning"></i> Kuitansi Perpanjangan Gadai
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowReceiptModal(false)}></button>
              </div>
              <div className="modal-body p-4 bg-white" id="printableArea">
                <div className="border p-4 rounded-3 text-center" style={{ background: '#f8fafc' }}>
                  <div className="badge bg-warning mb-2 px-3 py-1 text-uppercase fs-6">PERPANJANGAN BERHASIL</div>
                  <h4 className="fw-bold text-dark mb-1">PAWNHUB CABANG SUDIRMAN</h4>
                  <div className="text-muted small mb-3">Kuitansi Pembayaran Bunga Kode: <strong>{extendedTx.transactionCode}</strong></div>
                  
                  <div className="table-responsive text-start mb-3">
                    <table className="table table-bordered table-sm small">
                      <tbody>
                        <tr><td>Nasabah:</td><td className="fw-bold">{extendedTx.customer?.name}</td></tr>
                        <tr><td>Barang Jaminan:</td><td className="fw-bold">{extendedTx.item?.name}</td></tr>
                        <tr><td>Pinjaman Pokok:</td><td className="text-end">{formatRupiah(extendedTx.loanAmount)}</td></tr>
                        <tr><td>Pembayaran Bunga:</td><td className="text-end fw-bold text-success">{formatRupiah(extendedTx.interestAmount)}</td></tr>
                        <tr className="table-warning fw-bold">
                          <td>Tanggal Jatuh Tempo Baru:</td>
                          <td className="text-end fs-6 text-primary">{extendedTx.newDueDate}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top py-3 px-4 bg-light justify-content-between">
                <button type="button" className="btn btn-light border" onClick={() => setShowReceiptModal(false)}>Selesai</button>
                <button type="button" className="btn btn-warning fw-bold text-white" onClick={() => window.print()}>
                  <i className="bi bi-printer me-1"></i> Cetak Kuitansi Perpanjangan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Extend;
