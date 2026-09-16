import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Redeem = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });

  // Redeem Action modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [notes, setNotes] = useState('');
  const [calcData, setCalcData] = useState({ finalAmount: 0, penalty: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Receipt Modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedTx, setCompletedTx] = useState(null);

  const fetchActiveTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transactions', {
        params: { search, status: 'AKTIF,PERPANJANG,JATUH_TEMPO', page, limit: 20 }
      });
      
      const allActive = response.data.data.transactions;
      allActive.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      setTransactions(allActive);
      setMeta(response.data.data.meta);
      setError('');
    } catch (err) {
      console.error('Error fetching redeemable transactions:', err);
      setError('Gagal memuat daftar barang gadai aktif.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTransactions();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchActiveTransactions();
  };

  const handleResetSearch = () => {
    setSearch('');
    setPage(1);
    setTimeout(() => {
      fetchActiveTransactions();
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

  const handleOpenRedeemModal = (tx) => {
    setSelectedTx(tx);
    setNotes('Pelunasan penebusan barang gadai');
    setActionError('');
    
    const now = new Date();
    const dueDate = new Date(tx.dueDate);
    const isOverdue = now > dueDate;
    let penalty = 0;
    
    if (isOverdue) {
      const diffTime = Math.abs(now - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      penalty = parseFloat(tx.loanAmount) * 0.002 * diffDays;
    }

    const interestAmount = parseFloat(tx.interestAmount);
    const finalAmount = parseFloat(tx.loanAmount) + interestAmount + penalty;

    setCalcData({ finalAmount, penalty });
    setShowModal(true);
  };

  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');

    try {
      const res = await api.put(`/transactions/${selectedTx.id}/redeem`, {
        notes
      });

      setShowModal(false);
      fetchActiveTransactions();

      // Show receipt modal
      setCompletedTx({
        ...selectedTx,
        status: 'LUNAS',
        payoffAmount: calcData.finalAmount,
        penaltyAmount: calcData.penalty
      });
      setShowReceiptModal(true);
    } catch (err) {
      console.error('Redeem submit error:', err);
      const errMsg = err.response?.data?.message || 'Gagal memproses penebusan.';
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
        <h3 className="fw-bold text-dark mb-0">Penebusan Barang Gadai</h3>
        <p className="text-muted mb-0 small">Pelunasan pinjaman pokok + bunga + denda untuk pengembalian barang jaminan nasabah</p>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 mb-4 rounded-3 border-danger-subtle small">
          <i className="bi bi-exclamation-triangle-fill"></i> {error}
        </div>
      )}

      {/* Search Filter Card */}
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

      {/* Redeemable List Card */}
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
                          onClick={() => handleOpenRedeemModal(tx)}
                          className="btn btn-success btn-sm rounded-3 py-1.5 px-2.5 fw-semibold"
                        >
                          <i className="bi bi-arrow-left-right me-1"></i> Tebus
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
            <i className="bi bi-check-circle-fill fs-1 d-block mb-3 text-success"></i>
            <h5 className="fw-bold text-dark">Semua Jaminan Selesai</h5>
            <p className="text-muted small">Tidak ada barang gadai berstatus aktif yang perlu ditebus saat ini.</p>
          </div>
        )}
      </div>

      {/* Redemption Form Modal Overlay */}
      {showModal && selectedTx && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-arrow-left-right text-success"></i> Form Pelunasan Penebusan
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleRedeemSubmit}>
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
                        <tr><td>Jatuh Tempo:</td><td className="fw-bold">{new Date(selectedTx.dueDate).toLocaleDateString('id-ID')}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border-bottom pb-2 mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Pinjaman Pokok:</span>
                      <strong className="text-dark">{formatRupiah(selectedTx.loanAmount)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Bunga Gadai ({selectedTx.interestRate}%):</span>
                      <strong className="text-dark">{formatRupiah(selectedTx.interestAmount)}</strong>
                    </div>
                    {calcData.penalty > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Denda Keterlambatan:</span>
                        <strong className="text-danger">{formatRupiah(calcData.penalty)}</strong>
                      </div>
                    )}
                    <div className="d-flex justify-content-between mb-1 small text-success bg-success-subtle p-2 rounded-2">
                      <span><i className="bi bi-graph-up-arrow me-1"></i> Keuntungan Toko:</span>
                      <strong>{formatRupiah(parseFloat(selectedTx.interestAmount) + calcData.penalty)}</strong>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <span className="fw-bold text-dark">Total Pelunasan Kasir:</span>
                    <strong className="fs-4 text-success">{formatRupiah(calcData.finalAmount)}</strong>
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
                    <label htmlFor="notesInput">Catatan Penebusan</label>
                  </div>
                </div>
                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-success py-2 px-4 fw-bold" disabled={actionLoading}>
                    {actionLoading ? 'Memproses Penebusan...' : 'Tebus & Kembalikan Jaminan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && completedTx && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4 justify-content-between">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-printer-fill text-success"></i> Kuitansi Pelunasan Penebusan
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowReceiptModal(false)}></button>
              </div>
              <div className="modal-body p-4 bg-white" id="printableArea">
                <div className="border p-4 rounded-3 text-center" style={{ background: '#f8fafc' }}>
                  <div className="badge bg-success mb-2 px-3 py-1 text-uppercase fs-6">LUNAS & DIKEMBALIKAN</div>
                  <h4 className="fw-bold text-dark mb-1">PAWNHUB CABANG SUDIRMAN</h4>
                  <div className="text-muted small mb-3">Kuitansi Pelunasan Kode: <strong>{completedTx.transactionCode}</strong></div>
                  
                  <div className="table-responsive text-start mb-3">
                    <table className="table table-bordered table-sm small">
                      <tbody>
                        <tr><td>Nasabah:</td><td className="fw-bold">{completedTx.customer?.name}</td></tr>
                        <tr><td>Barang Jaminan:</td><td className="fw-bold">{completedTx.item?.name}</td></tr>
                        <tr><td>Pinjaman Pokok:</td><td className="text-end">{formatRupiah(completedTx.loanAmount)}</td></tr>
                        <tr><td>Bunga Berjalan:</td><td className="text-end">{formatRupiah(completedTx.interestAmount)}</td></tr>
                        {completedTx.penaltyAmount > 0 && (
                          <tr><td>Denda Keterlambatan:</td><td className="text-end text-danger">{formatRupiah(completedTx.penaltyAmount)}</td></tr>
                        )}
                        <tr className="table-success fw-bold">
                          <td>Total Diterima Kasir:</td>
                          <td className="text-end fs-6">{formatRupiah(completedTx.payoffAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-muted small mb-0 italic">
                    Menyatakan bahwa barang jaminan tersebut di atas telah diterima kembali oleh nasabah dalam kondisi baik dan lengkap.
                  </p>
                </div>
              </div>
              <div className="modal-footer border-top py-3 px-4 bg-light justify-content-between">
                <button type="button" className="btn btn-light border" onClick={() => setShowReceiptModal(false)}>Selesai</button>
                <button type="button" className="btn btn-success fw-bold" onClick={() => window.print()}>
                  <i className="bi bi-printer me-1"></i> Cetak Kuitansi Pelunasan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Redeem;
