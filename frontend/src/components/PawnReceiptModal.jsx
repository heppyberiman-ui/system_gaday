import React, { useState } from 'react';
import PawnReceiptNote from './PawnReceiptNote';
import ThermalReceiptNote from './ThermalReceiptNote';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PawnReceiptModal = ({ show, onClose, transaction }) => {
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState('A4'); // 'A4' | '58mm' | '80mm'

  if (!show || !transaction) return null;

  const txObj = transaction.transaction || transaction;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printableArea');
    if (!element) return;

    try {
      setDownloading(true);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      pdf.save(`Nota_Gadai_${txObj.transactionCode || 'resmi'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal mengunduh berkas PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPNG = async () => {
    const element = document.getElementById('printableArea');
    if (!element) return;

    try {
      setDownloading(true);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `Nota_Gadai_${txObj.transactionCode || 'resmi'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
      alert('Gagal mengunduh berkas gambar.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendWhatsApp = () => {
    const customerName = txObj.customer?.name || txObj.customer?.fullName || txObj.customerName || 'Nasabah';
    let phone = txObj.customer?.phone || txObj.customerPhone || '';

    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }
    phone = phone.replace(/[^0-9]/g, '');

    const loanAmt = txObj.loanAmount || 0;
    const interestAmt = txObj.interestAmount || 0;
    const totalRepay = loanAmt + interestAmt;

    const text = `*SURAT PERJANJIAN GADAI (NOTA RESMI)*\n*BELVIN88 CELLULAR*\n-----------------------------------\n\nHalo *${customerName}*,\nBerikut rincian Surat Perjanjian Gadai resmi Anda:\n\n📌 *Kode Transaksi*: ${txObj.transactionCode}\n📱 *Barang Jaminan*: ${txObj.item?.name || txObj.itemName || '-'}\n💰 *Besar Pinjaman*: Rp ${Number(loanAmt).toLocaleString('id-ID')}\n🗓️ *Tenor*: ${txObj.durationDays} Hari\n⏰ *Jatuh Tempo*: ${new Date(txObj.dueDate).toLocaleDateString('id-ID')}\n💵 *Total Tebus Pelunasan*: Rp ${Number(totalRepay).toLocaleString('id-ID')}\n\nTerima kasih telah bertransaksi di Belvin88Cellular.`;

    const waUrl = phone 
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
  };

  const handleShareFile = async () => {
    const element = document.getElementById('printableArea');
    if (!element) return;

    try {
      setDownloading(true);
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `Nota_Gadai_${txObj.transactionCode || 'resmi'}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Nota Perjanjian Gadai Belvin88Cellular',
            text: `Surat Perjanjian Gadai ${txObj.transactionCode}`
          });
        } else {
          handleDownloadPNG();
        }
      });
    } catch (err) {
      console.error('Error sharing file:', err);
      handleDownloadPNG();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '1rem' }}>
          
          {/* Header */}
          <div className="modal-header border-bottom py-3 px-4 flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 bg-white" style={{ borderRadius: '1rem 1rem 0 0' }}>
            <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2 mb-0">
              <i className="bi bi-printer-fill text-primary"></i> Cetak Nota / Struk Gadai
            </h5>

            {/* Mode Switcher Buttons */}
            <div className="btn-group btn-group-sm shadow-sm">
              <button 
                type="button" 
                className={`btn ${viewMode === 'A4' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('A4')}
              >
                <i className="bi bi-file-earmark-text me-1"></i> Nota A4 Resmi
              </button>
              <button 
                type="button" 
                className={`btn ${viewMode === '58mm' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('58mm')}
              >
                <i className="bi bi-receipt me-1"></i> Struk 58mm (POS)
              </button>
              <button 
                type="button" 
                className={`btn ${viewMode === '80mm' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('80mm')}
              >
                <i className="bi bi-receipt-cutoff me-1"></i> Struk 80mm (POS)
              </button>
            </div>

            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          {/* Body Preview */}
          <div className="modal-body p-3 bg-light overflow-auto" style={{ maxHeight: '70vh' }}>
            <div className="text-center text-muted small mb-2">
              <i className="bi bi-info-circle me-1"></i>
              Preview Tampilan Format: <strong>{viewMode === 'A4' ? 'Surat Pernyataan A4 Resmi' : `Struk Thermal Kasir (${viewMode})`}</strong>
            </div>
            
            <div id="printableArea" className="bg-white border shadow-sm rounded p-2 mx-auto" style={{ width: viewMode === '58mm' ? '280px' : viewMode === '80mm' ? '380px' : '100%' }}>
              {viewMode === 'A4' ? (
                <PawnReceiptNote transaction={transaction} />
              ) : (
                <ThermalReceiptNote transaction={transaction} paperSize={viewMode} />
              )}
            </div>
          </div>

          {/* Footer & Actions */}
          <div className="modal-footer border-top py-3 px-4 bg-white d-flex flex-wrap align-items-center justify-content-between gap-2" style={{ borderRadius: '0 0 1rem 1rem' }}>
            <button type="button" className="btn btn-light border py-2 px-3 fw-semibold text-muted" onClick={onClose}>
              Tutup
            </button>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Send to WA */}
              <button 
                type="button" 
                className="btn btn-success fw-bold py-2 px-3 d-inline-flex align-items-center gap-1.5 shadow-sm"
                onClick={handleSendWhatsApp}
                title="Kirimkan rincian nota resmi ke nomor WhatsApp Nasabah"
              >
                <i className="bi bi-whatsapp"></i> Kirim WA
              </button>

              {/* Share File */}
              <button 
                type="button" 
                className="btn btn-outline-secondary fw-semibold py-2 px-3 d-inline-flex align-items-center gap-1.5"
                onClick={handleShareFile}
                disabled={downloading}
                title="Bagikan berkas nota ke aplikasi lain"
              >
                <i className="bi bi-share-fill"></i> Bagikan
              </button>

              {/* Download Image (PNG) */}
              <button 
                type="button" 
                className="btn btn-info text-white fw-bold py-2 px-3 d-inline-flex align-items-center gap-1.5 shadow-sm"
                onClick={handleDownloadPNG}
                disabled={downloading}
                title="Unduh berkas Gambar PNG"
              >
                <i className="bi bi-file-image"></i> Gambar PNG
              </button>

              {/* Download PDF */}
              <button 
                type="button" 
                className="btn btn-dark fw-bold py-2 px-3 d-inline-flex align-items-center gap-1.5 shadow-sm"
                onClick={handleDownloadPDF}
                disabled={downloading}
                title="Unduh berkas PDF Resmi"
              >
                {downloading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    Mengunduh...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-pdf-fill text-danger"></i> Unduh PDF
                  </>
                )}
              </button>

              {/* Print to Printer */}
              <button 
                type="button" 
                className="btn btn-primary fw-bold py-2 px-4 d-inline-flex align-items-center gap-1.5 shadow-sm"
                onClick={handlePrint}
                title={viewMode === 'A4' ? 'Cetak Nota Resmi A4' : `Cetak Struk Kasir Thermal ${viewMode}`}
              >
                <i className="bi bi-printer-fill"></i> Cetak {viewMode === 'A4' ? 'Nota Fisik' : `Struk (${viewMode})`}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PawnReceiptModal;
