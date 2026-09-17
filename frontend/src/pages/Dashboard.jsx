import React, { useEffect, useState } from 'react';
import api from '../services/api';
import PawnReceiptModal from '../components/PawnReceiptModal';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Print & Share Modal States
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPrintTx, setSelectedPrintTx] = useState(null);

  // WhatsApp Due Date Reminders States
  const [reminders, setReminders] = useState({ h3List: [], h1List: [], overdueList: [], meta: { totalH3: 0, totalH1: 0, totalOverdue: 0, totalReminders: 0 } });
  const [waTab, setWaTab] = useState('h3');

  // Daily Closing Modal States
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const savedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  const handlePrintTx = async (txId) => {
    try {
      const response = await api.get(`/transactions/${txId}`);
      setSelectedPrintTx(response.data.data?.transaction || response.data.data);
      setShowPrintModal(true);
    } catch (err) {
      console.error('Error fetching transaction detail for print:', err);
    }
  };

  const sendWaReminder = (tx, urgencyCategory) => {
    let rawPhone = tx.customer?.phone || '';
    let cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }

    const dueDateStr = new Date(tx.dueDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const formattedTebus = formatRupiah(tx.totalTebus || 0);

    let urgencyText = 'mengingatkan bahwa masa gadai Anda akan jatuh tempo dalam 3 hari pada tanggal';
    if (urgencyCategory === 'h1') {
      urgencyText = 'mengingatkan bahwa masa gadai Anda akan jatuh tempo BESOK pada tanggal';
    } else if (urgencyCategory === 'overdue') {
      urgencyText = 'pemberitahuan bahwa masa gadai Anda telah MEMASUKI / LEWAT JATUH TEMPO pada tanggal';
    }

    const itemDetail = tx.item ? `${tx.item.name || ''} ${tx.item.brand || ''} ${tx.item.modelName || ''}`.trim() : 'Barang Gadai';

    const message = `Halo Bpk/Ibu *${tx.customer?.name || 'Nasabah'}*,\n\nKami dari *Belvin88Cellular* ${urgencyText} *${dueDateStr}*.\n\n📄 *Rincian Nota Gadai:*\n• No. Nota: *${tx.transactionCode}*\n• Barang Jaminan: *${itemDetail}*\n• Nominal Tebusan: *${formattedTebus}*\n\nMohon konfirmasi pelunasan atau perpanjangan gadai agar jaminan tetap aman. Terima kasih! 🙏`;

    const encodedText = encodeURIComponent(message);
    window.open(`https://wa.me/${cleaned}?text=${encodedText}`, '_blank');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/reports/dashboard');
        setData(response.data.data);
        setError('');
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Gagal memuat statistik dashboard terupdate.');
      } finally {
        setLoading(false);
      }
    };

    const fetchReminders = async () => {
      try {
        const res = await api.get('/notifications/due-reminders');
        if (res.data?.data) {
          setReminders(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching WA reminders:', err);
      }
    };

    fetchDashboardData();
    fetchReminders();
  }, []);

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
      case 'LUNAS':
        return 'bg-success-subtle text-success border border-success-subtle';
      case 'PERPANJANG':
        return 'bg-warning-subtle text-warning border border-warning-subtle';
      case 'JATUH_TEMPO':
        return 'bg-danger-subtle text-danger border border-danger-subtle';
      default:
        return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
    }
  };

  const metrics = data?.metrics || {
    activeTransactionsCount: 0,
    activeLoanValue: 0,
    customerCount: 0,
    revenue: 0,
    cashSummary: { totalIn: 0, totalOut: 0, balance: 0 }
  };

  const todaySummary = data?.todaySummary || {
    pawned: { count: 0, totalLoanAmount: 0, breakdown: { HP: 0, Tablet: 0, Laptop: 0, TV: 0, Kamera: 0, Lainnya: 0 }, items: [] },
    redeemed: { count: 0, totalValue: 0, breakdown: { HP: 0, Tablet: 0, Laptop: 0, TV: 0, Kamera: 0, Lainnya: 0 }, items: [] },
    extended: { count: 0, totalInterest: 0 }
  };

  const recentTransactions = data?.recentTransactions || [];

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'],
    datasets: [
      {
        label: 'Nilai Transaksi Pinjaman (Juta Rp)',
        data: [12, 19, 15, 24, 22, 35, 28, 30, 42, 38, 45, 52],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        tension: 0.3,
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        padding: 12,
        cornerRadius: 8,
        backgroundColor: '#1e293b'
      }
    },
    scales: {
      y: {
        grid: {
          color: '#f1f5f9'
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
        <div className="text-muted fw-semibold">Memuat statistik dashboard kasir...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Banner Header */}
      <div className="hero-banner-blue mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
        <div>
          <h3 className="fw-bold mb-1 text-white d-flex align-items-center gap-2">
            <i className="bi bi-grid-1x2-fill"></i> Dashboard Ringkasan Toko
          </h3>
          <p className="mb-0 text-white-50 small">Analitik performa gadai & ringkasan operasional harian Belvin88Cellular</p>
        </div>
        <div className="d-flex align-items-center gap-2 text-white bg-white bg-opacity-15 border border-white border-opacity-25 px-3 py-2 rounded-3" style={{ fontSize: '0.85rem' }}>
          <i className="bi bi-clock-history text-warning"></i>
          <span>Update Terakhir: Baru Saja</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning py-2 px-3 mb-4 rounded-3 border-warning-subtle small" role="alert">
          <i className="bi bi-info-circle me-1"></i> {error} Menampilkan data statistik default toko.
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-4 col-xl-2">
          <div className="card card-premium p-3 h-100 border-start border-3 border-primary">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Total Transaksi</span>
                <h4 className="fw-bold text-dark mt-1 mb-0">{metrics.activeTransactionsCount} Unit</h4>
              </div>
              <div className="bg-primary-subtle text-primary rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-box-seam-fill fs-5"></i>
              </div>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-arrow-up-right text-success me-1"></i> Aktif digadaikan
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4 col-xl-2">
          <div className="card card-premium p-3 h-100 border-start border-3 border-info">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Total Customer</span>
                <h4 className="fw-bold text-dark mt-1 mb-0">{metrics.customerCount} Orang</h4>
              </div>
              <div className="bg-info-subtle text-info rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-people-fill fs-5"></i>
              </div>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-check-circle-fill text-success me-1"></i> Nasabah terdaftar
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4 col-xl-2">
          <div className="card card-premium p-3 h-100 border-start border-3 border-success">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Total Gadai</span>
                <h4 className="fw-bold text-dark mt-1 mb-0" style={{ fontSize: '1.05rem' }}>{formatRupiah(metrics.activeLoanValue)}</h4>
              </div>
              <div className="bg-success-subtle text-success rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-cash-stack fs-5"></i>
              </div>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-arrow-up-right text-success me-1"></i> Pinjaman berjalan
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4 col-xl-2">
          <div className="card card-premium p-3 h-100 border-start border-3 border-warning">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Kas Toko</span>
                <h4 className="fw-bold text-dark mt-1 mb-0" style={{ fontSize: '1.05rem' }}>{formatRupiah(metrics.cashSummary.balance)}</h4>
              </div>
              <div className="bg-warning-subtle text-warning rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-wallet2 fs-5"></i>
              </div>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-arrow-down-left text-danger me-1"></i> Total saldo berjalan
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4 col-xl-2">
          <div className="card card-premium p-3 h-100 border-start border-3 border-primary-subtle">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Pendapatan</span>
                <h4 className="fw-bold text-dark mt-1 mb-0" style={{ fontSize: '1.05rem' }}>{formatRupiah(metrics.revenue)}</h4>
              </div>
              <div className="bg-primary-subtle text-primary rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-graph-up-arrow fs-5"></i>
              </div>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-award-fill text-success me-1"></i> Bunga + Biaya admin
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4 col-xl-2">
          <div className="card card-premium p-3 h-100 border-start border-3 border-danger">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Jatuh Tempo</span>
                <h4 className="fw-bold text-dark mt-1 mb-0">
                  {recentTransactions.filter(t => t.status === 'JATUH_TEMPO').length} Item
                </h4>
              </div>
              <div className="bg-danger-subtle text-danger rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-calendar-x-fill fs-5"></i>
              </div>
            </div>
            <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-bell-fill text-danger me-1"></i> Perlu ditindaklanjuti
            </div>
          </div>
        </div>
      </div>

      {/* Today's Operational Summary Card Section */}
      <div className="card card-premium p-4 mb-4 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)', borderRadius: '1rem', border: '1px solid #cbd5e1' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3 pb-3 border-bottom">
          <div>
            <h5 className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-calendar-event-fill text-primary fs-4"></i> Rekapitulasi Operasional Hari Ini ({new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})
            </h5>
            <p className="text-muted mb-0 small">Rincian barang gadai baru masuk, barang ditebus (lunas), dan perpanjangan per jenis barang hari ini</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button 
              type="button"
              onClick={() => setShowClosingModal(true)} 
              className="btn btn-sm btn-primary shadow-sm fw-bold d-flex align-items-center gap-2 px-3 py-1.5 rounded-pill"
            >
              <i className="bi bi-receipt-cutoff"></i> Cetak Tutup Buku Hari Ini
            </button>
            <span className="badge bg-primary px-3 py-2 rounded-pill fs-7 shadow-xs">
              <i className="bi bi-activity me-1"></i> Live Kasir Belvin88
            </span>
          </div>
        </div>

        <div className="row g-3">
          {/* Card 1: Barang Gadai Masuk Hari Ini */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="bg-white p-3 rounded-3 border border-primary-subtle shadow-xs h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-box-arrow-in-down-right text-primary fs-5"></i> Barang Gadai Masuk
                </span>
                <span className="badge bg-primary text-white fw-bold px-2.5 py-1.5 rounded-pill fs-7">
                  {todaySummary.pawned?.count || 0} Unit
                </span>
              </div>
              <div className="fs-5 fw-bold text-primary mb-2">
                {formatRupiah(todaySummary.pawned?.totalLoanAmount || 0)}
              </div>
              <div className="text-muted small fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>Rincian Jenis Barang Masuk:</div>
              <div className="d-flex flex-wrap gap-1">
                <span className={`badge ${todaySummary.pawned?.breakdown?.HP > 0 ? 'bg-primary' : 'bg-light text-muted border'}`}>📱 HP: {todaySummary.pawned?.breakdown?.HP || 0}</span>
                <span className={`badge ${todaySummary.pawned?.breakdown?.Tablet > 0 ? 'bg-primary' : 'bg-light text-muted border'}`}>📱 Tablet: {todaySummary.pawned?.breakdown?.Tablet || 0}</span>
                <span className={`badge ${todaySummary.pawned?.breakdown?.Laptop > 0 ? 'bg-primary' : 'bg-light text-muted border'}`}>💻 Laptop: {todaySummary.pawned?.breakdown?.Laptop || 0}</span>
                <span className={`badge ${todaySummary.pawned?.breakdown?.TV > 0 ? 'bg-primary' : 'bg-light text-muted border'}`}>📺 TV: {todaySummary.pawned?.breakdown?.TV || 0}</span>
                <span className={`badge ${todaySummary.pawned?.breakdown?.Kamera > 0 ? 'bg-primary' : 'bg-light text-muted border'}`}>📷 Kamera: {todaySummary.pawned?.breakdown?.Kamera || 0}</span>
                <span className={`badge ${todaySummary.pawned?.breakdown?.Lainnya > 0 ? 'bg-primary' : 'bg-light text-muted border'}`}>📦 Lainnya: {todaySummary.pawned?.breakdown?.Lainnya || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Barang Ditebus (Pelunasan) Hari Ini */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="bg-white p-3 rounded-3 border border-success-subtle shadow-xs h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-box-arrow-up-right text-success fs-5"></i> Barang Ditebus (Lunas)
                </span>
                <span className="badge bg-success text-white fw-bold px-2.5 py-1.5 rounded-pill fs-7">
                  {todaySummary.redeemed?.count || 0} Unit
                </span>
              </div>
              <div className="fs-5 fw-bold text-success mb-2">
                {formatRupiah(todaySummary.redeemed?.totalValue || 0)}
              </div>
              <div className="text-muted small fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>Rincian Jenis Barang Ditebus:</div>
              <div className="d-flex flex-wrap gap-1">
                <span className={`badge ${todaySummary.redeemed?.breakdown?.HP > 0 ? 'bg-success' : 'bg-light text-muted border'}`}>📱 HP: {todaySummary.redeemed?.breakdown?.HP || 0}</span>
                <span className={`badge ${todaySummary.redeemed?.breakdown?.Tablet > 0 ? 'bg-success' : 'bg-light text-muted border'}`}>📱 Tablet: {todaySummary.redeemed?.breakdown?.Tablet || 0}</span>
                <span className={`badge ${todaySummary.redeemed?.breakdown?.Laptop > 0 ? 'bg-success' : 'bg-light text-muted border'}`}>💻 Laptop: {todaySummary.redeemed?.breakdown?.Laptop || 0}</span>
                <span className={`badge ${todaySummary.redeemed?.breakdown?.TV > 0 ? 'bg-success' : 'bg-light text-muted border'}`}>📺 TV: {todaySummary.redeemed?.breakdown?.TV || 0}</span>
                <span className={`badge ${todaySummary.redeemed?.breakdown?.Kamera > 0 ? 'bg-success' : 'bg-light text-muted border'}`}>📷 Kamera: {todaySummary.redeemed?.breakdown?.Kamera || 0}</span>
                <span className={`badge ${todaySummary.redeemed?.breakdown?.Lainnya > 0 ? 'bg-success' : 'bg-light text-muted border'}`}>📦 Lainnya: {todaySummary.redeemed?.breakdown?.Lainnya || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Perpanjangan Hari Ini */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="bg-white p-3 rounded-3 border border-warning-subtle shadow-xs h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-arrow-repeat text-warning fs-5"></i> Perpanjangan Hari Ini
                </span>
                <span className="badge bg-warning text-white fw-bold px-2.5 py-1.5 rounded-pill fs-7">
                  {todaySummary.extended?.count || 0} Nota
                </span>
              </div>
              <div className="fs-5 fw-bold text-warning mb-2">
                {formatRupiah(todaySummary.extended?.totalInterest || 0)}
              </div>
              <div className="text-muted small mt-2" style={{ fontSize: '0.75rem' }}>
                <i className="bi bi-check-circle-fill text-warning me-1"></i> Total pendapatan bunga perpanjangan tempo hari ini
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Due Date Reminders Widget */}
      <div className="card card-premium p-4 mb-4 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', borderRadius: '1rem', color: '#fff' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3 pb-3 border-bottom border-white border-opacity-20">
          <div>
            <h5 className="fw-bold text-white mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-whatsapp text-success fs-4 bg-white rounded-circle px-1"></i> Pusat Pengingat WhatsApp Jatuh Tempo
            </h5>
            <p className="text-white-50 mb-0 small">Kirim pesan WhatsApp pengingat otomatis ke nasabah untuk mencegah keteledoran dan mempercepat pelunasan/perpanjangan</p>
          </div>
          <span className="badge bg-white text-dark fw-bold px-3 py-2 rounded-pill fs-7 shadow-xs">
            Total {reminders.meta?.totalReminders || 0} Nasabah Perlu Diingatkan
          </span>
        </div>

        {/* Tab Selector Buttons */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className={`btn btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center gap-2 ${
              waTab === 'h3' ? 'btn-warning text-dark shadow-sm' : 'btn-outline-light text-white bg-white bg-opacity-10 border-white border-opacity-25'
            }`}
            onClick={() => setWaTab('h3')}
          >
            <i className="bi bi-clock-history"></i> 🟡 H-3 Tempo ({reminders.meta?.totalH3 || 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center gap-2 ${
              waTab === 'h1' ? 'btn-warning text-dark shadow-sm' : 'btn-outline-light text-white bg-white bg-opacity-10 border-white border-opacity-25'
            }`}
            onClick={() => setWaTab('h1')}
          >
            <i className="bi bi-exclamation-circle-fill"></i> 🟠 H-1 Tempo (Besok) ({reminders.meta?.totalH1 || 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm px-3 py-2 rounded-3 fw-bold d-flex align-items-center gap-2 ${
              waTab === 'overdue' ? 'btn-danger text-white shadow-sm' : 'btn-outline-light text-white bg-white bg-opacity-10 border-white border-opacity-25'
            }`}
            onClick={() => setWaTab('overdue')}
          >
            <i className="bi bi-bell-fill"></i> 🔴 Hari-H / Lewat Tempo ({reminders.meta?.totalOverdue || 0})
          </button>
        </div>

        {/* Reminders List Table */}
        <div className="bg-white text-dark rounded-3 p-3 shadow-sm overflow-hidden">
          {(() => {
            const currentList = waTab === 'h3' ? reminders.h3List : waTab === 'h1' ? reminders.h1List : reminders.overdueList;

            if (!currentList || currentList.length === 0) {
              return (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-check-circle-fill fs-3 text-success d-block mb-2"></i>
                  <span className="fw-semibold">Tidak ada transaksi nasabah pada kategori pengingat ini saat ini.</span>
                </div>
              );
            }

            return (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.88rem' }}>
                  <thead className="table-light border-bottom">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold">No. Nota</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold">Nama Nasabah</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold">No. HP / WA</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold">Barang Jaminan</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center">Jatuh Tempo</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end">Total Tebusan</th>
                      <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center">Aksi Pengingat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-3 py-2.5 fw-bold text-primary">{tx.transactionCode}</td>
                        <td className="px-3 py-2.5 fw-semibold text-dark">{tx.customer?.name || '-'}</td>
                        <td className="px-3 py-2.5 text-muted">
                          <i className="bi bi-telephone me-1"></i>
                          {tx.customer?.phone || '-'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="fw-semibold">{tx.item?.name}</span>
                          <span className="text-muted small d-block">{tx.item?.brand} {tx.item?.modelName}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="badge bg-light text-dark border px-2 py-1">
                            {new Date(tx.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-end fw-bold text-dark">
                          {formatRupiah(tx.totalTebus)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            className="btn btn-success btn-sm px-3 py-1 rounded-2 d-inline-flex align-items-center gap-1.5 fw-semibold shadow-xs"
                            onClick={() => sendWaReminder(tx, waTab)}
                          >
                            <i className="bi bi-whatsapp"></i> Kirim WA
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="card card-premium p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-0">Tren Transaksi Pinjaman</h5>
                <p className="text-muted mb-0 small">Statistik pinjaman keluar tahun {new Date().getFullYear()}</p>
              </div>
              <select className="form-select form-select-sm border w-auto rounded-3" style={{ fontSize: '0.85rem' }}>
                <option>Filter: 12 Bulan</option>
                <option>Filter: 3 Bulan</option>
              </select>
            </div>
            <div style={{ height: '300px', position: 'relative' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="card card-premium p-4 h-100">
            <h5 className="fw-bold text-dark mb-3">Menu Kasir Cepat</h5>
            <div className="d-grid gap-2">
              <a href="/transactions" className="btn btn-outline-primary text-start py-2.5 d-flex align-items-center gap-2">
                <i className="bi bi-wallet2 text-primary fs-5"></i>
                <div>
                  <div className="fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>Pencairan Gadai Baru</div>
                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Lakukan taksiran & cetak nota gadai</div>
                </div>
              </a>
              <a href="/redeem" className="btn btn-outline-success text-start py-2.5 d-flex align-items-center gap-2">
                <i className="bi bi-arrow-left-right text-success fs-5"></i>
                <div>
                  <div className="fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>Penebusan Barang</div>
                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Pelunasan pinjaman gadai nasabah</div>
                </div>
              </a>
              <a href="/extend" className="btn btn-outline-warning text-start py-2.5 d-flex align-items-center gap-2">
                <i className="bi bi-calendar-plus text-warning fs-5"></i>
                <div>
                  <div className="fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>Perpanjangan Gadai</div>
                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Bayar bunga & tambah jatuh tempo</div>
                </div>
              </a>
              <a href="/scan" className="btn btn-outline-dark text-start py-2.5 d-flex align-items-center gap-2">
                <i className="bi bi-qr-code-scan fs-5"></i>
                <div>
                  <div className="fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>Smart Scan Surat</div>
                  <div className="text-muted small" style={{ fontSize: '0.75rem' }}>Scan nota gadai dengan kamera OCR</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card card-premium p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-0">Daftar Transaksi Terbaru</h5>
                <p className="text-muted mb-0 small">Menampilkan 5 aktivitas kasir terkini</p>
              </div>
              <a href="/transactions" className="btn btn-primary btn-sm rounded-3">
                Lihat Semua <i className="bi bi-chevron-right ms-1"></i>
              </a>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle table-responsive-card mb-0">
                <thead className="table-light border-bottom">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Kode Transaksi</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Nama Nasabah</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold">Barang Jaminan</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-end">Uang Pinjaman</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center">Status</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center">Tanggal</th>
                    <th scope="col" className="px-3 py-2 text-muted fw-semibold text-center">Aksi / Cetak</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-3 py-3 fw-semibold text-primary" data-label="Kode Transaksi">
                          {tx.code}
                        </td>
                        <td className="px-3 py-3 text-dark fw-medium" data-label="Nama Nasabah">
                          {tx.customerName}
                        </td>
                        <td className="px-3 py-3 text-muted" data-label="Barang Jaminan">
                          {tx.itemName}
                        </td>
                        <td className="px-3 py-3 text-end fw-bold text-dark" data-label="Uang Pinjaman">
                          {formatRupiah(tx.loanAmount)}
                        </td>
                        <td className="px-3 py-3 text-center" data-label="Status">
                          <span className={`badge px-2.5 py-1.5 rounded-3 fw-semibold ${getStatusBadge(tx.status)}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-muted" data-label="Tanggal" style={{ fontSize: '0.85rem' }}>
                          {new Date(tx.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-center" data-label="Aksi / Cetak">
                          <button 
                            className="btn btn-outline-primary btn-sm rounded-2 d-inline-flex align-items-center gap-1.5 py-1 px-2.5 fw-semibold"
                            onClick={() => handlePrintTx(tx.id)}
                            title="Cetak & Bagikan File Nota"
                          >
                            <i className="bi bi-printer-fill"></i> Nota / Bagikan
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        <i className="bi bi-inbox fs-3 d-block mb-2 text-muted"></i>
                        Belum ada riwayat transaksi gadai hari ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cetak Tutup Buku Kas Harian */}
      {showClosingModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg my-4">
            <div className="modal-content border-0 shadow-2xl" style={{ borderRadius: '1.25rem' }}>
              <div className="modal-header border-bottom py-3 px-4 bg-primary text-white" style={{ borderRadius: '1.25rem 1.25rem 0 0' }}>
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-journal-bookmark-fill"></i> Berita Acara & Pembukuan Tutup Kas Harian
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowClosingModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                <div className="text-center pb-3 mb-3 border-bottom">
                  <h4 className="fw-bold text-dark mb-1">BELVIN88 CELLULAR & GADAI</h4>
                  <p className="text-muted mb-1 small">Jl. Jendral Sudirman No. 123 • Telp: 0822-8811-0375</p>
                  <div className="badge bg-dark text-white px-3 py-1.5 rounded-pill fs-7">
                    LEMBAR TUTUP BUKU & REKONSILIASI KAS LACI
                  </div>
                </div>

                <div className="row g-2 mb-3 small">
                  <div className="col-6">
                    <span className="text-muted">Periode Tanggal:</span>
                    <div className="fw-bold text-dark">
                      {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="col-6 text-end">
                    <span className="text-muted">Petugas Kasir:</span>
                    <div className="fw-bold text-dark">{savedUser?.fullName || 'Petugas Kasir'}</div>
                  </div>
                </div>

                <div className="table-responsive mb-3">
                  <table className="table table-bordered border-secondary-subtle align-middle small">
                    <thead className="table-light">
                      <tr>
                        <th className="py-2">Pos Rekapitulasi Kas Hari Ini</th>
                        <th className="py-2 text-center" style={{ width: '120px' }}>Tipe</th>
                        <th className="py-2 text-end" style={{ width: '200px' }}>Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>1. UANG KAS MASUK (INFLOW)</strong></td>
                        <td className="text-center"><span className="badge bg-success text-white">MASUK</span></td>
                        <td className="text-end fw-bold text-success">+{formatRupiah((todaySummary.redeemed?.totalValue || 0) + (todaySummary.extended?.totalInterest || 0))}</td>
                      </tr>
                      <tr>
                        <td className="ps-4 text-muted">• Penerimaan Pelunasan / Tebusan ({todaySummary.redeemed?.count || 0} Unit)</td>
                        <td></td>
                        <td className="text-end text-muted">{formatRupiah(todaySummary.redeemed?.totalValue || 0)}</td>
                      </tr>
                      <tr>
                        <td className="ps-4 text-muted">• Penerimaan Bunga Perpanjangan ({todaySummary.extended?.count || 0} Nota)</td>
                        <td></td>
                        <td className="text-end text-muted">{formatRupiah(todaySummary.extended?.totalInterest || 0)}</td>
                      </tr>

                      <tr>
                        <td><strong>2. UANG KAS KELUAR (OUTFLOW)</strong></td>
                        <td className="text-center"><span className="badge bg-danger text-white">KELUAR</span></td>
                        <td className="text-end fw-bold text-danger">-{formatRupiah(todaySummary.pawned?.totalLoanAmount || 0)}</td>
                      </tr>
                      <tr>
                        <td className="ps-4 text-muted">• Pencairan Pinjaman Gadai Baru ({todaySummary.pawned?.count || 0} Unit)</td>
                        <td></td>
                        <td className="text-end text-muted">{formatRupiah(todaySummary.pawned?.totalLoanAmount || 0)}</td>
                      </tr>

                      <tr className="table-primary border-top border-2 border-primary">
                        <td className="py-2.5">
                          <strong className="fs-6">3. SELISIH KAS BERSIH HARI INI</strong>
                        </td>
                        <td className="text-center py-2.5">
                          <span className={`badge ${((todaySummary.redeemed?.totalValue || 0) + (todaySummary.extended?.totalInterest || 0) - (todaySummary.pawned?.totalLoanAmount || 0)) >= 0 ? 'bg-primary' : 'bg-danger'}`}>
                            {((todaySummary.redeemed?.totalValue || 0) + (todaySummary.extended?.totalInterest || 0) - (todaySummary.pawned?.totalLoanAmount || 0)) >= 0 ? 'SURPLUS' : 'DEFISIT'}
                          </span>
                        </td>
                        <td className="text-end py-2.5 fw-bold fs-6">
                          {formatRupiah((todaySummary.redeemed?.totalValue || 0) + (todaySummary.extended?.totalInterest || 0) - (todaySummary.pawned?.totalLoanAmount || 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mb-4">
                  <label className="form-label text-muted small fw-semibold">Catatan Tutup Buku Kasir:</label>
                  <textarea 
                    className="form-control form-control-sm" 
                    rows="2" 
                    placeholder="Contoh: Seluruh kas fisik di laci telah dihitung dan sesuai dengan pembukuan sistem..."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                  />
                </div>

                <div className="row text-center mt-4 pt-2">
                  <div className="col-6">
                    <p className="text-muted small mb-5">Petugas Kasir yang Menghitung,</p>
                    <div className="fw-bold text-dark border-bottom border-dark d-inline-block px-4 pb-1">
                      ( {savedUser?.fullName || 'Petugas Kasir'} )
                    </div>
                  </div>
                  <div className="col-6">
                    <p className="text-muted small mb-5">Diverifikasi Pimpinan / Owner,</p>
                    <div className="fw-bold text-dark border-bottom border-dark d-inline-block px-4 pb-1">
                      ( ............................................ )
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top py-3 px-4 bg-light d-flex justify-content-between" style={{ borderRadius: '0 0 1.25rem 1.25rem' }}>
                <span className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i> Lembar rekapitulasi siap dicetak ke printer kertas atau PDF.
                </span>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={() => setShowClosingModal(false)}>
                    Tutup
                  </button>
                  <button type="button" className="btn btn-primary py-2 px-4 fw-bold d-flex align-items-center gap-2 shadow-sm" onClick={() => window.print()}>
                    <i className="bi bi-printer-fill"></i> Cetak / Simpan PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable & Share Receipt Modal */}
      <PawnReceiptModal 
        show={showPrintModal} 
        onClose={() => setShowPrintModal(false)} 
        transaction={selectedPrintTx} 
      />
    </div>
  );
};

export default Dashboard;
