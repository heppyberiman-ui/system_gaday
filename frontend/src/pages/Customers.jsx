import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Pagination states
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0, limit: 10 });

  // Add modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [nik, setNik] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [ktpPhoto, setKtpPhoto] = useState(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Detail modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Photo viewer states
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customers', {
        params: { search, page, limit: 10 }
      });
      setCustomers(response.data.data.customers);
      setMeta(response.data.data.meta);
      setError('');
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Gagal memuat daftar nasabah.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleResetSearch = () => {
    setSearch('');
    setPage(1);
    setTimeout(() => {
      fetchCustomers();
    }, 0);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setKtpPhoto(e.target.files[0]);
    }
  };

  // Add Customer Handlers
  const handleOpenAddModal = () => {
    setName('');
    setNik('');
    setPhone('');
    setAddress('');
    setNotes('');
    setKtpPhoto(null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!name || !nik || !phone) {
      setFormError('Nama, NIK, dan No. Telepon wajib diisi');
      return;
    }

    if (nik.length < 16) {
      setFormError('NIK harus terdiri dari 16 digit');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('nik', nik);
      formData.append('phone', phone);
      formData.append('address', address);
      formData.append('notes', notes);
      if (ktpPhoto) {
        formData.append('fotoKtp', ktpPhoto);
      }

      await api.post('/customers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowAddModal(false);
      setPage(1);
      fetchCustomers();
    } catch (err) {
      console.error('Error adding customer:', err);
      const errMsg = err.response?.data?.message || 'Gagal menambahkan customer baru.';
      setFormError(errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Customer Handlers
  const handleOpenEditModal = (c) => {
    setEditingCustomer(c);
    setName(c.name);
    setNik(c.nik);
    setPhone(c.phone);
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setKtpPhoto(null);
    setFormError('');
    setShowEditModal(true);
  };

  const handleEditCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!name || !nik || !phone) {
      setFormError('Nama, NIK, dan No. Telepon wajib diisi');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('nik', nik);
      formData.append('phone', phone);
      formData.append('address', address);
      formData.append('notes', notes);
      if (ktpPhoto) {
        formData.append('fotoKtp', ktpPhoto);
      }

      await api.put(`/customers/${editingCustomer.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowEditModal(false);
      fetchCustomers();
    } catch (err) {
      console.error('Error editing customer:', err);
      const errMsg = err.response?.data?.message || 'Gagal memperbarui data nasabah.';
      setFormError(errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Customer Handlers
  const handleOpenDeleteModal = (c) => {
    setDeletingCustomer(c);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDeleteCustomerConfirm = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/customers/${deletingCustomer.id}`);
      setShowDeleteModal(false);
      fetchCustomers();
    } catch (err) {
      console.error('Error deleting customer:', err);
      const errMsg = err.response?.data?.message || 'Gagal menghapus nasabah.';
      setDeleteError(errMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Detail Customer Handlers
  const handleOpenDetailModal = async (c) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await api.get(`/customers/${c.id}`);
      setDetailCustomer(res.data.data.customer);
    } catch (err) {
      console.error('Error fetching customer detail:', err);
    } finally {
      setDetailLoading(false);
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
    switch (status) {
      case 'AKTIF':
        return <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold px-2 py-1"><i className="bi bi-clock-history me-1"></i>AKTIF</span>;
      case 'LUNAS':
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold px-2 py-1"><i className="bi bi-check-circle-fill me-1"></i>LUNAS</span>;
      case 'PERPANJANG':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle fw-semibold px-2 py-1"><i className="bi bi-arrow-repeat me-1"></i>PERPANJANG</span>;
      case 'JATUH_TEMPO':
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold px-2 py-1"><i className="bi bi-exclamation-triangle-fill me-1"></i>JATUH TEMPO</span>;
      case 'DIJUAL':
        return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle fw-semibold px-2 py-1"><i className="bi bi-tag-fill me-1"></i>DIJUAL</span>;
      default:
        return <span className="badge bg-light text-dark border fw-semibold px-2 py-1">{status || 'AKTIF'}</span>;
    }
  };

  const handleQuickTagClick = (tag) => {
    setSearch(tag);
    setPage(1);
    setTimeout(() => {
      fetchCustomers();
    }, 0);
  };

  const getBaseUrl = () => {
    const apiEndpoint = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return apiEndpoint.replace(/\/api$/, '');
  };

  const handleExportCsv = () => {
    if (!customers.length) return;
    const exportData = customers.map(c => ({
      NIK: c.nik,
      Nama: c.name,
      Telepon: c.phone,
      Alamat: c.address || '',
      Catatan: c.notes || ''
    }));
    const headers = Object.keys(exportData[0]).join(',');
    const rows = exportData.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_nasabah_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Hero Banner Header */}
      <div className="hero-banner-blue mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div>
          <h3 className="fw-bold mb-1 text-white d-flex align-items-center gap-2">
            <i className="bi bi-people-fill"></i> Kelola Nasabah & Histori Gadai
          </h3>
          <p className="mb-0 text-white-50 small">Cari nama nasabah, nomor HP, NIK, atau tipe HP yang pernah digadai beserta nominal harganya</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={handleExportCsv} className="btn btn-light text-dark fw-bold d-flex align-items-center gap-2 py-2 px-3 shadow-sm border-0">
            <i className="bi bi-file-earmark-excel-fill text-success fs-5"></i> Ekspor CSV
          </button>
          <button onClick={handleOpenAddModal} className="btn btn-warning text-dark fw-bold d-flex align-items-center gap-2 shadow-sm py-2 px-3 border-0">
            <i className="bi bi-person-plus-fill fs-5"></i> Tambah Nasabah Baru
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2.5 px-3 mb-4 rounded-3 border-danger-subtle small" role="alert">
          <i className="bi bi-exclamation-octagon me-1"></i> {error}
        </div>
      )}

      {/* Filter and Search Card */}
      <div className="card card-premium p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-12 col-md-9 col-lg-10">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input 
                type="text" 
                className="form-control border-start-0 ps-0 py-2" 
                placeholder="Cari nama orang, NIK, No. HP, atau Tipe HP (misal: Budi, iPhone 13, Samsung A54, Oppo)..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" onClick={handleResetSearch} className="btn btn-light border border-start-0 text-muted px-3">
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>
          <div className="col-12 col-md-3 col-lg-2">
            <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold">
              <i className="bi bi-search me-1"></i> Cari Data
            </button>
          </div>
        </form>

        {/* Quick Brand Search Chips */}
        <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top flex-wrap small">
          <span className="text-muted fw-semibold me-1"><i className="bi bi-tag-fill text-primary"></i> Pencarian Cepat Tipe HP:</span>
          {['iPhone', 'Samsung', 'Oppo', 'Vivo', 'Xiaomi', 'Realme', 'Laptop'].map(tag => (
            <button 
              key={tag} 
              type="button"
              onClick={() => handleQuickTagClick(tag)}
              className={`btn btn-sm ${search === tag ? 'btn-primary' : 'btn-light border'} rounded-pill px-3 py-0.5 text-nowrap`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List Card */}
      <div className="card card-premium p-4">
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <div className="text-muted fw-semibold">Memuat daftar nasabah & histori HP...</div>
          </div>
        ) : customers.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle table-responsive-card mb-0">
                <thead className="table-light border-bottom">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 text-muted fw-semibold" style={{ width: '160px' }}>NIK / Identitas</th>
                    <th scope="col" className="px-3 py-2.5 text-muted fw-semibold" style={{ width: '180px' }}>Nama Nasabah</th>
                    <th scope="col" className="px-3 py-2.5 text-muted fw-semibold" style={{ width: '140px' }}>No. Telepon</th>
                    <th scope="col" className="px-3 py-2.5 text-muted fw-semibold" style={{ width: '280px' }}>Barang / Tipe HP Pernah Digadai & Harga</th>
                    <th scope="col" className="px-3 py-2.5 text-muted fw-semibold text-center" style={{ width: '90px' }}>Foto KTP</th>
                    <th scope="col" className="px-3 py-2.5 text-muted fw-semibold text-center" style={{ width: '140px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-3 fw-bold text-dark" data-label="NIK">
                        <span className="badge bg-light text-dark border font-monospace me-1">{c.nik}</span>
                      </td>
                      <td className="px-3 py-3" data-label="Nama Nasabah">
                        <span className="fw-bold text-primary fs-6 d-block">{c.name}</span>
                        {c.address && <small className="text-muted text-truncate d-block" style={{ maxWidth: '170px' }}>{c.address}</small>}
                      </td>
                      <td className="px-3 py-3 text-dark" data-label="No. Telepon">
                        <span className="fw-semibold"><i className="bi bi-whatsapp text-success me-1"></i>{c.phone}</span>
                      </td>
                      <td className="px-3 py-3" data-label="Barang & Harga Gadai">
                        {c.items && c.items.length > 0 ? (
                          <div className="d-flex flex-column gap-1.5">
                            {c.items.map((item, idx) => {
                              const tx = c.transactions?.find(t => t.itemId === item.id || t.item?.name === item.name);
                              const itemName = item.brand ? `${item.brand} ${item.modelName || item.name}` : item.name;
                              return (
                                <div key={item.id || idx} className="bg-light p-2 rounded-3 border" style={{ fontSize: '0.85rem' }}>
                                  <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                                    <span className="fw-bold text-dark text-truncate" style={{ maxWidth: '170px' }} title={itemName}>
                                      <i className="bi bi-phone-fill text-primary me-1"></i>{itemName}
                                    </span>
                                    {tx ? getStatusBadge(tx.status) : <span className="badge bg-secondary-subtle text-secondary border small py-0.5">TERDAFTAR</span>}
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted small">Harga Gadai:</span>
                                    <strong className="text-success fw-bold">
                                      {formatRupiah(tx?.loanAmount || item.pawnAmount)}
                                    </strong>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary border font-normal py-1 px-2.5">
                            <i className="bi bi-box-seam me-1"></i>Belum ada HP/Barang
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center" data-label="Foto KTP">
                        {c.ktpPhotoPath ? (
                          <button 
                            onClick={() => setViewerPhotoUrl(`${getBaseUrl()}/uploads/${c.ktpPhotoPath}`)}
                            className="btn btn-outline-primary btn-sm rounded-3 py-1 px-2.5"
                          >
                            <i className="bi bi-image me-1"></i> Lihat
                          </button>
                        ) : (
                          <span className="text-muted small italic">Tidak ada</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center" data-label="Aksi">
                        <div className="d-flex justify-content-center gap-1">
                          <button 
                            onClick={() => handleOpenDetailModal(c)} 
                            className="btn btn-light border btn-sm rounded-3 text-primary"
                            title="Detail & Histori Lengkap"
                          >
                            <i className="bi bi-eye-fill me-1"></i> Histori
                          </button>
                          <button 
                            onClick={() => handleOpenEditModal(c)} 
                            className="btn btn-light border btn-sm rounded-3 text-warning"
                            title="Edit Data Nasabah"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button 
                            onClick={() => handleOpenDeleteModal(c)} 
                            className="btn btn-light border btn-sm rounded-3 text-danger"
                            title="Hapus Nasabah"
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <span className="text-muted small">
                  Menampilkan Halaman <strong>{meta.page}</strong> dari <strong>{meta.totalPages}</strong> (Total <strong>{meta.total}</strong> Nasabah)
                </span>
                <nav aria-label="Page navigation">
                  <ul className="pagination pagination-sm mb-0 gap-1">
                    <li className={`page-item ${meta.page === 1 ? 'disabled' : ''}`}>
                      <button className="page-item btn btn-light btn-sm border" onClick={() => setPage(p => Math.max(p - 1, 1))}>
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: meta.totalPages }, (_, i) => (
                      <li key={i} className={`page-item ${meta.page === i + 1 ? 'active' : ''}`}>
                        <button className="page-link rounded-3 fw-semibold border px-3" onClick={() => setPage(i + 1)}>
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
            <i className="bi bi-person-bounding-box fs-1 d-block mb-3 text-muted"></i>
            <h5 className="fw-bold text-dark">Data Nasabah Tidak Ditemukan</h5>
            <p className="text-muted small">Belum ada nasabah terdaftar yang cocok dengan pencarian Anda.</p>
            <button onClick={handleOpenAddModal} className="btn btn-primary mt-2">
              Daftarkan Nasabah Pertama <i className="bi bi-plus-lg ms-1"></i>
            </button>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-person-plus-fill text-primary fs-4"></i> Registrasi Nasabah Baru
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddCustomerSubmit}>
                <div className="modal-body p-4">
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small d-flex align-items-center gap-2">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <div>{formError}</div>
                    </div>
                  )}

                  <div className="form-floating mb-3">
                    <input 
                      type="text" 
                      maxLength="16"
                      className="form-control" 
                      id="nikInput" 
                      placeholder="NIK" 
                      value={nik} 
                      onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                    />
                    <label htmlFor="nikInput">Nomor Induk Kependudukan (NIK - 16 Digit)</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="nameInput" 
                      placeholder="Nama" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                    />
                    <label htmlFor="nameInput">Nama Lengkap Sesuai KTP</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="phoneInput" 
                      placeholder="Telepon" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    />
                    <label htmlFor="phoneInput">Nomor Telepon (WhatsApp Aktif)</label>
                  </div>

                  <div className="form-floating mb-3">
                    <textarea 
                      className="form-control" 
                      id="addressInput" 
                      placeholder="Alamat" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)}
                      style={{ height: '80px' }}
                    />
                    <label htmlFor="addressInput">Alamat Lengkap Rumah</label>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>Upload Berkas Foto KTP</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="form-control rounded-3 border" 
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="form-floating mb-1">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="notesInput" 
                      placeholder="Catatan" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <label htmlFor="notesInput">Catatan / Deskripsi Tambahan</label>
                  </div>
                </div>

                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowAddModal(false)} disabled={formLoading}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary py-2 px-4 fw-bold" disabled={formLoading}>
                    {formLoading ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-pencil-square text-warning fs-4"></i> Edit Data Nasabah
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <form onSubmit={handleEditCustomerSubmit}>
                <div className="modal-body p-4">
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small d-flex align-items-center gap-2">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <div>{formError}</div>
                    </div>
                  )}

                  <div className="form-floating mb-3">
                    <input 
                      type="text" 
                      maxLength="16"
                      className="form-control" 
                      id="editNikInput" 
                      value={nik} 
                      onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                    />
                    <label htmlFor="editNikInput">NIK (16 Digit)</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="editNameInput" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                    />
                    <label htmlFor="editNameInput">Nama Lengkap</label>
                  </div>

                  <div className="form-floating mb-3">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="editPhoneInput" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    />
                    <label htmlFor="editPhoneInput">Nomor Telepon</label>
                  </div>

                  <div className="form-floating mb-3">
                    <textarea 
                      className="form-control" 
                      id="editAddressInput" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)}
                      style={{ height: '80px' }}
                    />
                    <label htmlFor="editAddressInput">Alamat Lengkap Rumah</label>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>Ganti Foto KTP (Opsional)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="form-control rounded-3 border" 
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="form-floating mb-1">
                    <input 
                      type="text" 
                      className="form-control" 
                      id="editNotesInput" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <label htmlFor="editNotesInput">Catatan / Keterangan</label>
                  </div>
                </div>

                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowEditModal(false)} disabled={formLoading}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-warning py-2 px-4 fw-bold text-white" disabled={formLoading}>
                    {formLoading ? 'Memperbarui...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Modal */}
      {showDeleteModal && deletingCustomer && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-trash-fill text-danger fs-4"></i> Konfirmasi Hapus Nasabah
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body p-4 text-center">
                {deleteError && (
                  <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small text-start">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i> {deleteError}
                  </div>
                )}
                <i className="bi bi-exclamation-circle text-warning fs-1 mb-2 d-block"></i>
                <p className="mb-1 text-dark fw-bold fs-5">{deletingCustomer.name}</p>
                <p className="text-muted small">NIK: {deletingCustomer.nik}</p>
                <p className="text-muted small mb-0">Apakah Anda yakin ingin menghapus data nasabah ini dari sistem?</p>
              </div>
              <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>
                  Batal
                </button>
                <button type="button" className="btn btn-danger py-2 px-4 fw-bold" onClick={handleDeleteCustomerConfirm} disabled={deleteLoading}>
                  {deleteLoading ? 'Menghapus...' : 'Ya, Hapus Nasabah'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showDetailModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4 justify-content-between">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-person-badge-fill text-primary fs-4"></i> Detail Profile & Histori Gadai
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {detailLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-2"></div>
                    <div className="text-muted fw-semibold">Memuat rincian profil & riwayat barang...</div>
                  </div>
                ) : detailCustomer ? (
                  <div>
                    {/* Basic Info Box */}
                    <div className="card bg-light border-0 p-3 mb-4 rounded-3 shadow-sm">
                      <div className="row g-3">
                        <div className="col-12 col-sm-6">
                          <span className="text-muted d-block small">Nama Lengkap Nasabah:</span>
                          <strong className="fs-5 text-dark">{detailCustomer.name}</strong>
                        </div>
                        <div className="col-12 col-sm-6">
                          <span className="text-muted d-block small">NIK Identitas:</span>
                          <span className="badge bg-primary-subtle text-primary border font-monospace fs-6 px-2.5 py-1">{detailCustomer.nik}</span>
                        </div>
                        <div className="col-12 col-sm-6">
                          <span className="text-muted d-block small">No. Telepon / WA:</span>
                          <span className="fw-semibold text-dark"><i className="bi bi-whatsapp text-success me-1"></i>{detailCustomer.phone}</span>
                        </div>
                        <div className="col-12 col-sm-6">
                          <span className="text-muted d-block small">Alamat Tempat Tinggal:</span>
                          <span className="fw-semibold text-dark">{detailCustomer.address || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Collateral Items list */}
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-phone-fill text-primary"></i> Daftar Tipe HP / Barang yang Pernah Digadai ({detailCustomer.items?.length || 0})
                    </h6>
                    {detailCustomer.items && detailCustomer.items.length > 0 ? (
                      <div className="table-responsive mb-4">
                        <table className="table table-hover table-bordered align-middle small">
                          <thead className="table-light">
                            <tr>
                              <th>Tipe HP / Nama Barang</th>
                              <th>Kategori & Brand</th>
                              <th className="text-end">Perkiraan Taksiran</th>
                              <th className="text-end">Harga/Pinjaman Gadai</th>
                              <th className="text-center">Kondisi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailCustomer.items.map(item => {
                              const fullName = item.brand ? `${item.brand} ${item.modelName || item.name}` : item.name;
                              return (
                                <tr key={item.id}>
                                  <td className="fw-bold text-dark">
                                    <i className="bi bi-phone text-primary me-1"></i>{fullName}
                                  </td>
                                  <td>
                                    <span className="badge bg-light text-dark border me-1">{item.category}</span>
                                    {item.brand && <span className="badge bg-info-subtle text-info-emphasis border">{item.brand}</span>}
                                  </td>
                                  <td className="text-end text-muted">{formatRupiah(item.estimatedValue)}</td>
                                  <td className="text-end fw-bold text-success fs-6">{formatRupiah(item.pawnAmount)}</td>
                                  <td className="text-center"><span className="badge bg-light text-dark border">{item.condition || 'Bagus'}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="alert alert-secondary py-2.5 px-3 small mb-4 rounded-3">Belum ada barang jaminan yang didaftarkan untuk nasabah ini.</div>
                    )}

                    {/* Transactions History list */}
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-receipt-cutoff text-primary"></i> Riwayat Transaksi Gadai ({detailCustomer.transactions?.length || 0})
                    </h6>
                    {detailCustomer.transactions && detailCustomer.transactions.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover table-bordered align-middle small">
                          <thead className="table-light">
                            <tr>
                              <th>Kode Nota</th>
                              <th>Barang / Tipe HP</th>
                              <th className="text-end">Nominal Uang Pinjaman</th>
                              <th className="text-center">Status Transaksi</th>
                              <th className="text-center">Tgl Gadai</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailCustomer.transactions.map(tx => (
                              <tr key={tx.id}>
                                <td className="fw-bold text-primary">{tx.transactionCode}</td>
                                <td>{tx.item ? (tx.item.brand ? `${tx.item.brand} ${tx.item.modelName || tx.item.name}` : tx.item.name) : '-'}</td>
                                <td className="text-end fw-bold text-dark">{formatRupiah(tx.loanAmount)}</td>
                                <td className="text-center">{getStatusBadge(tx.status)}</td>
                                <td className="text-center text-muted">{new Date(tx.createdAt).toLocaleDateString('id-ID')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="alert alert-secondary py-2.5 px-3 small rounded-3">Belum ada riwayat transaksi gadai tercatat.</div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="modal-footer border-top py-2 px-4 bg-light justify-content-end">
                <button type="button" className="btn btn-secondary py-1.5 px-4 fw-semibold" onClick={() => setShowDetailModal(false)}>Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KTP Viewer Modal */}
      {viewerPhotoUrl && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 1060 }} onClick={() => setViewerPhotoUrl('')}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg overflow-hidden" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4 justify-content-between">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-card-image text-primary"></i> Berkas Foto KTP Nasabah
                </h5>
                <button type="button" className="btn-close" onClick={() => setViewerPhotoUrl('')}></button>
              </div>
              <div className="modal-body p-4 bg-light text-center">
                <img 
                  src={viewerPhotoUrl} 
                  alt="KTP Nasabah" 
                  className="img-fluid rounded-3 border shadow-sm max-vh-50" 
                  style={{ maxHeight: '420px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = 'https://placehold.co/400x250?text=KTP+Photo+Failed+To+Load';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
