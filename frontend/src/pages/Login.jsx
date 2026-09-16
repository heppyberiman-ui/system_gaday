import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import pawnHeroImg from '../assets/pawn_hero.jpg';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Reset Password Modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1: Input Phone, 2: Input OTP, 3: New Password
  const [otpPhone, setOtpPhone] = useState('082288110375');
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [simulatedWA, setSimulatedWA] = useState(null); // Floating simulated WhatsApp notification banner

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan password harus diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });

      const { token, user } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = err.response?.data?.message || 'Login gagal. Periksa username & password Anda.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP to WhatsApp
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!otpPhone || otpPhone.trim().length < 9) {
      setOtpError('Masukkan nomor telepon WhatsApp yang valid');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    setOtpSuccessMsg('');

    try {
      const res = await api.post('/auth/request-otp', { phone: otpPhone.trim() });
      const data = res.data.data;

      setOtpSuccessMsg(data.message);
      if (data.otpDemo) {
        setSimulatedWA({ phone: data.phone, code: data.otpDemo });
      }
      setOtpStep(2);
    } catch (err) {
      console.error('Request OTP Error:', err);
      const msg = err.response?.data?.message || 'Gagal mengirim kode OTP. Pastikan nomor terdaftar.';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (!otpCodeInput || otpCodeInput.trim().length !== 6) {
      setOtpError('Masukkan 6-digit kode OTP dengan benar');
      return;
    }
    setOtpError('');
    setOtpStep(3);
  };

  // Step 3: Reset & Save New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 4) {
      setOtpError('Password baru minimal 4 karakter');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setOtpError('Konfirmasi password baru tidak cocok');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      const res = await api.post('/auth/reset-password-otp', {
        phone: otpPhone.trim(),
        otpCode: otpCodeInput.trim(),
        newPassword: newPasswordInput.trim()
      });

      const data = res.data.data;
      setSuccessNotice(`Password berhasil diperbarui! Silakan masuk dengan akun ${data.username || 'Anda'}.`);
      setUsername(data.username || 'admin');
      setPassword(newPasswordInput.trim());

      // Reset modal state
      setShowForgotModal(false);
      setOtpStep(1);
      setOtpCodeInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err) {
      console.error('Reset Password Error:', err);
      const msg = err.response?.data?.message || 'Gagal mereset password. Pastikan kode OTP benar.';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setShowForgotModal(true);
    setOtpStep(1);
    setOtpPhone('082288110375');
    setOtpError('');
    setOtpSuccessMsg('');
    setOtpCodeInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
  };

  return (
    <div className="login-page-bg position-relative">
      
      {/* SIMULATED WHATSAPP NOTIFICATION POPUP */}
      {simulatedWA && (
        <div 
          className="position-fixed top-0 end-0 m-3 p-3 bg-white rounded-4 shadow-lg border-start border-success border-4" 
          style={{ zIndex: 9999, maxWidth: '360px', animation: 'fadeInDown 0.4s ease' }}
        >
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-whatsapp fs-5 text-success"></i>
              <strong className="text-dark" style={{ fontSize: '0.9rem' }}>WhatsApp (Simulasi Gateway)</strong>
            </div>
            <button type="button" className="btn-close btn-sm" onClick={() => setSimulatedWA(null)}></button>
          </div>
          <p className="text-muted mb-2 small" style={{ lineHeight: '1.4' }}>
            Pesan untuk <strong>{simulatedWA.phone}</strong>:<br/>
            <span className="text-dark bg-light p-1.5 rounded d-block mt-1">
              "Kode OTP Reset Password Sistem Gadai Anda adalah: <strong className="text-success fs-6">{simulatedWA.code}</strong>. Berlaku 5 menit."
            </span>
          </p>
          <button 
            type="button" 
            className="btn btn-sm btn-outline-success w-100 py-1 rounded-pill small fw-bold"
            onClick={() => {
              setOtpCodeInput(simulatedWA.code);
              setSimulatedWA(null);
            }}
          >
            <i className="bi bi-clipboard-check me-1"></i> Isi Otomatis OTP ({simulatedWA.code})
          </button>
        </div>
      )}

      <div className="login-card-container">
        
        {/* LEFT SECTION: BRANDING & PAWN ITEMS ILLUSTRATION */}
        <div className="login-left-section">
          <div>
            {/* Logo Brand Header */}
            <div className="d-flex align-items-center gap-2.5 mb-4">
              <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '42px', height: '42px' }}>
                <i className="bi bi-bank2 fs-4"></i>
              </div>
              <div>
                <h5 className="fw-bold mb-0 text-dark" style={{ letterSpacing: '-0.3px' }}>Sistem Informasi Gadai</h5>
                <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: '500' }}>PawnHub POS & CRM Management Engine</span>
              </div>
            </div>

            {/* Headline & Subtitle */}
            <div className="mb-3">
              <h3 className="fw-extrabold text-primary mb-1" style={{ fontSize: '1.65rem', letterSpacing: '-0.5px' }}>
                Gadai HP, Laptop, TV & Kamera
              </h3>
              <p className="text-secondary mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                Sistem Penaksiran & Manajemen Gadai Barang Elektronik & Perhiasan Terpercaya
              </p>
            </div>
          </div>

          {/* Featured Hero Graphic */}
          <div className="my-3 text-center position-relative">
            <div className="rounded-4 overflow-hidden shadow-sm border border-light p-2 bg-white" style={{ transition: 'transform 0.3s ease' }}>
              <img 
                src={pawnHeroImg} 
                alt="Illustrasi Gadai Barang Elektronik (HP, Laptop, TV, Kamera)" 
                className="img-fluid rounded-3"
                style={{ maxHeight: '250px', objectFit: 'cover', width: '100%' }}
              />
            </div>
          </div>

          {/* Category Badges / Pawnable Items */}
          <div>
            <div className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.8px' }}>
              Kategori Barang Terima Gadai:
            </div>
            <div className="d-flex flex-wrap gap-2">
              <span className="pawn-category-pill">
                <i className="bi bi-phone-fill"></i> Smartphone & HP
              </span>
              <span className="pawn-category-pill">
                <i className="bi bi-laptop-fill"></i> Laptop & Computer
              </span>
              <span className="pawn-category-pill">
                <i className="bi bi-tv-fill"></i> Smart TV
              </span>
              <span className="pawn-category-pill">
                <i className="bi bi-camera-fill"></i> Kamera DSLR
              </span>
              <span className="pawn-category-pill">
                <i className="bi bi-gem"></i> Emas & Perhiasan
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: BLUE GRADIENT CONTAINER WITH ORGANIC WAVE & LOGIN FORM */}
        <div className="login-right-section">
          {/* Organic Wave Divider SVG (Left Edge of Right Section) */}
          <svg className="login-wave-svg" viewBox="0 0 120 800" preserveAspectRatio="none">
            <path 
              d="M120,0 L120,800 L35,800 C95,660 -15,520 45,380 C105,240 15,120 45,0 Z" 
              fill="url(#loginGradient)" 
            />
            <defs>
              <linearGradient id="loginGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0b132b" />
                <stop offset="55%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>

          {/* Background Glow Orbs */}
          <div className="login-right-glow-1"></div>
          <div className="login-right-glow-2"></div>

          <div className="position-relative" style={{ zIndex: 5 }}>
            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="fw-extrabold text-white mb-1" style={{ letterSpacing: '0.5px' }}>SIGN IN</h2>
              <p className="text-white-50 small mb-0">TO ACCESS THE PORTAL</p>
            </div>

            {/* Success Notice */}
            {successNotice && (
              <div className="alert alert-success border-0 d-flex align-items-center gap-2 py-2 px-3 mb-4 rounded-3 text-white" role="alert" style={{ background: 'rgba(16, 185, 129, 0.95)', fontSize: '0.85rem' }}>
                <i className="bi bi-check-circle-fill fs-5"></i>
                <div>{successNotice}</div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="alert alert-danger border-0 d-flex align-items-center gap-2 py-2 px-3 mb-4 rounded-3 text-white" role="alert" style={{ background: 'rgba(239, 68, 68, 0.9)', fontSize: '0.85rem' }}>
                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                <div>{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mb-4">
              <div className="login-input-group">
                <input 
                  type="text" 
                  className="login-input-field" 
                  placeholder="Enter User Name Here" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  required
                />
                <i className="bi bi-person-fill login-input-icon"></i>
              </div>

              <div className="login-input-group mb-2">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="login-input-field" 
                  placeholder="Enter Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <i className="bi bi-lock-fill login-input-icon"></i>
                <button 
                  type="button" 
                  className="login-input-toggle" 
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                </button>
              </div>

              <div className="text-end mb-3">
                <button 
                  type="button" 
                  className="btn btn-link text-white-50 p-0 small text-decoration-none hover-white"
                  onClick={handleOpenForgotModal}
                  style={{ fontSize: '0.82rem' }}
                >
                  Lupa Password via OTP WhatsApp?
                </button>
              </div>

              <button 
                type="submit" 
                className="btn btn-login-glow mt-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Memproses masuk...
                  </>
                ) : (
                  <>
                    Login <i className="bi bi-arrow-right-short fs-4"></i>
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials Box */}
            <div className="demo-credential-pill">
              <div className="fw-semibold text-white mb-0.5">Kredensial Demo Superadmin:</div>
              <div className="opacity-90">
                Username: <code className="text-warning fw-bold">admin</code> &bull; Password: <code className="text-warning fw-bold">admin123</code> &bull; Telp: <code className="text-warning fw-bold">082288110375</code>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL LUPA PASSWORD VIA WHATSAPP OTP */}
      {showForgotModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1.25rem' }}>
              <div className="modal-header bg-success text-white border-0 py-3" style={{ borderTopLeftRadius: '1.25rem', borderTopRightRadius: '1.25rem' }}>
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-whatsapp fs-4"></i> Reset Password via OTP WhatsApp
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowForgotModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4 text-dark">
                {/* Wizard Step Indicator */}
                <div className="d-flex align-items-center justify-content-between mb-4 px-2">
                  <div className={`d-flex align-items-center gap-2 ${otpStep >= 1 ? 'text-success fw-bold' : 'text-muted'}`}>
                    <span className={`badge rounded-circle ${otpStep >= 1 ? 'bg-success' : 'bg-secondary'}`}>1</span> No HP
                  </div>
                  <div className="flex-grow-1 border-top mx-2"></div>
                  <div className={`d-flex align-items-center gap-2 ${otpStep >= 2 ? 'text-success fw-bold' : 'text-muted'}`}>
                    <span className={`badge rounded-circle ${otpStep >= 2 ? 'bg-success' : 'bg-secondary'}`}>2</span> Kode OTP
                  </div>
                  <div className="flex-grow-1 border-top mx-2"></div>
                  <div className={`d-flex align-items-center gap-2 ${otpStep >= 3 ? 'text-success fw-bold' : 'text-muted'}`}>
                    <span className={`badge rounded-circle ${otpStep >= 3 ? 'bg-success' : 'bg-secondary'}`}>3</span> Password Baru
                  </div>
                </div>

                {otpError && (
                  <div className="alert alert-danger border-0 d-flex align-items-center gap-2 py-2 px-3 mb-3 rounded-3" role="alert" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
                    <div>{otpError}</div>
                  </div>
                )}

                {otpSuccessMsg && (
                  <div className="alert alert-success border-0 d-flex align-items-center gap-2 py-2 px-3 mb-3 rounded-3" role="alert" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-check-circle-fill text-success fs-5"></i>
                    <div>{otpSuccessMsg}</div>
                  </div>
                )}

                {/* STEP 1: INPUT PHONE NUMBER */}
                {otpStep === 1 && (
                  <form onSubmit={handleRequestOTP}>
                    <p className="text-secondary small mb-3">
                      Masukkan nomor telepon WhatsApp terdaftar Anda. Kode OTP 6-digit akan dikirimkan ke WhatsApp Anda.
                    </p>
                    <div className="mb-3">
                      <label className="form-label fw-bold text-dark small">Nomor Telepon WhatsApp</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted"><i className="bi bi-telephone-fill"></i></span>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="082288110375" 
                          value={otpPhone} 
                          onChange={(e) => setOtpPhone(e.target.value)}
                          disabled={otpLoading}
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-success w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm mt-4"
                      disabled={otpLoading}
                    >
                      {otpLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Sending OTP via WhatsApp...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-whatsapp"></i> Kirim Kode OTP (WhatsApp)
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* STEP 2: VERIFY OTP CODE */}
                {otpStep === 2 && (
                  <form onSubmit={handleVerifyOTP}>
                    <p className="text-secondary small mb-3">
                      Kode OTP 6-digit telah dikirimkan ke <strong>{otpPhone}</strong>. Masukkan kode tersebut di bawah ini.
                    </p>

                    <div className="mb-3 text-center">
                      <label className="form-label fw-bold text-dark small mb-2">Kode OTP (6 Digit)</label>
                      <input 
                        type="text" 
                        className="form-control text-center fw-extrabold text-success fs-4 tracking-widest" 
                        placeholder="0 0 0 0 0 0" 
                        maxLength={6}
                        value={otpCodeInput} 
                        onChange={(e) => setOtpCodeInput(e.target.value)}
                        disabled={otpLoading}
                        style={{ letterSpacing: '8px' }}
                        autoFocus
                        required
                      />
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <button 
                        type="button" 
                        className="btn btn-link text-muted p-0 small text-decoration-none"
                        onClick={() => setOtpStep(1)}
                      >
                        &laquo; Ubah No. HP
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-link text-success p-0 small text-decoration-none fw-bold"
                        onClick={handleRequestOTP}
                        disabled={otpLoading}
                      >
                        Kirim Ulang OTP
                      </button>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-success w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm mt-3"
                      disabled={otpLoading}
                    >
                      Verifikasi Kode OTP <i className="bi bi-arrow-right"></i>
                    </button>
                  </form>
                )}

                {/* STEP 3: CREATE NEW PASSWORD */}
                {otpStep === 3 && (
                  <form onSubmit={handleResetPassword}>
                    <p className="text-secondary small mb-3">
                      Kode OTP Terverifikasi! Silakan masukkan password baru untuk akun Anda.
                    </p>

                    <div className="mb-3">
                      <label className="form-label fw-bold text-dark small">Password Baru</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted"><i className="bi bi-lock-fill"></i></span>
                        <input 
                          type={showNewPassword ? 'text' : 'password'} 
                          className="form-control" 
                          placeholder="Password Baru (min 4 Karakter)" 
                          value={newPasswordInput} 
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          disabled={otpLoading}
                          required
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary" 
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          <i className={`bi ${showNewPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold text-dark small">Konfirmasi Password Baru</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted"><i className="bi bi-shield-lock-fill"></i></span>
                        <input 
                          type={showNewPassword ? 'text' : 'password'} 
                          className="form-control" 
                          placeholder="Ketik Ulang Password Baru" 
                          value={confirmPasswordInput} 
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          disabled={otpLoading}
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-success w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm mt-4"
                      disabled={otpLoading}
                    >
                      {otpLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle-fill"></i> Simpan &amp; Reset Password
                        </>
                      )}
                    </button>
                  </form>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;


