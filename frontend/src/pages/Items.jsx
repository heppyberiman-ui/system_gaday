import React, { useEffect, useState } from 'react';
import api, { getServerUrl } from '../services/api';

const Items = () => {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });

  // Add Item Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [itemCategory, setItemCategory] = useState('Elektronik');
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [imei, setImei] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [color, setColor] = useState('');
  const [equipment, setEquipment] = useState('');
  const [condition, setCondition] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [pawnAmount, setPawnAmount] = useState('');
  const [description, setDescription] = useState('');
  const [itemTenorDays, setItemTenorDays] = useState(7);
  const [photo, setPhoto] = useState(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Edit Item Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Delete Item Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Photo viewer states
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/items', {
        params: { search, category, page, limit: 10 }
      });
      setItems(response.data.data.items);
      setMeta(response.data.data.meta);
      setError('');
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Gagal memuat daftar barang jaminan.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersList = async () => {
    try {
      const response = await api.get('/customers', {
        params: { limit: 100 }
      });
      setCustomers(response.data.data.customers);
    } catch (err) {
      console.error('Error fetching customers dropdown:', err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page, category]);

  useEffect(() => {
    if (showAddModal || showEditModal) {
      fetchCustomersList();
    }
  }, [showAddModal, showEditModal]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const handleResetSearch = () => {
    setSearch('');
    setCategory('');
    setPage(1);
    setTimeout(() => {
      fetchItems();
    }, 0);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  // Add Item Handlers
  const handleOpenAddModal = () => {
    setCustomerId('');
    setName('');
    setItemCategory('Elektronik');
    setBrand('');
    setModelName('');
    setImei('');
    setSerialNumber('');
    setColor('');
    setEquipment('');
    setCondition('');
    setEstimatedValue('');
    setPawnAmount('');
    setDescription('');
    setPhoto(null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleAddItemSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseIndonesianAmount(pawnAmount);
    if (!customerId || !name || !itemCategory || !parsedAmount) {
      setFormError('Nasabah, Nama Barang, Kategori, dan Nilai Pinjaman wajib diisi.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('customerId', customerId);
      formData.append('name', name);
      formData.append('category', itemCategory);
      formData.append('brand', brand);
      formData.append('modelName', modelName);
      formData.append('imei', imei);
      formData.append('serialNumber', serialNumber);
      formData.append('color', color);
      formData.append('equipment', equipment);
      formData.append('condition', condition);
      formData.append('estimatedValue', parsedAmount);
      formData.append('pawnAmount', parsedAmount);
      formData.append('description', description);
      if (photo) {
        formData.append('photo', photo);
      }

      await api.post('/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowAddModal(false);
      setPage(1);
      fetchItems();
    } catch (err) {
      console.error('Error adding item:', err);
      const errMsg = err.response?.data?.message || 'Gagal menyimpan barang jaminan baru.';
      setFormError(errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Item Handlers
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setCustomerId(item.customerId);
    setName(item.name);
    setItemCategory(item.category);
    setBrand(item.brand || '');
    setModelName(item.modelName || '');
    setImei(item.imei || '');
    setSerialNumber(item.serialNumber || '');
    setColor(item.color || '');
    setEquipment(item.equipment || '');
    setCondition(item.condition || '');
    setEstimatedValue(String(item.estimatedValue));
    setPawnAmount(String(item.pawnAmount));
    setDescription(item.description || '');
    setPhoto(null);
    setFormError('');
    setShowEditModal(true);
  };

  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseIndonesianAmount(pawnAmount);
    if (!name || !itemCategory || !parsedAmount) {
      setFormError('Nama Barang, Kategori, dan Nilai Pinjaman wajib diisi.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', itemCategory);
      formData.append('brand', brand);
      formData.append('modelName', modelName);
      formData.append('imei', imei);
      formData.append('serialNumber', serialNumber);
      formData.append('color', color);
      formData.append('equipment', equipment);
      formData.append('condition', condition);
      formData.append('estimatedValue', parsedAmount);
      formData.append('pawnAmount', parsedAmount);
      formData.append('description', description);
      if (photo) {
        formData.append('photo', photo);
      }

      await api.put(`/items/${editingItem.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowEditModal(false);
      fetchItems();
    } catch (err) {
      console.error('Error updating item:', err);
      const errMsg = err.response?.data?.message || 'Gagal memperbarui barang jaminan.';
      setFormError(errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Item Handlers
  const handleOpenDeleteModal = (item) => {
    setDeletingItem(item);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDeleteItemConfirm = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/items/${deletingItem.id}`);
      setShowDeleteModal(false);
      fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err);
      const errMsg = err.response?.data?.message || 'Gagal menghapus barang jaminan.';
      setDeleteError(errMsg);
    } finally {
      setDeleteLoading(false);
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

  const formatRupiah = (val) => {
    if (val === undefined || val === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const getBaseUrl = () => {
    return getServerUrl();
  };

  return (
    <div>
      {/* Hero Banner Header */}
      <div className="hero-banner-blue mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div>
          <h3 className="fw-bold mb-1 text-white d-flex align-items-center gap-2">
            <i className="bi bi-box-seam-fill"></i> Kelola Barang Jaminan (Inventori)
          </h3>
          <p className="mb-0 text-white-50 small">Daftar inventori jaminan aktif, taksiran harga, dan status kondisi barang</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-warning text-dark fw-bold d-flex align-items-center gap-2 shadow-sm py-2 px-3 border-0">
          <i className="bi bi-plus-circle-fill fs-5"></i> Tambah Barang Jaminan
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 mb-4 rounded-3 border-danger-subtle small" role="alert">
          <i className="bi bi-exclamation-triangle-fill"></i> {error}
        </div>
      )}

      {/* Filter and Search Card */}
      <div className="card card-premium p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Cari berdasarkan nama barang, SN, atau IMEI..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <select 
              className="form-select" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              <option value="Elektronik">Elektronik</option>
              <option value="Emas & Logam Mulia">Emas & Logam Mulia</option>
              <option value="Kendaraan">Kendaraan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div className="col-12 col-md-3 d-flex gap-2">
            <button type="submit" className="btn btn-primary w-100 py-2">Filter</button>
            {(search || category) && (
              <button type="button" onClick={handleResetSearch} className="btn btn-light border py-2 text-muted px-3">
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Items List Card */}
      <div className="card card-premium p-4">
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <div className="text-muted fw-semibold">Memuat daftar barang jaminan...</div>
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle table-responsive-card mb-0">
                <thead className="table-light border-bottom">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Barang Jaminan</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Kategori</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Nasabah Pemilik</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end">Nilai Pinjaman Max</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center" style={{ width: '90px' }}>Foto</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center" style={{ width: '120px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3" data-label="Barang Jaminan">
                        <strong className="text-dark d-block">{item.name}</strong>
                        <span className="text-muted small">IMEI: {item.imei || 'N/A'}</span>
                      </td>
                      <td className="px-3 py-3" data-label="Kategori">
                        <span className="badge bg-light text-dark border px-2.5 py-1.5 rounded-3 fw-medium">{item.category}</span>
                      </td>
                      <td className="px-3 py-3 text-primary fw-semibold" data-label="Nasabah Pemilik">
                        {item.customer ? item.customer.name : 'Unknown'}
                      </td>
                      <td className="px-3 py-3 text-end fw-bold text-success" data-label="Nilai Pinjaman Max">
                        {formatRupiah(item.pawnAmount)}
                      </td>
                      <td className="px-3 py-3 text-center" data-label="Foto">
                        {item.photoPath ? (
                          <button 
                            onClick={() => setViewerPhotoUrl(`${getBaseUrl()}/uploads/${item.photoPath}`)}
                            className="btn btn-outline-primary btn-sm rounded-3 py-1 px-2"
                          >
                            <i className="bi bi-image"></i>
                          </button>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center" data-label="Aksi">
                        <div className="d-flex justify-content-center gap-1">
                          <button 
                            onClick={() => handleOpenEditModal(item)} 
                            className="btn btn-light border btn-sm rounded-3 text-warning"
                            title="Edit Barang Jaminan"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button 
                            onClick={() => handleOpenDeleteModal(item)} 
                            className="btn btn-light border btn-sm rounded-3 text-danger"
                            title="Hapus Barang Jaminan"
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
                  Halaman <strong>{meta.page}</strong> dari <strong>{meta.totalPages}</strong> (Total <strong>{meta.total}</strong> Barang)
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
            <h5 className="fw-bold text-dark">Data Inventori Kosong</h5>
            <p className="text-muted small">Belum ada barang jaminan aktif yang terdaftar di database.</p>
            <button onClick={handleOpenAddModal} className="btn btn-primary mt-2">
              Daftarkan Barang Jaminan <i className="bi bi-plus-lg ms-1"></i>
            </button>
          </div>
        )}
      </div>

      {/* Add Item Modal Overlay */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-box-seam-fill text-primary"></i> Tambah Barang Jaminan Baru
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddItemSubmit}>
                <div className="modal-body p-4 overflow-auto" style={{ maxHeight: '70vh' }}>
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small">
                      <i className="bi bi-exclamation-triangle-fill"></i> {formError}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>Nasabah Pemilik Barang</label>
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
                      <div className="form-floating mb-1">
                        <input 
                          type="text" 
                          className="form-control" 
                          id="itemNameInput" 
                          placeholder="Nama Barang" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)}
                        />
                        <label htmlFor="itemNameInput">Nama Barang Jaminan (e.g. HP / Laptop)</label>
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        <span className="text-muted extra-small align-self-center" style={{ fontSize: '0.75rem' }}>Jenis Cepat:</span>
                        {[
                          { label: '📱 HP', prefix: 'HP ' },
                          { label: '📱 Tablet', prefix: 'Tablet ' },
                          { label: '💻 Laptop', prefix: 'Laptop ' },
                          { label: '📺 TV', prefix: 'TV ' },
                          { label: '📷 Kamera', prefix: 'Kamera ' }
                        ].map((itemType) => (
                          <button
                            key={itemType.label}
                            type="button"
                            className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${
                              name.toLowerCase().startsWith(itemType.prefix.toLowerCase().trim())
                                ? 'btn-primary text-white'
                                : 'btn-outline-primary bg-white'
                            }`}
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => {
                              const cleanName = name.replace(/^(hp|tablet|laptop|tv|kamera)\s*/i, '');
                              setName(itemType.prefix + cleanName);
                            }}
                          >
                            {itemType.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>Kategori Barang</label>
                      <select 
                        className="form-select py-3" 
                        value={itemCategory} 
                        onChange={(e) => setItemCategory(e.target.value)}
                      >
                        <option value="Elektronik">Elektronik</option>
                        <option value="Emas & Logam Mulia">Emas & Logam Mulia</option>
                        <option value="Kendaraan">Kendaraan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="col-12 col-sm-6">
                      <div className="form-floating">
                        <input type="text" className="form-control" id="brandInput" placeholder="Merk & Tipe" value={brand} onChange={(e) => setBrand(e.target.value)} />
                        <label htmlFor="brandInput">Merk & Tipe Barang (e.g. Oppo A5s)</label>
                      </div>
                    </div>
                    <div className="col-12 col-sm-6">
                      <div className="form-floating">
                        <input type="text" className="form-control" id="imeiInput" placeholder="IMEI" value={imei} onChange={(e) => setImei(e.target.value)} />
                        <label htmlFor="imeiInput">IMEI (Jika HP)</label>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="form-floating mb-1">
                        <input 
                          type="text" 
                          className="form-control fw-bold" 
                          id="pawnInput" 
                          placeholder="Maksimal Uang Pinjaman" 
                          value={pawnAmount} 
                          onChange={(e) => setPawnAmount(e.target.value)} 
                        />
                        <label htmlFor="pawnInput">Maksimal Uang Pinjaman (e.g. ketik 200 / 200rb / 1.5jt) *</label>
                      </div>

                      {pawnAmount && (
                        <div className="text-success fw-bold small mb-2 ms-1">
                          <i className="bi bi-check-circle-fill me-1"></i>
                          Terbaca: {formatRupiah(parseIndonesianAmount(pawnAmount))}
                        </div>
                      )}

                      <div className="d-flex flex-wrap gap-1 mb-2">
                        <span className="text-muted small me-1 align-self-center">Pilihan Cepat:</span>
                        {['200000', '300000', '500000', '1000000', '1500000', '2000000', '3000000', '5000000'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${
                              String(parseIndonesianAmount(pawnAmount)) === val
                                ? 'btn-success text-white'
                                : 'btn-outline-secondary text-dark bg-white'
                            }`}
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => setPawnAmount(val)}
                          >
                            {val === '200000' ? '200 rb' :
                             val === '300000' ? '300 rb' :
                             val === '500000' ? '500 rb' :
                             val === '1000000' ? '1 jt' :
                             val === '1500000' ? '1.5 jt' :
                             val === '2000000' ? '2 jt' :
                             val === '3000000' ? '3 jt' : '5 jt'}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 p-3 bg-light rounded-3 border">
                        <label className="form-label text-dark fw-bold small mb-1">Pilihan Durasi Gadai (Tenor) & Skema Bunga</label>
                        <select 
                          className="form-select py-2 fw-semibold text-primary border-primary-subtle"
                          value={itemTenorDays}
                          onChange={(e) => setItemTenorDays(parseInt(e.target.value))}
                        >
                          <option value="7">🗓️ 7 Hari (1 Minggu) - Bunga 10%</option>
                          <option value="14">🗓️ 14 Hari (2 Minggu) - Bunga 15%</option>
                          <option value="21">🗓️ 21 Hari (3 Minggu) - Bunga 15%</option>
                          <option value="30">🗓️ 30 Hari (1 Bulan) - Bunga 20%</option>
                        </select>

                        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small">
                          <div>
                            <span className="text-muted">Estimasi Bunga ({itemTenorDays <= 7 ? '10%' : itemTenorDays <= 21 ? '15%' : '20%'}): </span>
                            <strong className="text-primary">{formatRupiah(parseIndonesianAmount(pawnAmount) * (itemTenorDays <= 7 ? 0.10 : itemTenorDays <= 21 ? 0.15 : 0.20))}</strong>
                          </div>
                          <div>
                            <span className="text-muted">Estimasi Tebusan: </span>
                            <strong className="text-success">{formatRupiah(parseIndonesianAmount(pawnAmount) + (parseIndonesianAmount(pawnAmount) * (itemTenorDays <= 7 ? 0.10 : itemTenorDays <= 21 ? 0.15 : 0.20)))}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-sm-4">
                      <div className="form-floating">
                        <input type="text" className="form-control" id="colorInput" placeholder="Warna" value={color} onChange={(e) => setColor(e.target.value)} />
                        <label htmlFor="colorInput">Warna Barang</label>
                      </div>
                    </div>
                    <div className="col-12 col-sm-4">
                      <div className="form-floating">
                        <input type="text" className="form-control" id="equipInput" placeholder="Kelengkapan" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
                        <label htmlFor="equipInput">Kelengkapan (e.g. Charger, Dus)</label>
                      </div>
                    </div>
                    <div className="col-12 col-sm-4">
                      <div className="form-floating">
                        <input type="text" className="form-control" id="condInput" placeholder="Kondisi" value={condition} onChange={(e) => setCondition(e.target.value)} />
                        <label htmlFor="condInput">Kondisi (e.g. Mulus)</label>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="form-floating">
                        <textarea className="form-control" id="descInput" placeholder="Deskripsi" value={description} onChange={(e) => setDescription(e.target.value)} style={{ height: '70px' }} />
                        <label htmlFor="descInput">Deskripsi Detail Kondisi Barang</label>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>Upload Foto Barang Jaminan</label>
                      <input type="file" accept="image/*" className="form-control" onChange={handleFileChange} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowAddModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary py-2 px-4 fw-bold" disabled={formLoading}>
                    {formLoading ? 'Menyimpan...' : 'Simpan Barang'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal Overlay */}
      {showEditModal && editingItem && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-pencil-square text-warning"></i> Edit Barang Jaminan
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <form onSubmit={handleEditItemSubmit}>
                <div className="modal-body p-4 overflow-auto" style={{ maxHeight: '70vh' }}>
                  {formError && (
                    <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small">
                      <i className="bi bi-exclamation-triangle-fill"></i> {formError}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <div className="form-floating mb-1">
                        <input type="text" className="form-control" id="editName" value={name} onChange={(e) => setName(e.target.value)} />
                        <label htmlFor="editName">Nama Barang Jaminan</label>
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        <span className="text-muted extra-small align-self-center" style={{ fontSize: '0.75rem' }}>Jenis Cepat:</span>
                        {[
                          { label: '📱 HP', prefix: 'HP ' },
                          { label: '📱 Tablet', prefix: 'Tablet ' },
                          { label: '💻 Laptop', prefix: 'Laptop ' },
                          { label: '📺 TV', prefix: 'TV ' },
                          { label: '📷 Kamera', prefix: 'Kamera ' }
                        ].map((itemType) => (
                          <button
                            key={itemType.label}
                            type="button"
                            className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${
                              name.toLowerCase().startsWith(itemType.prefix.toLowerCase().trim())
                                ? 'btn-primary text-white'
                                : 'btn-outline-primary bg-white'
                            }`}
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => {
                              const cleanName = name.replace(/^(hp|tablet|laptop|tv|kamera)\s*/i, '');
                              setName(itemType.prefix + cleanName);
                            }}
                          >
                            {itemType.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>Kategori Barang</label>
                      <select className="form-select py-3" value={itemCategory} onChange={(e) => setItemCategory(e.target.value)}>
                        <option value="Elektronik">Elektronik</option>
                        <option value="Emas & Logam Mulia">Emas & Logam Mulia</option>
                        <option value="Kendaraan">Kendaraan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="col-12 col-sm-6">
                      <div className="form-floating">
                        <input type="text" className="form-control" id="editBrand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                        <label htmlFor="editBrand">Merk & Tipe Barang (e.g. Oppo A5s)</label>
                      </div>
                    </div>
                    <div className="col-12 col-sm-6">
                      <div className="form-floating">
                        <input type="text" className="form-control" id="editImei" value={imei} onChange={(e) => setImei(e.target.value)} />
                        <label htmlFor="editImei">IMEI (Jika HP)</label>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="form-floating mb-1">
                        <input 
                          type="text" 
                          className="form-control fw-bold" 
                          id="editPawn" 
                          placeholder="Maksimal Uang Pinjaman" 
                          value={pawnAmount} 
                          onChange={(e) => setPawnAmount(e.target.value)} 
                        />
                        <label htmlFor="editPawn">Maksimal Uang Pinjaman (e.g. ketik 200 / 200rb / 1.5jt) *</label>
                      </div>

                      {pawnAmount && (
                        <div className="text-success fw-bold small mb-2 ms-1">
                          <i className="bi bi-check-circle-fill me-1"></i>
                          Terbaca: {formatRupiah(parseIndonesianAmount(pawnAmount))}
                        </div>
                      )}

                      <div className="d-flex flex-wrap gap-1 mb-2">
                        <span className="text-muted small me-1 align-self-center">Pilihan Cepat:</span>
                        {['200000', '300000', '500000', '1000000', '1500000', '2000000', '3000000', '5000000'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${
                              String(parseIndonesianAmount(pawnAmount)) === val
                                ? 'btn-success text-white'
                                : 'btn-outline-secondary text-dark bg-white'
                            }`}
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => setPawnAmount(val)}
                          >
                            {val === '200000' ? '200 rb' :
                             val === '300000' ? '300 rb' :
                             val === '500000' ? '500 rb' :
                             val === '1000000' ? '1 jt' :
                             val === '1500000' ? '1.5 jt' :
                             val === '2000000' ? '2 jt' :
                             val === '3000000' ? '3 jt' : '5 jt'}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 p-3 bg-light rounded-3 border">
                        <label className="form-label text-dark fw-bold small mb-1">Pilihan Durasi Gadai (Tenor) & Skema Bunga</label>
                        <select 
                          className="form-select py-2 fw-semibold text-primary border-primary-subtle"
                          value={itemTenorDays}
                          onChange={(e) => setItemTenorDays(parseInt(e.target.value))}
                        >
                          <option value="7">🗓️ 7 Hari (1 Minggu) - Bunga 10%</option>
                          <option value="14">🗓️ 14 Hari (2 Minggu) - Bunga 15%</option>
                          <option value="21">🗓️ 21 Hari (3 Minggu) - Bunga 15%</option>
                          <option value="30">🗓️ 30 Hari (1 Bulan) - Bunga 20%</option>
                        </select>

                        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small">
                          <div>
                            <span className="text-muted">Estimasi Bunga ({itemTenorDays <= 7 ? '10%' : itemTenorDays <= 21 ? '15%' : '20%'}): </span>
                            <strong className="text-primary">{formatRupiah(parseIndonesianAmount(pawnAmount) * (itemTenorDays <= 7 ? 0.10 : itemTenorDays <= 21 ? 0.15 : 0.20))}</strong>
                          </div>
                          <div>
                            <span className="text-muted">Estimasi Tebusan: </span>
                            <strong className="text-success">{formatRupiah(parseIndonesianAmount(pawnAmount) + (parseIndonesianAmount(pawnAmount) * (itemTenorDays <= 7 ? 0.10 : itemTenorDays <= 21 ? 0.15 : 0.20)))}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label text-muted fw-semibold small" style={{ fontSize: '0.8rem' }}>Ganti Foto Barang (Opsional)</label>
                      <input type="file" accept="image/*" className="form-control" onChange={handleFileChange} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowEditModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-warning py-2 px-4 fw-bold text-white" disabled={formLoading}>
                    {formLoading ? 'Memperbarui...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Modal */}
      {showDeleteModal && deletingItem && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-trash-fill text-danger fs-4"></i> Hapus Barang Jaminan
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body p-4 text-center">
                {deleteError && (
                  <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small text-start">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i> {deleteError}
                  </div>
                )}
                <i className="bi bi-box-seam text-warning fs-1 mb-2 d-block"></i>
                <p className="mb-1 text-dark fw-bold fs-5">{deletingItem.name}</p>
                <p className="text-muted small">Pemilik: {deletingItem.customer?.name}</p>
                <p className="text-muted small mb-0">Apakah Anda yakin ingin menghapus barang jaminan ini?</p>
              </div>
              <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>
                  Batal
                </button>
                <button type="button" className="btn btn-danger py-2 px-4 fw-bold" onClick={handleDeleteItemConfirm} disabled={deleteLoading}>
                  {deleteLoading ? 'Menghapus...' : 'Ya, Hapus Barang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewerPhotoUrl && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060 }} onClick={() => setViewerPhotoUrl('')}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content overflow-hidden border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4 justify-content-between">
                <h5 className="modal-title fw-bold text-dark">Foto Barang Jaminan</h5>
                <button type="button" className="btn-close" onClick={() => setViewerPhotoUrl('')}></button>
              </div>
              <div className="modal-body p-4 bg-light text-center">
                <img src={viewerPhotoUrl} alt="Foto Barang" className="img-fluid rounded-3 border max-vh-50" style={{ maxHeight: '380px' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;
