import React, { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * ThermalReceiptNote - Renderable receipt layout for thermal printers (58mm / 80mm)
 * @param {Object} props
 * @param {Object} props.transaction - Transaction object
 * @param {string} props.paperSize - '58mm' | '80mm'
 */
const ThermalReceiptNote = ({ transaction, paperSize = '58mm' }) => {
  const [storeInfo, setStoreInfo] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.get('/settings')
      .then(res => {
        if (isMounted && res.data?.data) {
          setStoreInfo(res.data.data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  if (!transaction) return null;

  const actualTx = transaction.transaction || transaction;

  const {
    transactionCode,
    customer,
    item,
    user,
    loanAmount,
    interestAmount,
    adminFee,
    durationDays,
    createdAt,
    startDate,
    dueDate
  } = actualTx;

  const formatRupiah = (val) => {
    if (val === undefined || val === null) return '0';
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0
    }).format(val);
  };

  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '___';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTimeIndo = (dateStr) => {
    if (!dateStr) return '___';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const numLoan = parseFloat(loanAmount || 0);
  const numInterest = parseFloat(interestAmount || 0);
  const numAdmin = parseFloat(adminFee || 0);
  const totalTebusan = numLoan + numInterest + numAdmin;

  const is58mm = paperSize === '58mm';
  const widthPx = is58mm ? '260px' : '360px';
  const fontSize = is58mm ? '11px' : '12px';
  const lineChar = is58mm ? '--------------------------------' : '------------------------------------------------';
  const doubleLineChar = is58mm ? '================================' : '================================================';

  const itemName = item?.brand ? `${item.brand} ${item.modelName || item.name}` : (item?.name || '-');
  const storeNameDisplay = storeInfo?.storeName || 'BELVIN88CELLULAR';
  const storeAddressDisplay = storeInfo?.storeAddress || 'Jl. Budi Mulia 7 RT 04/07 No 16, Pademangan Barat, Jakarta Utara';
  const storePhoneDisplay = storeInfo?.storePhone || '0822-9879-9410';

  return (
    <div 
      className={`thermal-receipt-container ${is58mm ? 'thermal-58mm' : 'thermal-80mm'}`}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: fontSize,
        lineHeight: '1.3',
        color: '#000',
        backgroundColor: '#fff',
        width: widthPx,
        margin: '0 auto',
        padding: '10px 6px',
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'none'
      }}
    >
      {/* KOP TOKO */}
      <div className="text-center fw-bold" style={{ fontSize: is58mm ? '13px' : '15px' }}>
        {storeNameDisplay}
      </div>
      <div className="text-center" style={{ fontSize: is58mm ? '9.5px' : '10.5px' }}>
        TERIMA GADAI HP, TAB, LAPTOP
      </div>
      <div className="text-center" style={{ fontSize: is58mm ? '9px' : '10px' }}>
        {storeAddressDisplay}
      </div>
      <div className="text-center" style={{ fontSize: is58mm ? '9px' : '10px' }}>
        WA: {storePhoneDisplay}
      </div>

      <div className="text-center my-1">{doubleLineChar}</div>

      {/* JUDUL STRUK */}
      <div className="text-center fw-bold text-uppercase" style={{ fontSize: is58mm ? '11px' : '12px' }}>
        *** NOTA BUKTI GADAI ***
      </div>

      <div className="text-center my-1">{lineChar}</div>

      {/* METADATA TRANSAKSI */}
      <div className="d-flex justify-content-between">
        <span>No. Nota</span>
        <span className="fw-bold">{transactionCode}</span>
      </div>
      <div className="d-flex justify-content-between">
        <span>Tanggal</span>
        <span>{formatDateTimeIndo(createdAt || startDate)}</span>
      </div>
      <div className="d-flex justify-content-between">
        <span>Kasir</span>
        <span>{user?.fullName || 'Petugas'}</span>
      </div>

      <div className="text-center my-1">{lineChar}</div>

      {/* DATA NASABAH */}
      <div className="fw-bold">DATA NASABAH:</div>
      <div className="d-flex justify-content-between">
        <span>Nama</span>
        <span className="fw-bold">{customer?.name || '-'}</span>
      </div>
      <div className="d-flex justify-content-between">
        <span>No. HP/WA</span>
        <span>{customer?.phone || '-'}</span>
      </div>
      <div className="d-flex justify-content-between">
        <span>NIK</span>
        <span>{customer?.nik || '-'}</span>
      </div>

      <div className="text-center my-1">{lineChar}</div>

      {/* DETAIL BARANG JAMINAN */}
      <div className="fw-bold">BARANG JAMINAN:</div>
      <div className="fw-bold" style={{ wordBreak: 'break-word' }}>
        {itemName}
      </div>
      {item?.category && (
        <div className="d-flex justify-content-between">
          <span>Kategori</span>
          <span>{item.category}</span>
        </div>
      )}
      {(item?.imei || item?.serialNumber) && (
        <div className="d-flex justify-content-between">
          <span>No Seri/IMEI</span>
          <span>{item.imei || item.serialNumber}</span>
        </div>
      )}
      {item?.equipment && (
        <div className="d-flex justify-content-between">
          <span>Kelengkapan</span>
          <span className="text-end" style={{ maxWidth: '60%' }}>{item.equipment}</span>
        </div>
      )}

      <div className="text-center my-1">{lineChar}</div>

      {/* RINCIAN KEUANGAN */}
      <div className="d-flex justify-content-between">
        <span>Besar Pinjaman</span>
        <span>Rp {formatRupiah(numLoan)}</span>
      </div>
      <div className="d-flex justify-content-between">
        <span>Bunga Gadai</span>
        <span>Rp {formatRupiah(numInterest)}</span>
      </div>
      {numAdmin > 0 && (
        <div className="d-flex justify-content-between">
          <span>Biaya Admin</span>
          <span>Rp {formatRupiah(numAdmin)}</span>
        </div>
      )}

      <div className="text-center my-1">{doubleLineChar}</div>

      <div className="d-flex justify-content-between fw-bold" style={{ fontSize: is58mm ? '12px' : '13px' }}>
        <span>TOTAL TEBUSAN</span>
        <span>Rp {formatRupiah(totalTebusan)}</span>
      </div>

      <div className="text-center my-1">{doubleLineChar}</div>

      {/* TENOR & JATUH TEMPO */}
      <div className="d-flex justify-content-between">
        <span>Lama Tenor</span>
        <span>{durationDays || 30} Hari</span>
      </div>
      <div className="d-flex justify-content-between fw-bold">
        <span>JATUH TEMPO</span>
        <span>{formatDateIndo(dueDate)}</span>
      </div>

      <div className="text-center my-1">{lineChar}</div>

      {/* KETENTUAN RINGKAS */}
      <div style={{ fontSize: is58mm ? '8.5px' : '9.5px', lineHeight: '1.25' }}>
        <div>* Wajib bawa nota ini & KTP asli saat tebus / perpanjang.</div>
        <div>* Denda keterlambatan 1%/hari dari besar gadai.</div>
        <div>* Lewat 7 hari dari jatuh tempo barang menjadi hak milik toko.</div>
      </div>

      <div className="text-center my-1">{doubleLineChar}</div>

      {/* FOOTER */}
      <div className="text-center fw-bold" style={{ fontSize: is58mm ? '9.5px' : '10.5px' }}>
        TERIMA KASIH ATAS KEPERCAYAAN ANDA
      </div>
      <div className="text-center" style={{ fontSize: is58mm ? '8.5px' : '9.5px' }}>
        Simpan struk ini sebagai bukti sah
      </div>
    </div>
  );
};

export default ThermalReceiptNote;
