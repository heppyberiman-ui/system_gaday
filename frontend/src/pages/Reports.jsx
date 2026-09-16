import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Reports = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchRevenueReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/revenue', {
        params: { year }
      });
      setReport(response.data.data);
      setError('');
    } catch (err) {
      console.error('Error fetching revenue report:', err);
      setError('Gagal memuat laporan keuangan tahunan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueReport();
  }, [year]);

  const getMonthName = (monthNum) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthNum - 1];
  };

  const formatRupiah = (val) => {
    if (val === undefined || val === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const monthlyData = report?.monthlyRevenue || [];

  const chartData = {
    labels: monthlyData.map(m => getMonthName(m.month)),
    datasets: [
      {
        label: 'Pendapatan Bersih (Rp)',
        data: monthlyData.map(m => m.total),
        backgroundColor: '#2563eb',
        borderRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b' }
      }
    }
  };

  return (
    <div>
      {/* Hero Banner Header */}
      <div className="hero-banner-blue mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div>
          <h3 className="fw-bold mb-1 text-white d-flex align-items-center gap-2">
            <i className="bi bi-graph-up-arrow"></i> Laporan Pendapatan Keuangan
          </h3>
          <p className="mb-0 text-white-50 small">Rincian bulanan pemasukan bunga, denda pelunasan, dan administrasi gadai</p>
        </div>
        <select 
          className="form-select w-auto border-0 fw-bold bg-white text-dark shadow-sm rounded-3" 
          value={year} 
          onChange={(e) => setYear(parseInt(e.target.value))}
          style={{ padding: '0.5rem 2rem 0.5rem 1rem' }}
        >
          <option value="2026">Tahun 2026</option>
          <option value="2025">Tahun 2025</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-danger py-2.5 px-3 mb-4 rounded-3 border-danger-subtle small">
          <i className="bi bi-exclamation-triangle-fill"></i> {error}
        </div>
      )}

      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <div className="text-muted fw-semibold">Memproses data laporan keuangan...</div>
        </div>
      ) : (
        <div className="row g-4">
          {/* Revenue Chart Card */}
          <div className="col-12 col-xl-8">
            <div className="card card-premium p-4 h-100">
              <h5 className="fw-bold text-dark mb-4">Grafik Pendapatan Toko Tahun {year}</h5>
              <div style={{ height: '320px', position: 'relative' }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Revenue Summary Card */}
          <div className="col-12 col-xl-4">
            <div className="card card-premium p-4 h-100 bg-primary text-white border-0">
              <div className="d-flex flex-column h-100 justify-content-between">
                <div>
                  <div className="bg-white bg-opacity-20 text-white rounded-3 p-2 d-inline-flex mb-3">
                    <i className="bi bi-piggy-bank fs-4"></i>
                  </div>
                  <h6 className="fw-medium text-white-50 text-uppercase tracking-wider" style={{ fontSize: '0.75rem' }}>Total Pendapatan Bersih ({year})</h6>
                  <h2 className="fw-bold mb-3">{formatRupiah(monthlyData.reduce((sum, m) => sum + m.total, 0))}</h2>
                </div>
                <div className="border-top border-white border-opacity-20 pt-3 text-white-50 small">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Administrasi:</span>
                    <span className="text-white fw-bold">{formatRupiah(monthlyData.reduce((sum, m) => sum + m.adminFees, 0))}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Bunga Perpanjang:</span>
                    <span className="text-white fw-bold">{formatRupiah(monthlyData.reduce((sum, m) => sum + m.extensions, 0))}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Keuntungan Tebus:</span>
                    <span className="text-white fw-bold">{formatRupiah(monthlyData.reduce((sum, m) => sum + m.redemptions, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Audit Table */}
          <div className="col-12">
            <div className="card card-premium p-4">
              <h5 className="fw-bold text-dark mb-4">Rincian Buku Kas Bulanan</h5>
              <div className="table-responsive">
                <table className="table table-hover align-middle table-responsive-card mb-0">
                  <thead className="table-light border-bottom">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold">Bulan</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end">Biaya Admin (Rp)</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end">Bunga Perpanjangan (Rp)</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end">Keuntungan Tebusan (Rp)</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end" style={{ width: '220px' }}>Total Pendapatan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m) => (
                      <tr key={m.month}>
                        <td className="px-3 py-3 fw-bold text-dark" data-label="Bulan">
                          {getMonthName(m.month)}
                        </td>
                        <td className="px-3 py-3 text-end text-muted fw-medium" data-label="Biaya Admin (Rp)">
                          {formatRupiah(m.adminFees)}
                        </td>
                        <td className="px-3 py-3 text-end text-muted fw-medium" data-label="Bunga Perpanjangan (Rp)">
                          {formatRupiah(m.extensions)}
                        </td>
                        <td className="px-3 py-3 text-end text-muted fw-medium" data-label="Keuntungan Tebusan (Rp)">
                          {formatRupiah(m.redemptions)}
                        </td>
                        <td className="px-3 py-3 text-end fw-bold text-primary" data-label="Total Pendapatan (Rp)">
                          {formatRupiah(m.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
