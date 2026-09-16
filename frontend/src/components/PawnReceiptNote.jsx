import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PawnReceiptNote = ({ transaction }) => {
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
      month: 'long',
      year: 'numeric'
    });
  };

  const numLoan = parseFloat(loanAmount || 0);
  const numInterest = parseFloat(interestAmount || 0);
  const numAdmin = parseFloat(adminFee || 0);
  const totalTebusan = numLoan + numInterest + numAdmin;

  // Equipment matching helper
  const equipStr = (item?.equipment || '').toLowerCase();
  const isEquipChecked = (keyword) => {
    if (!equipStr) return false;
    return equipStr.includes(keyword.toLowerCase());
  };

  // Category matching helper
  const itemCategory = (item?.category || '').toLowerCase();
  const itemName = (item?.name || '').toLowerCase();

  const isHp = itemName.includes('hp') || itemName.includes('phone') || itemName.includes('handphone') || itemName.includes('oppo') || itemName.includes('samsung') || itemName.includes('iphone') || itemName.includes('vivo') || itemName.includes('realme') || itemName.includes('xiaomi') || itemName.includes('redmi');
  const isTab = itemName.includes('tab') || itemName.includes('ipad') || itemName.includes('tablet');
  const isLaptop = itemName.includes('laptop') || itemName.includes('notebook') || itemName.includes('asus') || itemName.includes('lenovo') || itemName.includes('macbook') || itemName.includes('acer');
  const isTv = itemName.includes('tv') || itemName.includes('televisi') || itemName.includes('lg') || itemName.includes('polytron');
  const isKamera = itemName.includes('kamera') || itemName.includes('camera') || itemName.includes('canon') || itemName.includes('nikon') || itemName.includes('sony dslr');

  const storeNameDisplay = storeInfo?.storeName || 'BELVIN88CELLULAR';
  const storeAddressDisplay = storeInfo?.storeAddress || 'Jl. Budi mulia 7 RT 04 RW 07 No. 16 Kel. Pademangan Barat, Kec. Pademangan Kota Jakarta Utara 14420';
  const storePhoneDisplay = storeInfo?.storePhone || '082298799410';

  return (
    <div 
      className="pawn-receipt-note-container bg-white text-dark p-3"
      style={{
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: '12px',
        lineHeight: '1.4',
        color: '#111',
        maxWidth: '780px',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. TOP KOP KOPERASI */}
      <div className="text-center mb-2 pb-1 border-bottom">
        <h5 className="fw-bold mb-0 text-uppercase" style={{ fontSize: '15px', letterSpacing: '0.5px' }}>
          KOPERASI ENONI SUMBER SEJAHTERA (KESS)
        </h5>
        <div className="fw-semibold text-secondary" style={{ fontSize: '11px' }}>
          BADAN HUKUM NOMOR AHU-0000010.AH.01.26.TAHUN2019
        </div>
        <div className="fw-semibold text-secondary" style={{ fontSize: '11px' }}>
          NIB DAN SIUP: 0220105162949
        </div>
        <div className="text-muted" style={{ fontSize: '9.5px', marginTop: '2px' }}>
          Sekretariat T: Jl. Raya Parung No. 163, rt/rw 002/005, Jampang, Kemang, Bogor-Jawa Barat Email: Koperasi.kess@gmail.com Kode Pos 16310
        </div>
      </div>

      {/* 2. BLUE BANNER BOX */}
      <div 
        className="text-center text-white py-2 px-3 mb-2 rounded-1" 
        style={{ backgroundColor: '#1d4ed8', border: '1px solid #1e40af', boxShadow: '0 2px 4px rgba(29, 78, 216, 0.15)' }}
      >
        <h3 className="fw-black mb-0 text-uppercase tracking-wider" style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '1px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
          {storeNameDisplay}
        </h3>
        <div className="fw-bold" style={{ fontSize: '10.5px', letterSpacing: '0.3px' }}>
          TERIMA GADAI &quot;BARANG AMAN TIDAK DI PAKAI&quot;
        </div>
        <div style={{ fontSize: '10px', marginTop: '1px' }}>
          {storeAddressDisplay}
        </div>
        <div className="fw-semibold" style={{ fontSize: '10px' }}>
          Nomor HP/WA: {storePhoneDisplay}
        </div>
      </div>

      {/* 3. NOMOR & JUDUL DOKUMEN */}
      <div className="d-flex justify-content-between align-items-end my-2">
        <div className="fw-bold" style={{ fontSize: '12px' }}>
          Nomor : <span className="text-primary">{transactionCode}</span>
        </div>
        <div className="text-center flex-grow-1">
          <h4 className="fw-bold mb-0 text-decoration-underline" style={{ fontSize: '17px' }}>
            Surat Pernyataan
          </h4>
        </div>
        <div style={{ width: '100px' }}></div>
      </div>

      {/* 4. DATA NASABAH */}
      <div className="mb-2">
        <div className="fw-semibold mb-1">Saya Yang Bertanda Tangan Dibawah Ini :</div>
        <div className="ps-2">
          <div className="d-flex mb-1">
            <div style={{ width: '130px' }}>Nama Lengkap</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold flex-grow-1 border-bottom border-dark border-dotted">
              {customer?.name || '_______________________________'}
            </div>
            <div style={{ width: '90px' }} className="ps-2">NO HP/WA</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold border-bottom border-dark border-dotted" style={{ minWidth: '130px' }}>
              {customer?.phone || '_________________'}
            </div>
            <div className="ps-2 fw-semibold">Aktif</div>
          </div>

          <div className="d-flex mb-1 align-items-center">
            <div style={{ width: '130px' }}>no identitas</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold border-bottom border-dark border-dotted flex-grow-1">
              {customer?.nik || '_______________________________'}
            </div>
            <div className="ps-3 d-flex gap-3 align-items-center">
              <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={true} readOnly style={{ accentColor: '#059669' }} /> KTP
              </label>
              <label className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={false} readOnly /> SIM
              </label>
            </div>
          </div>

          <div className="d-flex mb-1">
            <div style={{ width: '130px' }}>Alamat</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold flex-grow-1 border-bottom border-dark border-dotted">
              {customer?.address || '__________________________________________________________________________'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. INFORMASI BARANG GADAI */}
      <div className="mb-2">
        <div className="fw-semibold mb-1">Secara Sadar Dan Tanpa Paksaan Menggadaikan Barang :</div>
        <div className="ps-2">
          {/* Jenis Barang */}
          <div className="d-flex mb-1 align-items-center">
            <div style={{ width: '130px' }}>Jenis Barang</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="d-flex gap-3 align-items-center flex-grow-1">
              <label className="d-flex align-items-center gap-1 mb-0">
                <input type="checkbox" checked={isHp} readOnly style={{ accentColor: '#1d4ed8' }} /> Handphone
              </label>
              <label className="d-flex align-items-center gap-1 mb-0">
                <input type="checkbox" checked={isTab} readOnly style={{ accentColor: '#1d4ed8' }} /> Tab
              </label>
              <label className="d-flex align-items-center gap-1 mb-0">
                <input type="checkbox" checked={isLaptop} readOnly style={{ accentColor: '#1d4ed8' }} /> Laptop
              </label>
              <label className="d-flex align-items-center gap-1 mb-0">
                <input type="checkbox" checked={isTv} readOnly style={{ accentColor: '#1d4ed8' }} /> TV
              </label>
              <label className="d-flex align-items-center gap-1 mb-0">
                <input type="checkbox" checked={isKamera} readOnly style={{ accentColor: '#1d4ed8' }} /> Kamera
              </label>
            </div>
          </div>

          {/* Merk / Type */}
          <div className="d-flex mb-1">
            <div style={{ width: '130px' }}>Merk/ Type</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold flex-grow-1 border-bottom border-dark border-dotted">
              {item ? `${item.brand ? item.brand + ' ' : ''}${item.name}` : '_______________________________'}
            </div>
            <div style={{ width: '110px' }} className="ps-2">No Seri /imei</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold border-bottom border-dark border-dotted" style={{ minWidth: '160px' }}>
              {item?.imei || item?.serialNumber || '-'}
            </div>
          </div>

          {/* Keterangan Kelengkapan Checkboxes */}
          <div className="d-flex mb-1 align-items-start">
            <div style={{ width: '130px' }}>Keterangan kelengkapan</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="flex-grow-1">
              <div className="d-flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { key: 'dus', label: 'Dus' },
                  { key: 'tas', label: 'Tas' },
                  { key: 'batangan', label: 'Batangan' },
                  { key: 'charger', label: 'Charger' },
                  { key: 'jarum', label: 'Jarum Hp' },
                  { key: 'headset', label: 'Headset' },
                  { key: 'sim', label: 'Sim Card' },
                  { key: 'mmc', label: 'Mmc' },
                  { key: 'mouse', label: 'Mouse' },
                  { key: 'remote', label: 'Remote' },
                  { key: 'speaker', label: 'Speaker' },
                  { key: 'antena', label: 'Antena' }
                ].map((opt) => (
                  <label key={opt.key} className="d-flex align-items-center gap-1 me-3 mb-1" style={{ fontSize: '11px' }}>
                    <input 
                      type="checkbox" 
                      checked={isEquipChecked(opt.key) || isEquipChecked(opt.label)} 
                      readOnly 
                      style={{ accentColor: '#059669' }} 
                    /> 
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Financials & Tenor */}
          <div className="d-flex mb-1 align-items-center mt-2">
            <div style={{ width: '130px' }}>Tenor Gadai</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold border-bottom border-dark border-dotted" style={{ width: '100px' }}>
              {durationDays || 30} Hari
            </div>
            <div style={{ width: '100px' }} className="ps-3">Jatuh Tempo</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold border-bottom border-dark border-dotted text-danger flex-grow-1">
              {formatDateIndo(dueDate)} <span className="text-dark fw-normal" style={{ fontSize: '10px' }}>(diperhatikan)</span>
            </div>
          </div>

          <div className="d-flex mb-1 align-items-center">
            <div style={{ width: '130px' }}>Besar Gadai</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold fs-6 border-bottom border-dark border-dotted" style={{ width: '220px' }}>
              Rp. {formatRupiah(numLoan)}
            </div>
            <div style={{ width: '120px' }} className="ps-3">Jumlah Tebusan</div>
            <div style={{ width: '15px' }}>:</div>
            <div className="fw-bold fs-6 text-primary border-bottom border-dark border-dotted flex-grow-1" style={{ color: '#1d4ed8 !important' }}>
              Rp. {formatRupiah(totalTebusan)}
            </div>
          </div>
        </div>
      </div>

      {/* 6. PERNYATAAN & ATURAN 1-6 */}
      <div className="my-2 pt-1 border-top" style={{ fontSize: '10.5px' }}>
        <div className="fw-bold mb-1">Mengetahui Dan Menyatakan Setuju :</div>
        {storeInfo?.termsConditions ? (
          <div className="ps-2 mb-1" style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>
            {storeInfo.termsConditions}
          </div>
        ) : (
          <ol className="ps-3 mb-1" style={{ paddingLeft: '1.2rem' }}>
            <li className="mb-0.5">Mengikuti Seluruh Aturan Yang Berlaku Di {storeNameDisplay}.</li>
            <li className="mb-0.5">Barang Yang Saya Gadaikan Adalah Milik Pribadi Dan Bukan Hasil Tindak Kejahatan Dan Apabila Dikemudian Hari Barang Tersebut Bermasalah, Maka Saya Akan Bertanggung Jawab Tanpa Melibatkan Pihak {storeNameDisplay}.</li>
            <li className="mb-0.5">Menyetujui Jumlah Tebusan Tidak Ada Pengurangan Apabila Pengambilan Barang Sebelum Jatuh Tempo.</li>
            <li className="mb-0.5">Menyetujui Denda Keterlambatan Sebesar 1% Perhari Dari Besar Gadai.</li>
            <li className="mb-0.5">Menerima Dan Menyetujui Barang Menjadi Hak Milik {storeNameDisplay} Apabila Sudah Melewati Perjanjian Lamanya Gadai Atau Masa Waktu Kesepakatan Berakhir Yaitu 1 (satu) Minggu Setelah Jatuh Tempo.</li>
            <li className="mb-0.5">Menyetujui Dan Bertanggung Jawab Pada Kerusakan Barang Apabila Melewati 1 Bulan Di Penyimpanan {storeNameDisplay}.</li>
          </ol>
        )}
        <div className="fst-italic text-center mt-1 fw-semibold" style={{ fontSize: '10px' }}>
          Demikian Pernyataan Ini Dibuat Tanpa Ada Paksaan Dari Pihak Manapun.
        </div>
      </div>

      {/* 7. TANDA TANGAN & SYARAT PENGAMBILAN */}
      <div className="row align-items-start my-2 pt-1" style={{ fontSize: '10.5px' }}>
        <div className="col-7">
          <div className="mb-2 text-center" style={{ width: '90%' }}>
            Jakarta, {formatDateIndo(createdAt || startDate)}
          </div>
          <div className="row text-center">
            <div className="col-6">
              <div className="mb-5">Yang Menyatakan/Penggadai</div>
              <div className="fw-bold border-bottom d-inline-block px-3">
                ( {customer?.name || '___________________'} )
              </div>
            </div>
            <div className="col-6">
              <div className="mb-5">Petugas</div>
              <div className="fw-bold border-bottom d-inline-block px-3">
                ( {user?.fullName || 'Petugas Belvin88'} )
              </div>
            </div>
          </div>
        </div>

        {/* Box Syarat Pengambilan Barang */}
        <div className="col-5">
          <div className="border border-dark p-2 rounded-1 bg-light" style={{ fontSize: '9.5px', lineHeight: '1.3' }}>
            <div className="fw-bold border-bottom border-dark pb-1 mb-1">Syarat Pengambilan Barang:</div>
            <div className="mb-1">&blksquare; Wajib Membawa Surat/bon Gadai Dan Ktp Asli</div>
            <div>&blksquare; Pengambilan Barang Yang Diwakilkan Diwajibkan:</div>
            <div className="ps-2">
              <div>&bull; Surat Kuasa Dari Sipenggadai</div>
              <div>&bull; Surat/bon Gadai</div>
              <div>&bull; Ktp Asli Atas Nama</div>
              <div>&bull; Ktp Asli Yang Mewakilkan</div>
            </div>
          </div>
        </div>
      </div>

      {/* 8. BLUE FOOTER BOX - KETENTUAN */}
      <div 
        className="text-white p-2 mt-2 rounded-1" 
        style={{ backgroundColor: '#1d4ed8', border: '1px solid #1e40af', fontSize: '9.5px', lineHeight: '1.35', boxShadow: '0 2px 4px rgba(29, 78, 216, 0.15)' }}
      >
        <div className="fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.5px' }}>ketentuan</div>
        <div>&blksquare; memperpanjang tempo gadai wajib membayar bunga yang telah berjalan</div>
        <div>&blksquare; konfirmasi (penebusan barang/perpanjang tempo gadai) hanya berlaku 2x (per minggu) setelah jatuh tempo</div>
        <div>&blksquare; Konfirmasi waktu penebusan/perpanjangan barang bisa melalui telpon/SMS/WA dan atau datang langsung ke outlet Belvin88cellular</div>
      </div>
    </div>
  );
};

export default PawnReceiptNote;
