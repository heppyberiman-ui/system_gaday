import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form input states
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [defaultInterestRate, setDefaultInterestRate] = useState('10.0');
  const [defaultAdminFee, setDefaultAdminFee] = useState('0');
  const [defaultDurationDays, setDefaultDurationDays] = useState(30);
  const [termsConditions, setTermsConditions] = useState(
    '1. Mengikuti Seluruh Aturan Yang Berlaku Di Toko Gadai.\n2. Barang Yang Digadaikan Adalah Milik Pribadi Dan Bukan Hasil Tindak Kejahatan.\n3. Menyetujui Jumlah Tebusan Tidak Ada Pengurangan Apabila Pengambilan Barang Sebelum Jatuh Tempo.\n4. Menyetujui Denda Keterlambatan Sebesar 1% Perhari Dari Besar Gadai.\n5. Menerima Dan Menyetujui Barang Menjadi Hak Milik Toko Apabila Sudah Melewati 1 (satu) Minggu Setelah Jatuh Tempo.'
  );
  const [waGatewayToken, setWaGatewayToken] = useState('');

  // Store photo states
  const [storePhotoFile, setStorePhotoFile] = useState(null);
  const [storePhotoPreview, setStorePhotoPreview] = useState('');

  // Form handling states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Clear data modal / loading state
  const [clearLoading, setClearLoading] = useState(false);

  // Backup & Restore states
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);

  // User profile states
  const [userFullName, setUserFullName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    setFormError('');
    setSuccessMsg('');
    try {
      const response = await api.get('/settings/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.setAttribute('download', `gaday_db_backup_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccessMsg('File backup database JSON berhasil di-download!');
    } catch (err) {
      console.error('Error downloading backup:', err);
      setFormError('Gagal men-download file backup database.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (e) => {
    e.preventDefault();
    if (!restoreFile) {
      setFormError('Pilih file backup (.json) terlebih dahulu.');
      return;
    }

    const confirmed = window.confirm(
      'PERHATIAN DENGAN SANGAT!\n\nProses restore akan MENGGANTI SELURUH DATA DATABASE SAAT INI dengan data dari file backup.\n\nApakah Anda yakin ingin melanjutkan proses restore?'
    );
    if (!confirmed) return;

    setRestoreLoading(true);
    setFormError('');
    setSuccessMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonPayload = JSON.parse(event.target.result);
          const response = await api.post('/settings/restore', jsonPayload);
          setSuccessMsg(response.data?.message || 'Database berhasil di-restore secara utuh!');
          setRestoreFile(null);
          fetchSettings();
        } catch (parseErr) {
          setFormError('Format file backup JSON tidak valid atau rusak: ' + parseErr.message);
        } finally {
          setRestoreLoading(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (err) {
      console.error('Error restoring backup:', err);
      setFormError(err.response?.data?.message || 'Gagal merestore database.');
      setRestoreLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setUserFullName(parsed.fullName || '');
      } catch (e) {
        console.error('Failed to parse user profile', e);
      }
    }
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      const config = response.data.data;
      if (config) {
        setSettings(config);
        setStoreName(config.storeName || '');
        setStoreAddress(config.storeAddress || '');
        setStorePhone(config.storePhone || '');
        setDefaultInterestRate(String(config.defaultInterestRate));
        setDefaultAdminFee(String(config.defaultAdminFee));
        setDefaultDurationDays(config.defaultDurationDays);
        if (config.termsConditions) {
          setTermsConditions(config.termsConditions);
        }
        if (config.waGatewayToken) {
          setWaGatewayToken(config.waGatewayToken);
        }
        if (config.storePhotoPath) {
          const fullUrl = config.storePhotoPath.startsWith('http') 
            ? config.storePhotoPath 
            : `${api.defaults.baseURL.replace('/api', '')}${config.storePhotoPath}`;
          setStorePhotoPreview(fullUrl);
        }
      }
      setError('');
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Gagal memuat konfigurasi pengaturan toko.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setSuccessMsg('');

    if (!storeName.trim()) {
      setFormError('Nama toko tidak boleh kosong.');
      setFormLoading(false);
      return;
    }
    if (isNaN(parseFloat(defaultInterestRate)) || parseFloat(defaultInterestRate) < 0) {
      setFormError('Suku bunga harus berupa angka positif.');
      setFormLoading(false);
      return;
    }
    if (isNaN(parseFloat(defaultAdminFee)) || parseFloat(defaultAdminFee) < 0) {
      setFormError('Biaya admin harus berupa angka positif.');
      setFormLoading(false);
      return;
    }
    if (isNaN(parseInt(defaultDurationDays)) || parseInt(defaultDurationDays) <= 0) {
      setFormError('Jangka waktu pinjaman harus berupa angka bulat lebih dari 0.');
      setFormLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('storeName', storeName);
      formData.append('storeAddress', storeAddress);
      formData.append('storePhone', storePhone);
      formData.append('defaultInterestRate', parseFloat(defaultInterestRate));
      formData.append('defaultAdminFee', parseFloat(defaultAdminFee));
      formData.append('defaultDurationDays', parseInt(defaultDurationDays));
      formData.append('termsConditions', termsConditions);
      formData.append('waGatewayToken', waGatewayToken);
      if (settings?.storeId) {
        formData.append('storeId', settings.storeId);
      }
      if (storePhotoFile) {
        formData.append('storePhoto', storePhotoFile);
      }

      const response = await api.put('/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMsg('Pengaturan konfigurasi toko & foto toko berhasil diperbarui!');
      if (response.data.data) {
        setSettings(response.data.data);
        if (response.data.data.storePhotoPath) {
          const fullUrl = response.data.data.storePhotoPath.startsWith('http') 
            ? response.data.data.storePhotoPath 
            : `${api.defaults.baseURL.replace('/api', '')}${response.data.data.storePhotoPath}`;
          setStorePhotoPreview(fullUrl);
        }
      }
    } catch (err) {
      console.error('Error updating settings:', err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan perubahan pengaturan.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      'APAKAH ANDA YAKIN?\n\nTindakan ini akan MENGHAPUS SELURUH DATA transaksi, nasabah, barang jaminan, riwayat pembayaran, arus kas, dan pengeluaran.\n\nData yang dihapus TIDAK DAPAT DIKEMBALIKAN. Lanjutkan?'
    );
    if (!confirmed) return;

    setClearLoading(true);
    setFormError('');
    setSuccessMsg('');

    try {
      const response = await api.delete('/settings/clear-data');
      setSuccessMsg(response.data?.message || 'Seluruh data transaksi dan nasabah berhasil dibersihkan.');
    } catch (err) {
      console.error('Error clearing data:', err);
      setFormError(err.response?.data?.message || 'Gagal menghapus data.');
    } finally {
      setClearLoading(false);
    }
  };

  const handleSaveUserProfile = async (e) => {
    e.preventDefault();
    if (!userFullName.trim()) {
      setProfileError('Nama lengkap tidak boleh kosong');
      return;
    }

    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const response = await api.put('/auth/profile', {
        fullName: userFullName.trim(),
        password: userPassword ? userPassword.trim() : undefined
      });

      const updatedUser = {
        ...user,
        fullName: response.data.data.fullName
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setUserPassword('');
      setProfileSuccess('Nama akun pengguna berhasil diperbarui!');
    } catch (err) {
      console.error('Error updating profile in Settings:', err);
      setProfileError(err.response?.data?.message || 'Gagal mengubah profil pengguna.');
    } finally {
      setProfileLoading(false);
    }
  };

  const isReadOnly = user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN';

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Hero Banner Header */}
      <div className="hero-banner-blue mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h2 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-gear-fill"></i> Pengaturan Konfigurasi Toko
          </h2>
          <p className="text-white-50 mb-0 small">Kelola foto toko, profil cabang, dan parameter default transaksi gadai Belvin88Cellular</p>
        </div>
        <div className="bg-white bg-opacity-15 text-white px-3 py-2 rounded-3 border border-white border-opacity-25 d-flex align-items-center gap-2">
          <i className="bi bi-gear-wide-connected fs-4 text-warning"></i>
          <div>
            <div className="fw-bold" style={{ fontSize: '0.85rem' }}>Belvin88 System</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>v1.0.0 (Production)</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div>{error}</div>
        </div>
      )}

      {isReadOnly && (
        <div className="alert alert-warning border border-warning-subtle shadow-sm d-flex align-items-start gap-3 p-3 mb-4" role="alert">
          <i className="bi bi-shield-lock-fill text-warning fs-3"></i>
          <div>
            <h6 className="fw-bold mb-1">Akses Terbatas (Mode Baca Saja)</h6>
            <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
              Akun Anda saat ini memiliki role <strong>{user?.role}</strong> (Kasir). 
              Hanya akun bertipe <strong>Admin</strong> atau <strong>Super Admin</strong> yang diperkenankan untuk merubah setelan parameter default gadai atau informasi cabang ini.
            </p>
          </div>
        </div>
      )}

      <div className="row">
        {/* Left Column: Form Settings */}
        <div className="col-lg-8 mb-4">
          <div className="card card-premium">
            <div className="card-header bg-transparent border-bottom py-3 px-4">
              <h5 className="fw-bold text-dark mb-0">Form Parameter Konfigurasi</h5>
            </div>
            <div className="card-body p-4">
              {formError && (
                <div className="alert alert-danger border-0 d-flex align-items-center gap-2" role="alert">
                  <i className="bi bi-x-circle-fill"></i>
                  <div>{formError}</div>
                </div>
              )}
              {successMsg && (
                <div className="alert alert-success border-0 d-flex align-items-center gap-2" role="alert">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>{successMsg}</div>
                </div>
              )}

              <form onSubmit={handleSaveSettings}>
                <h6 className="text-primary fw-bold text-uppercase tracking-wide mb-3" style={{ fontSize: '0.8rem' }}>Profil Cabang / Toko</h6>
                
                {/* Foto Toko Upload Section */}
                <div className="mb-4 p-3 bg-light rounded-3 border">
                  <label className="form-label fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                    <i className="bi bi-image-fill text-primary"></i> Foto Toko / Logo Cabang
                  </label>
                  <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3">
                    <div className="position-relative" style={{ width: '120px', height: '90px', minWidth: '120px' }}>
                      {storePhotoPreview ? (
                        <img 
                          src={storePhotoPreview} 
                          alt="Foto Toko" 
                          className="w-100 h-100 rounded-3 object-fit-cover border border-2 border-white shadow-sm" 
                        />
                      ) : (
                        <div className="w-100 h-100 rounded-3 bg-white border border-dashed d-flex flex-column align-items-center justify-content-center text-muted">
                          <i className="bi bi-shop fs-3"></i>
                          <span style={{ fontSize: '0.65rem' }}>Belum ada foto</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/jpg,image/webp" 
                        className="form-control form-control-sm mb-1" 
                        disabled={isReadOnly || formLoading}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setStorePhotoFile(file);
                            setStorePhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Unggah gambar toko atau logo resmi (Maks. 5 MB - JPG, PNG, WEBP).
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark">Nama Cabang / Toko <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control bg-light border-0 py-2 px-3 rounded-2"
                      placeholder="Masukkan nama cabang"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      disabled={isReadOnly || formLoading}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark">No. Telepon Toko</label>
                    <input
                      type="text"
                      className="form-control bg-light border-0 py-2 px-3 rounded-2"
                      placeholder="Masukkan nomor telepon"
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      disabled={isReadOnly || formLoading}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-dark">Alamat Lengkap Toko</label>
                    <textarea
                      className="form-control bg-light border-0 py-2 px-3 rounded-2"
                      rows="2"
                      placeholder="Masukkan alamat lengkap"
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      disabled={isReadOnly || formLoading}
                    ></textarea>
                  </div>
                </div>

                <h6 className="text-primary fw-bold text-uppercase tracking-wide mb-3" style={{ fontSize: '0.8rem' }}>Parameter Default Gadai</h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-dark">Suku Bunga Default (%) <span className="text-danger">*</span></label>
                    <div className="input-group mb-1">
                      <input
                        type="number"
                        step="0.01"
                        className="form-control bg-light border-0 py-2 px-3 rounded-2"
                        placeholder="Misal: 10.0"
                        value={defaultInterestRate}
                        onChange={(e) => setDefaultInterestRate(e.target.value)}
                        disabled={isReadOnly || formLoading}
                        required
                      />
                      <span className="input-group-text bg-secondary-subtle border-0 fw-semibold">% / bulan</span>
                    </div>
                    <div className="d-flex gap-1">
                      {['10', '15', '20'].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${
                            String(defaultInterestRate) === rate
                              ? 'btn-primary text-white'
                              : 'btn-outline-secondary text-dark bg-white'
                          }`}
                          style={{ fontSize: '0.75rem' }}
                          disabled={isReadOnly || formLoading}
                          onClick={() => setDefaultInterestRate(rate)}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-dark">Biaya Administrasi (Rp) <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-secondary-subtle border-0 fw-semibold">Rp</span>
                      <input
                        type="number"
                        className="form-control bg-light border-0 py-2 px-3 rounded-2"
                        placeholder="Misal: 10000"
                        value={defaultAdminFee}
                        onChange={(e) => setDefaultAdminFee(e.target.value)}
                        disabled={isReadOnly || formLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-dark">Jangka Waktu Pinjaman <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control bg-light border-0 py-2 px-3 rounded-2"
                        placeholder="Misal: 30"
                        value={defaultDurationDays}
                        onChange={(e) => setDefaultDurationDays(e.target.value)}
                        disabled={isReadOnly || formLoading}
                        required
                      />
                      <span className="input-group-text bg-secondary-subtle border-0 fw-semibold">Hari</span>
                    </div>
                  </div>
                </div>

                <h6 className="text-primary fw-bold text-uppercase tracking-wide mb-3" style={{ fontSize: '0.8rem' }}>Syarat & Ketentuan Nota / Aturan Toko Gadai</h6>
                <div className="mb-4">
                  <label className="form-label fw-semibold text-dark">Daftar Poin Aturan & Ketentuan Gadai (Tercetak di Bagian Bawah Nota)</label>
                  <textarea
                    className="form-control bg-light border-0 py-2 px-3 rounded-2"
                    rows="6"
                    placeholder="Tuliskan aturan pasal gadai toko Anda di sini..."
                    value={termsConditions}
                    onChange={(e) => setTermsConditions(e.target.value)}
                    disabled={isReadOnly || formLoading}
                    style={{ fontSize: '0.88rem', lineHeight: '1.5' }}
                  ></textarea>
                </div>

                <h6 className="text-primary fw-bold text-uppercase tracking-wide mb-3" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-whatsapp me-1 text-success"></i> Konfigurasi WhatsApp Gateway (Opsional)
                </h6>
                <div className="mb-4">
                  <label className="form-label fw-semibold text-dark">API Key / Token WA Gateway (Fonnte / Wablas)</label>
                  <input
                    type="password"
                    className="form-control bg-light border-0 py-2 px-3 rounded-2 font-monospace"
                    placeholder="Masukkan Token Fonnte / Wablas API Key..."
                    value={waGatewayToken}
                    onChange={(e) => setWaGatewayToken(e.target.value)}
                    disabled={isReadOnly || formLoading}
                  />
                  <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                    <i className="bi bi-shield-lock me-1"></i> Token ini digunakan untuk integrasi WA Gateway otomatis. Pengiriman pengingat manual via WhatsApp Web tetap aktif tanpa token.
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="d-flex justify-content-end gap-2 border-top pt-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4 py-2"
                      onClick={fetchSettings}
                      disabled={formLoading}
                    >
                      Reset Ke Asal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4 py-2 d-inline-flex align-items-center gap-2"
                      disabled={formLoading}
                    >
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save-fill"></i>
                          Simpan Perubahan
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Card Edit Akun Profil Pengguna */}
          <div className="card card-premium mt-4">
            <div className="card-header bg-transparent border-bottom py-3 px-4">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-person-bounding-box text-primary"></i> Pengaturan Profil Akun Login Anda
              </h5>
            </div>
            <div className="card-body p-4">
              {profileError && (
                <div className="alert alert-danger border-0 d-flex align-items-center gap-2 mb-3" role="alert">
                  <i className="bi bi-x-circle-fill"></i>
                  <div>{profileError}</div>
                </div>
              )}
              {profileSuccess && (
                <div className="alert alert-success border-0 d-flex align-items-center gap-2 mb-3" role="alert">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>{profileSuccess}</div>
                </div>
              )}

              <form onSubmit={handleSaveUserProfile}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-dark">Nama Akun Lengkap <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control bg-light border-0 py-2 px-3 rounded-2 fw-semibold" 
                      placeholder="Misal: Belvin Manager" 
                      value={userFullName} 
                      onChange={(e) => setUserFullName(e.target.value)} 
                      required 
                    />
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                      Nama yang tampil di pojok kanan atas navbar dan cetak nota.
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark">Password Baru (Opsional)</label>
                    <input 
                      type="password" 
                      className="form-control bg-light border-0 py-2 px-3 rounded-2" 
                      placeholder="Kosongkan jika tidak ubah password" 
                      value={userPassword} 
                      onChange={(e) => setUserPassword(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end mt-3 pt-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary px-4 py-2 d-inline-flex align-items-center gap-2 fw-bold"
                    disabled={profileLoading}
                  >
                    {profileLoading ? 'Menyimpan Profile...' : 'Simpan Nama Akun Baru'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {!isReadOnly && (
            <div className="card card-premium mt-4">
              <div className="card-header bg-transparent border-bottom py-3 px-4">
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-database-fill-gear text-primary"></i> Backup & Restore Database System
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-4">
                  {/* Export Backup Column */}
                  <div className="col-md-6 border-end">
                    <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-download text-success fs-5"></i> Export / Download Backup Database
                    </h6>
                    <p className="text-muted small mb-3">
                      Unduh seluruh data nasabah, barang jaminan, nota transaksi, arus kas, dan pengaturan toko ke dalam file format <strong>JSON</strong> untuk arsip pengamanan berkala.
                    </p>
                    <button
                      type="button"
                      className="btn btn-success px-4 py-2 d-inline-flex align-items-center gap-2 fw-semibold"
                      onClick={handleDownloadBackup}
                      disabled={backupLoading}
                    >
                      {backupLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Mengunduh Backup...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-file-earmark-arrow-down-fill"></i> Download Backup Database (.json)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Import Restore Column */}
                  <div className="col-md-6">
                    <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-upload text-warning fs-5"></i> Import / Restore Database
                    </h6>
                    <p className="text-muted small mb-2">
                      Kembalikan data system secara utuh dari file backup <strong>.json</strong>.
                    </p>
                    <form onSubmit={handleRestoreBackup}>
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="form-control form-control-sm mb-2"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setRestoreFile(e.target.files[0]);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        className="btn btn-warning text-dark px-4 py-2 d-inline-flex align-items-center gap-2 fw-bold"
                        disabled={restoreLoading || !restoreFile}
                      >
                        {restoreLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            Memproses Restore...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-arrow-counterclockwise"></i> Restore Data dari File (.json)
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isReadOnly && (
            <div className="card border-danger-subtle shadow-sm mt-4">
              <div className="card-header bg-danger-subtle border-bottom border-danger-subtle py-3 px-4">
                <h5 className="fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i> Hapus & Reset Seluruh Data System
                </h5>
              </div>
              <div className="card-body p-4">
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                  Fitur ini digunakan untuk <strong>menghapus seluruh isi data transaksi, nasabah, barang gadai, arus kas, dan pengeluaran</strong> agar Anda dapat memulai pengisian data dari awal secara bersih.
                </p>
                <div className="alert alert-warning py-2 px-3 border-0 d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-info-circle-fill text-warning fs-5"></i>
                  <span>Akun login pengguna (Admin/Kasir) & nama toko tidak akan terhapus.</span>
                </div>
                <button
                  type="button"
                  className="btn btn-danger px-4 py-2 d-inline-flex align-items-center gap-2"
                  onClick={handleClearAllData}
                  disabled={clearLoading}
                >
                  {clearLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Sedang Menghapus Data...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash3-fill"></i>
                      Hapus Seluruh Data Transaksi
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Information Panel */}
        <div className="col-lg-4">
          {/* Kartu Skema Bunga Berdasarkan Tenor Toko */}
          <div className="card border-0 shadow-sm mb-4" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', borderRadius: '1rem' }}>
            <div className="card-body p-4">
              <h5 className="fw-bold mb-2 d-flex align-items-center gap-2">
                <i className="bi bi-clock-history"></i> Skema Bunga Berdasarkan Tenor Toko
              </h5>
              <p className="small mb-3 text-white-50">
                Aturan persentase suku bunga otomatis yang berlaku di toko Anda berdasarkan durasi pinjaman:
              </p>
              
              <div className="d-flex flex-column gap-2 mb-3">
                <div className="d-flex justify-content-between align-items-center bg-white bg-opacity-10 p-2.5 rounded-3">
                  <div className="fw-semibold small"><i className="bi bi-calendar-event me-2"></i> 1 Minggu (7 Hari)</div>
                  <span className="badge bg-warning text-dark fs-6 px-3 py-1">10%</span>
                </div>
                <div className="d-flex justify-content-between align-items-center bg-white bg-opacity-10 p-2.5 rounded-3">
                  <div className="fw-semibold small"><i className="bi bi-calendar-range me-2"></i> 2 - 3 Minggu (14 - 21 Hari)</div>
                  <span className="badge bg-light text-dark fs-6 px-3 py-1">15%</span>
                </div>
                <div className="d-flex justify-content-between align-items-center bg-white bg-opacity-10 p-2.5 rounded-3">
                  <div className="fw-semibold small"><i className="bi bi-calendar-month me-2"></i> 1 Bulan (30 Hari)</div>
                  <span className="badge bg-info text-dark fs-6 px-3 py-1">20%</span>
                </div>
              </div>

              <div className="small text-white-50" style={{ fontSize: '0.78rem' }}>
                <i className="bi bi-info-circle me-1"></i> Saat pengisian form transaksi baru, sistem akan otomatis mengatur persentase bunga ketika tenor dipilih.
              </div>
            </div>
          </div>

          <div className="card card-premium mb-4">
            <div className="card-header bg-transparent border-bottom py-3 px-4">
              <h5 className="fw-bold text-dark mb-0">Info & Rekomendasi</h5>
            </div>
            <div className="card-body p-4">
              <div className="d-flex gap-3 mb-3">
                <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                  <i className="bi bi-percent fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Penetapan Bunga</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>Bunga default diterapkan otomatis pada setiap transaksi gadai baru, tetapi petugas kasir tetap dapat menyesuaikannya secara manual saat pengisian form transaksi jika diperlukan.</p>
                </div>
              </div>
              
              <div className="d-flex gap-3 mb-3">
                <div className="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                  <i className="bi bi-credit-card-fill fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Biaya Admin Guna Operasional</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>Biaya admin default akan ditambahkan sebagai arus kas masuk dengan tipe pendapatan non-operasional guna membantu pengelolaan administrasi jaminan.</p>
                </div>
              </div>

              <div className="d-flex gap-3">
                <div className="bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                  <i className="bi bi-calendar-check-fill fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Masa Jatuh Tempo Gadai</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>Jangka waktu pinjaman default digunakan untuk menghitung tanggal jatuh tempo pinjaman secara otomatis sejak tanggal pencairan pinjaman dimulai.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-premium bg-light border-0 shadow-none">
            <div className="card-body p-4">
              <h6 className="fw-bold text-dark mb-2">Pemberitahuan Sistem</h6>
              <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                Perubahan pada data cabang/toko juga akan memengaruhi kop surat yang tercetak pada invoice pencairan gadai dan kuitansi pembayaran resmi nasabah.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
