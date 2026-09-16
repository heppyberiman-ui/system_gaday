import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 px-3" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <div className="card card-premium p-4 w-100 border-0 shadow-lg" style={{ maxWidth: '440px', borderRadius: '1.25rem' }}>
        <div className="text-center mb-4">
          <div className="bg-primary text-white rounded-4 d-inline-flex align-items-center justify-content-center mb-3 shadow" style={{ width: '64px', height: '64px' }}>
            <i className="bi bi-bank2 fs-2"></i>
          </div>
          <h4 className="fw-bold text-dark mb-1">Sistem Informasi Gadai</h4>
          <p className="text-muted small">PawnHub POS & CRM Management Engine</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3 border-danger-subtle rounded-3" role="alert" style={{ fontSize: '0.875rem' }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-floating mb-3">
            <input 
              type="text" 
              className="form-control" 
              id="username" 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
            <label htmlFor="username">
              <i className="bi bi-person-fill me-1 text-muted"></i> Username
            </label>
          </div>

          <div className="form-floating mb-4">
            <input 
              type="password" 
              className="form-control" 
              id="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
            <label htmlFor="password">
              <i className="bi bi-lock-fill me-1 text-muted"></i> Password
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
            disabled={loading}
            style={{ borderRadius: '0.625rem' }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Memproses masuk...
              </>
            ) : (
              <>
                Masuk Ke Sistem <i className="bi bi-arrow-right"></i>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-top text-center text-muted" style={{ fontSize: '0.78rem' }}>
          <div className="fw-semibold text-dark">Kredensial Demo Superadmin:</div>
          <div>Username: <code className="text-primary">admin</code> &bull; Password: <code className="text-primary">admin123</code></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
