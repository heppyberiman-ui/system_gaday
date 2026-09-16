import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Navbar = ({ onToggleMobile }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Profile Edit Modal States
  const [showModal, setShowModal] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Retrieve logged-in user profile from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setFullNameInput(parsed.fullName || '');
      } catch (e) {
        console.error('Failed to parse user profile', e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleOpenModal = () => {
    if (user) {
      setFullNameInput(user.fullName || '');
    }
    setPasswordInput('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await api.put('/auth/profile', {
        fullName: fullNameInput.trim(),
        password: passwordInput ? passwordInput.trim() : undefined
      });

      const updatedUser = {
        ...user,
        fullName: response.data.data.fullName
      };

      // Update localStorage & Navbar state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setSuccessMsg('Nama profil akun berhasil diperbarui!');

      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (err) {
      console.error('Error updating user profile name:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal mengubah nama profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="app-navbar">
        {/* Navbar Left: Menu Toggle */}
        <div className="d-flex align-items-center gap-3">
          <button 
            onClick={onToggleMobile} 
            className="btn btn-light d-lg-none p-2 rounded-3 border"
            title="Toggle Navigation Menu"
          >
            <i className="bi bi-list fs-4"></i>
          </button>
          <div className="d-none d-sm-block">
            <span className="fw-semibold text-muted d-block" style={{ fontSize: '0.75rem' }}>Cabang Aktif</span>
            <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
              <i className="bi bi-shop text-primary me-1"></i>
              BELVIN88 CELLULAR
            </span>
          </div>
        </div>

        {/* Navbar Right: Profile & Actions */}
        <div className="d-flex align-items-center gap-3">
          {/* Quick Help Link */}
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-light border p-2 rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '38px', height: '38px' }}
            title="Bantuan & Dukungan"
          >
            <i className="bi bi-question-circle fs-5 text-muted"></i>
          </a>

          {/* User Dropdown */}
          <div className="dropdown">
            <button 
              className="btn btn-light border d-flex align-items-center gap-2 p-2 rounded-3" 
              type="button" 
              data-bs-toggle="dropdown" 
              aria-expanded="false"
            >
              <i className="bi bi-person-circle fs-5 text-primary"></i>
              <span className="fw-bold d-none d-md-inline text-dark" style={{ fontSize: '0.875rem' }}>
                {user ? user.fullName : 'Kasir Aktif'}
              </span>
              <i className="bi bi-chevron-down text-muted" style={{ fontSize: '0.75rem' }}></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm border p-2" style={{ minWidth: '220px', borderRadius: '0.75rem' }}>
              <li className="px-3 py-2 border-bottom mb-2">
                <div className="fw-bold text-dark" style={{ fontSize: '0.875rem' }}>
                  {user ? user.fullName : 'Pengguna'}
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Role: <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold">{user ? user.role : 'GUEST'}</span>
                </div>
              </li>
              <li>
                <button 
                  onClick={handleOpenModal} 
                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2 text-primary fw-semibold"
                  style={{ fontSize: '0.875rem' }}
                >
                  <i className="bi bi-pencil-square"></i> Ubah Nama Akun
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/settings')} 
                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2 text-dark"
                  style={{ fontSize: '0.875rem' }}
                >
                  <i className="bi bi-person-gear text-muted"></i> Pengaturan Toko
                </button>
              </li>
              <li>
                <button 
                  onClick={handleLogout} 
                  className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2 text-danger mt-1"
                  style={{ fontSize: '0.875rem' }}
                >
                  <i className="bi bi-box-arrow-right"></i> Keluar (Logout)
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Modal Edit Nama Akun Profil */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-bottom py-3 px-4">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-person-bounding-box text-primary"></i> Ubah Nama Akun Profil
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSaveProfile}>
                <div className="modal-body p-4">
                  {errorMsg && (
                    <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i> {errorMsg}
                    </div>
                  )}
                  {successMsg && (
                    <div className="alert alert-success py-2 px-3 mb-3 border-success-subtle rounded-3 small">
                      <i className="bi bi-check-circle-fill me-1"></i> {successMsg}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label text-dark fw-bold small">Nama Akun Lengkap <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control form-control-lg fw-semibold" 
                      placeholder="Masukkan nama baru Anda" 
                      value={fullNameInput} 
                      onChange={(e) => setFullNameInput(e.target.value)} 
                      required 
                    />
                    <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                      Nama ini akan ditampilkan pada navbar atas dan cetak nota kasir.
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label text-dark fw-semibold small">Password Baru (Opsional)</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Kosongkan jika tidak ingin mengubah password" 
                      value={passwordInput} 
                      onChange={(e) => setPasswordInput(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="modal-footer border-top py-3 px-4 bg-light d-flex gap-2 justify-content-end" style={{ borderRadius: '0 0 1rem 1rem' }}>
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary py-2 px-4 fw-bold" disabled={loading}>
                    {loading ? 'Menyimpan...' : 'Simpan Nama Baru'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
