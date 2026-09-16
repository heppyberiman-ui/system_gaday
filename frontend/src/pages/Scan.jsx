import React, { useState } from "react";
import api from "../services/api";

const Scan = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawText, setRawText] = useState("");
  const [geminiKey, setGeminiKey] = useState(() => {
    const saved = localStorage.getItem("gemini_api_key");
    return saved?.trim() || "";
  });
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState("");
  const [keySavedMsg, setKeySavedMsg] = useState("");
  const [keyError, setKeyError] = useState("");

  // Editable parsed form states
  const [transactionCode, setTransactionCode] = useState("");
  const [nik, setNik] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Elektronik");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("10.0");
  const [durationDays, setDurationDays] = useState("14");
  const [notes, setNotes] = useState("");

  const [hasScanned, setHasScanned] = useState(false);

  // Import handling states
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importedResult, setImportedResult] = useState(null);

  const handleFileChange = (e) => {
    setError("");
    setHasScanned(false);
    setImportedResult(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setError("");
    setHasScanned(false);
    setImportedResult(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setHasScanned(false);
    setImportedResult(null);
    setError("");
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Silakan pilih atau seret berkas surat gadai terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");
    setHasScanned(false);
    setImportedResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const reqHeaders = {
        "Content-Type": "multipart/form-data",
      };
      if (geminiKey) {
        reqHeaders["x-gemini-key"] = geminiKey;
      }

      const response = await api.post("/scan/surat", formData, {
        headers: reqHeaders,
        timeout: 60000, // 60 seconds for AI Vision scan
      });

      const data = response.data.data;
      setRawText(data.rawText || "");

      const parsed = data.parsed;
      const defaultTx =
        parsed.transactionCode ||
        `PH-${Math.floor(100000 + Math.random() * 900000)}`;
      const defaultName =
        parsed.customerName ||
        (parsed.nik
          ? `Nasabah NIK ${parsed.nik.slice(-4)}`
          : "Nasabah Baru Nota Fisik");
      const defaultItem = parsed.itemName || "Handphone / Elektronik";
      const defaultLoan = String(parsed.loanAmount || "500000");

      setTransactionCode(defaultTx);
      setNik(parsed.nik || "");
      setCustomerName(defaultName);
      setPhone(parsed.phone || "");
      setAddress(parsed.address || "");
      setItemName(defaultItem);
      setCategory(parsed.category || "Elektronik");
      setLoanAmount(defaultLoan);
      setInterestRate(String(parsed.interestRate || "10.0"));
      setDurationDays(String(parsed.durationDays || "14"));
      setNotes(`Hasil scan otomatis dari nota fisik & KTP: ${defaultTx}`);

      setHasScanned(true);
      setError("");
    } catch (err) {
      console.error("OCR Scanning error:", err);
      let errMsg =
        err.response?.data?.message || err.message || "Proses scan gagal.";
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        errMsg =
          'Proses scan memakan waktu lebih dari 60 detik. Silakan coba klik "Baca Tulisan Nota Cerdas" kembali.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!customerName || !itemName || !loanAmount) {
      setImportError(
        "Nama Nasabah, Nama Barang, dan Nilai Uang Pinjaman wajib diisi.",
      );
      return;
    }

    setImportLoading(true);
    setImportError("");

    try {
      const response = await api.post("/scan/import", {
        transactionCode,
        nik,
        name: customerName,
        phone,
        address,
        itemName,
        category,
        loanAmount: parseFloat(loanAmount),
        interestRate: parseFloat(interestRate),
        durationDays: parseInt(durationDays),
        adminFee: 0,
        notes,
      });

      setImportedResult(response.data.data);
      setHasScanned(false);
    } catch (err) {
      console.error("Error importing scanned transaction:", err);
      setImportError(
        err.response?.data?.message ||
          "Gagal menyimpan transaksi otomatis ke database.",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const formatRupiah = (val) => {
    if (val === undefined || val === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const handleSaveKey = () => {
    const cleanKey = tempKeyInput.trim();
    if (!cleanKey) return;

    if (cleanKey.length < 25) {
      setKeyError(
        `API Key belum lengkap (hanya ${cleanKey.length} karakter)! Google Gemini API Key terdiri dari sekitar 39 karakter yang diawali AIzaSy... Silakan salin (Copy) seluruh teks kode dari tombol Copy di Google AI Studio.`,
      );
      return;
    }

    setKeyError("");
    localStorage.setItem("gemini_api_key", cleanKey);
    setGeminiKey(cleanKey);
    setKeySavedMsg("Gemini API Key berhasil disimpan! AI Vision aktif 100%.");
    setTimeout(() => setKeySavedMsg(""), 4000);
    setShowKeyModal(false);
  };

  const handleRemoveKey = () => {
    localStorage.removeItem("gemini_api_key");
    setGeminiKey("");
    setShowKeyModal(false);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            Smart Scan Nota (OCR Auto Input)
          </h3>
          <p className="text-muted mb-0 small">
            Scan foto nota fisik/tulisan tangan & KTP untuk otomatis menginput
            data Nasabah, Barang, dan Transaksi ke database
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {geminiKey ? (
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1.5 shadow-sm"
                onClick={() => {
                  setTempKeyInput(geminiKey);
                  setShowKeyModal(true);
                }}
              >
                <i className="bi bi-check-circle-fill"></i> AI Vision (Gemini
                Active 99.9%)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={handleRemoveKey}
                title="Hapus API Key"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm fw-bold d-flex align-items-center gap-1.5 text-white shadow-sm"
              style={{ backgroundColor: "#7e22ce", borderColor: "#7e22ce" }}
              onClick={() => {
                setTempKeyInput("");
                setShowKeyModal(true);
              }}
            >
              <i className="bi bi-key-fill"></i> Set Gemini API Key (AI 99.9%
              Akurat)
            </button>
          )}
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle py-2 px-3 rounded-3 d-flex align-items-center gap-1.5">
            <i className="bi bi-cpu-fill"></i> Tesseract Offline
          </span>
        </div>
      </div>

      {keySavedMsg && (
        <div className="alert alert-success py-2.5 px-3 mb-4 rounded-3 border-success-subtle small d-flex align-items-center gap-2 shadow-sm">
          <i className="bi bi-check-circle-fill fs-5"></i>
          <div>{keySavedMsg}</div>
        </div>
      )}

      {/* Modal API Key Setup */}
      {showKeyModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-key-fill text-warning fs-4"></i>{" "}
                  Konfigurasi Gemini Vision AI Key
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowKeyModal(false)}
                ></button>
              </div>
              <div className="modal-body py-3">
                {keyError && (
                  <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>{" "}
                    {keyError}
                  </div>
                )}
                <p className="text-muted small mb-3">
                  Masukkan **Gemini API Key** gratis dari Google AI Studio untuk
                  mengaktifkan AI Vision yang dapat membaca tulisan tangan
                  sekecil apapun & foto KTP dengan akurasi 99.9%.
                </p>
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className="form-control font-monospace"
                    id="geminiKeyInput"
                    placeholder="AIzaSy..."
                    value={tempKeyInput}
                    onChange={(e) => setTempKeyInput(e.target.value)}
                  />
                  <label htmlFor="geminiKeyInput">
                    Tempelkan API Key (mulai AIzaSy...)
                  </label>
                </div>
                <div className="alert alert-light border py-2 px-3 rounded-3 small text-muted mb-0">
                  <i className="bi bi-info-circle me-1 text-primary"></i>
                  API key disimpan dengan aman di browser Anda dan hanya
                  digunakan untuk memproses foto OCR.
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light btn-sm fw-semibold"
                  onClick={() => setShowKeyModal(false)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm fw-bold px-4"
                  onClick={handleSaveKey}
                  disabled={!tempKeyInput.trim()}
                >
                  <i className="bi bi-save-fill me-1"></i> Simpan API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          className="alert alert-danger py-2.5 px-3 mb-4 rounded-3 border-danger-subtle small d-flex align-items-center gap-2"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div>{error}</div>
        </div>
      )}

      {importedResult && (
        <div className="alert alert-success p-4 mb-4 rounded-3 border-success-subtle shadow-sm">
          <div className="d-flex align-items-start gap-3">
            <i className="bi bi-check-circle-fill text-success fs-2"></i>
            <div>
              <h5 className="fw-bold text-success mb-1">
                Transaksi Berhasil Disimpan Otomatis!
              </h5>
              <p className="text-dark small mb-2">
                Data nasabah <strong>{importedResult.customer?.name}</strong>,
                barang jaminan <strong>{importedResult.item?.name}</strong>, dan
                transaksi{" "}
                <strong>{importedResult.transaction?.transactionCode}</strong>{" "}
                telah otomatis terdaftar di database.
              </p>
              <div className="d-flex gap-2">
                <a
                  href="/customers"
                  className="btn btn-success btn-sm fw-semibold"
                >
                  <i className="bi bi-people-fill me-1"></i> Lihat Data Nasabah
                </a>
                <a
                  href="/transactions"
                  className="btn btn-outline-success btn-sm fw-semibold"
                >
                  <i className="bi bi-printer me-1"></i> Lihat & Cetak Nota
                  Gadai
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Upload Zone & Image Preview Column */}
        <div className="col-12 col-xl-5">
          <div className="card card-premium p-4 h-100">
            <h5 className="fw-bold text-dark mb-3">
              1. Upload Foto Nota Fisik
            </h5>

            <form onSubmit={handleScanSubmit}>
              {!previewUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border border-dashed rounded-3 p-5 text-center d-flex flex-column align-items-center justify-content-center bg-light cursor-pointer"
                  style={{
                    minHeight: "280px",
                    borderColor: "#cbd5e1",
                    borderStyle: "dashed",
                    borderWidth: "2px",
                  }}
                  onClick={() =>
                    document.getElementById("scanFileInput").click()
                  }
                >
                  <div
                    className="bg-primary-subtle text-primary rounded-circle p-3 d-flex align-items-center justify-content-center mb-3"
                    style={{ width: "56px", height: "56px" }}
                  >
                    <i className="bi bi-camera-fill fs-3"></i>
                  </div>
                  <h6 className="fw-bold text-dark mb-1">
                    Foto / Scan Nota Tulisan Tangan
                  </h6>
                  <p className="text-muted small mb-3">
                    Seret & lepas foto nota kertas di sini atau klik untuk
                    menjelajah
                  </p>
                  <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-3 py-1.5 px-3">
                    Format: JPG, PNG, JPEG (Maks. 5MB)
                  </span>
                </div>
              ) : (
                <div
                  className="border rounded-3 p-3 bg-light text-center position-relative"
                  style={{ minHeight: "280px" }}
                >
                  <img
                    src={previewUrl}
                    alt="Preview Surat Gadai"
                    className="img-fluid rounded-3 border shadow-sm"
                    style={{ maxHeight: "260px", objectFit: "contain" }}
                  />
                  <button
                    type="button"
                    onClick={handleClear}
                    className="btn btn-danger btn-sm rounded-circle position-absolute"
                    style={{
                      top: "15px",
                      right: "15px",
                      width: "32px",
                      height: "32px",
                      padding: "0",
                    }}
                    title="Hapus gambar"
                    disabled={loading}
                  >
                    <i className="bi bi-trash-fill"></i>
                  </button>
                  <div className="mt-3 text-muted small text-truncate px-2">
                    <i className="bi bi-file-earmark-image-fill text-primary me-1"></i>
                    {selectedFile?.name} (
                    {Math.round(selectedFile?.size / 1024)} KB)
                  </div>
                </div>
              )}

              <input
                type="file"
                id="scanFileInput"
                accept="image/jpeg,image/png,image/jpg"
                className="d-none"
                onChange={handleFileChange}
              />

              <button
                type="submit"
                className="btn btn-primary w-100 py-2.5 mt-4 fw-bold d-flex align-items-center justify-content-center gap-2"
                disabled={loading || !selectedFile}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Mengekstrak Tulisan Nota (OCR)...
                  </>
                ) : (
                  <>
                    <i className="bi bi-lightning-charge-fill"></i> Baca Tulisan
                    Nota Cerdas
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-top">
              <h6 className="fw-bold text-dark small mb-2">
                <i className="bi bi-lightbulb-fill text-warning me-1"></i> Tips
                Pengambilan Foto Nota agar Pembacaan Akurat:
              </h6>
              <ul
                className="text-muted small ps-3 mb-0"
                style={{ fontSize: "0.8rem" }}
              >
                <li>
                  Pastikan tulisan atau ketikan nota terkena{" "}
                  <strong>cahaya yang cukup terang</strong>.
                </li>
                <li>
                  Posisikan kamera <strong>tegak lurus</strong> melintang di
                  atas kertas nota.
                </li>
                <li>Hindari gambar bayangan tangan atau foto buram/blur.</li>
                <li>
                  Format tulisan tangan yang rapi atau nota cetakan komputer
                  dibaca lebih presisi.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Verification & Auto Import Form Column */}
        <div className="col-12 col-xl-7">
          <div className="card card-premium p-4 h-100">
            <h5 className="fw-bold text-dark mb-3">
              2. Verifikasi & Import Otomatis Ke Database
            </h5>

            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5 h-100">
                <div
                  className="spinner-grow text-primary mb-3"
                  role="status"
                  style={{ width: "3rem", height: "3rem" }}
                ></div>
                <h6 className="fw-bold text-dark mb-1">
                  Mengekstrak Karakter Tangan Nota
                </h6>
                <p className="text-muted small text-center px-4">
                  Sistem sedang memproses OCR tulisan nota fisik untuk
                  mengekstrak Nama Nasabah, NIK, No HP, Nama Barang, dan Uang
                  Pinjaman.
                </p>
              </div>
            ) : hasScanned ? (
              <form onSubmit={handleImportSubmit}>
                {importError && (
                  <div className="alert alert-danger py-2 px-3 mb-3 border-danger-subtle rounded-3 small">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>{" "}
                    {importError}
                  </div>
                )}

                <div className="alert alert-info py-2.5 px-3 mb-3 border-info-subtle rounded-3 small">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-cpu-fill text-info fs-5"></i>
                      <span className="fw-semibold">
                        Ekstraksi OCR Berhasil! Bahasa: Indonesian + English
                      </span>
                    </div>
                    {rawText && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-info py-1 px-2.5 fw-semibold"
                        onClick={() => setShowRawText(!showRawText)}
                        style={{ fontSize: "0.75rem" }}
                      >
                        <i
                          className={`bi ${showRawText ? "bi-eye-slash-fill" : "bi-eye-fill"} me-1`}
                        ></i>
                        {showRawText
                          ? "Sembunyikan Teks Mentah"
                          : "Lihat Teks Mentah (Raw OCR)"}
                      </button>
                    )}
                  </div>
                  <div
                    className="mt-1 text-muted"
                    style={{ fontSize: "0.8rem" }}
                  >
                    Sistem membaca teks dari nota fisik secara dinamis. Periksa
                    & lengkapi field di bawah sebelum disimpan ke database.
                  </div>
                </div>

                {showRawText && rawText && (
                  <div className="card bg-dark text-light p-3 mb-3 rounded-3 shadow-sm border-0">
                    <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom border-secondary">
                      <span className="fw-bold small text-warning">
                        <i className="bi bi-file-earmark-code-fill me-1"></i>{" "}
                        Teks Mentah Hasil Ekstraksi Mesin OCR (Tesseract
                        ind+eng):
                      </span>
                      <span className="badge bg-secondary text-light">
                        {rawText.length} Karakter
                      </span>
                    </div>
                    <pre
                      className="mb-0 text-success-subtle font-monospace small"
                      style={{
                        maxHeight: "180px",
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        fontSize: "0.8rem",
                      }}
                    >
                      {rawText}
                    </pre>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <div className="form-floating">
                      <input
                        type="text"
                        className="form-control"
                        id="txCodeInput"
                        value={transactionCode}
                        onChange={(e) => setTransactionCode(e.target.value)}
                      />
                      <label htmlFor="txCodeInput">
                        Kode / Nomor Nota Gadai
                      </label>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="form-floating">
                      <input
                        type="text"
                        className="form-control"
                        id="nikInput"
                        value={nik}
                        onChange={(e) => setNik(e.target.value)}
                      />
                      <label htmlFor="nikInput">
                        NIK Identitas KTP Nasabah
                      </label>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="form-floating">
                      <input
                        type="text"
                        className="form-control"
                        id="custNameInput"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                      <label htmlFor="custNameInput">
                        Nama Lengkap Nasabah *
                      </label>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="form-floating">
                      <input
                        type="text"
                        className="form-control"
                        id="phoneInput"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <label htmlFor="phoneInput">
                        No. HP / WhatsApp Nasabah
                      </label>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="form-floating">
                      <input
                        type="text"
                        className="form-control"
                        id="addressInput"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                      <label htmlFor="addressInput">
                        Alamat Tempat Tinggal Nasabah
                      </label>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <div className="form-floating">
                      <input
                        type="text"
                        className="form-control"
                        id="itemNameInput"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        required
                      />
                      <label htmlFor="itemNameInput">
                        Nama & Tipe Barang Jaminan *
                      </label>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6">
                    <label
                      className="form-label text-muted fw-semibold small"
                      style={{ fontSize: "0.8rem" }}
                    >
                      Kategori Barang
                    </label>
                    <select
                      className="form-select py-3"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Elektronik">Elektronik</option>
                      <option value="Emas & Logam Mulia">
                        Emas & Logam Mulia
                      </option>
                      <option value="Kendaraan">Kendaraan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="col-12 col-sm-4">
                    <div className="form-floating">
                      <input
                        type="number"
                        className="form-control"
                        id="loanAmtInput"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        required
                      />
                      <label htmlFor="loanAmtInput">Uang Pinjaman (Rp) *</label>
                    </div>
                  </div>

                  <div className="col-12 col-sm-4">
                    <div className="form-floating mb-1">
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        id="rateInput"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                      />
                      <label htmlFor="rateInput">Bunga Gadai (%)</label>
                    </div>
                    <div className="d-flex gap-1">
                      {["10", "15", "20"].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          className={`btn btn-sm py-0.5 px-2 rounded-2 fw-semibold ${
                            String(interestRate) === rate
                              ? "btn-primary text-white"
                              : "btn-outline-secondary text-dark bg-white"
                          }`}
                          style={{ fontSize: "0.75rem" }}
                          onClick={() => setInterestRate(rate)}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-12 col-sm-4">
                    <div className="form-floating">
                      <input
                        type="number"
                        className="form-control"
                        id="tenorInput"
                        value={durationDays}
                        onChange={(e) => setDurationDays(e.target.value)}
                      />
                      <label htmlFor="tenorInput">Tenor (Hari)</label>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 d-flex justify-content-end">
                  <button
                    type="submit"
                    className="btn btn-success py-2.5 px-4 fw-bold d-flex align-items-center gap-2 shadow-sm"
                    disabled={importLoading}
                  >
                    {importLoading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Menyimpan Otomatis...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-database-fill-add fs-5"></i> Simpan
                        Otomatis Ke Database
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center py-5 h-100 text-muted">
                <i className="bi bi-qr-code-scan fs-1 d-block mb-3 text-muted"></i>
                <h6 className="fw-bold text-dark mb-1">
                  Menunggu Unggahan Foto Nota Fisik
                </h6>
                <p className="text-muted small text-center px-4">
                  Unggah atau foto nota kertas (seperti nota tulisan tangan) di
                  panel sebelah kiri. Sistem OCR akan secara otomatis membaca
                  dan mengisi form verifikasi ini.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scan;
