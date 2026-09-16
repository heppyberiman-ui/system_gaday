const Tesseract = require("tesseract.js");
const path = require("path");

/**
 * Clean currency string to numeric value
 * e.g., "Rp 400.000,-" -> 400000
 * @param {string} str
 * @returns {number|null}
 */
const parseCurrency = (str) => {
  if (!str) return null;
  // Remove "Rp", "IDR", spaces, trailing ",-" or ".00"
  let cleaned = String(str)
    .replace(/(?:rp|idr|\.,-|\,-)/gi, "")
    .trim();
  cleaned = cleaned.replace(/[\s]/g, "");

  if (/\d{1,3}(\.\d{3})+/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "");
  } else if (/\d{1,3}(,\d{3})+/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, "");
  } else {
    cleaned = cleaned.replace(/,/g, ".");
  }

  const num = parseFloat(cleaned.replace(/[^\d.]/g, ""));
  return !isNaN(num) && num >= 10000 ? num : null;
};

/**
 * Advanced Heuristic Parser for Handwritten Notes & KTP Photos
 * @param {string} text - Raw OCR text output
 * @returns {Object} Structured data
 */
const parseOcrText = (text) => {
  const normalizedText = text || "";
  const lines = normalizedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let transactionCode = null;
  let nik = null;
  let customerName = null;
  let phone = null;
  let address = null;
  let itemName = null;
  let category = "Elektronik";
  let loanAmount = null;
  let payoffAmount = null;
  let durationDays = 14;
  let dueDate = null;

  // 1. Transaction Code (e.g. Nomor: 040899, PH-577178, Kode Nota: 12345)
  const txCodeRegex =
    /(?:nomor|no\.|no|kode|nota|no\s*nota|no\s*surat|ph)\s*[:=.]?\s*([A-Za-z0-9/-]+)/i;
  const txMatch = normalizedText.match(txCodeRegex);
  if (txMatch && txMatch[1]) {
    const rawCode = txMatch[1].trim();
    if (rawCode.length >= 3 && !/nama|alamat|tanggal|ktp|nik/i.test(rawCode)) {
      transactionCode = rawCode.toUpperCase().startsWith("PH-")
        ? rawCode.toUpperCase()
        : `PH-${rawCode.toUpperCase()}`;
    }
  }

  // 2. NIK Identitas KTP (16 digits, with optional spaces/dashes)
  // First try direct 16-digit sequence
  const directNikMatch = normalizedText.match(/\b\d{16}\b/);
  if (directNikMatch) {
    nik = directNikMatch[0];
  } else {
    // Try matching spaced NIK (e.g., 3172 0526 0207 0006 or 3172-0526-0207-0006)
    const spacedNikMatch = normalizedText.match(
      /(?:nik|ktp|identitas)?\s*[:=.]?\s*(\d{4}[\s.-]?\d{4}[\s.-]?\d{4}[\s.-]?\d{4})/i,
    );
    if (spacedNikMatch && spacedNikMatch[1]) {
      const cleanDigits = spacedNikMatch[1].replace(/\D/g, "");
      if (cleanDigits.length === 16) {
        nik = cleanDigits;
      }
    }
  }

  // 3. Phone Number / WhatsApp
  const phoneRegex =
    /(?:hp|wa|telepon|phone|no\s*hp|no\s*wa|telp)\s*[:=.]?\s*([\d\s-]{10,16})/i;
  const phoneMatch = normalizedText.match(phoneRegex);
  if (phoneMatch && phoneMatch[1]) {
    const cleanedPhone = phoneMatch[1].replace(/\D/g, "");
    if (cleanedPhone.length >= 9 && cleanedPhone.startsWith("08")) {
      phone = cleanedPhone;
    }
  }
  if (!phone) {
    const rawPhoneMatch = normalizedText.match(/\b(08\d{8,12})\b/);
    if (rawPhoneMatch) {
      phone = rawPhoneMatch[1];
    }
  }

  // 4. Customer Name (Nama Nasabah)
  // Check KTP style "Nama : BUDI SANTOSO" or Note style "Nama Lengkap: ..."
  const nameRegex =
    /(?:nama\s*lengkap|nama\s*nasabah|nama\s*peminjam|nama\s*pelanggan|nama|nasabah|peminjam|kepada)\s*[:=.]?\s*([A-Za-z\s.'`]+)/i;
  const nameMatch = normalizedText.match(nameRegex);
  if (nameMatch && nameMatch[1]) {
    let candidate = nameMatch[1]
      .split("\n")[0]
      .replace(/[\r\n]/g, "")
      .trim();
    candidate = candidate
      .replace(
        /^(lengkap|nasabah|peminjam|pelanggan|ktp|identitas|tempat|tgl|tgl\s*lahir|nik)\s*/i,
        "",
      )
      .trim();
    if (
      candidate.length > 2 &&
      !/identitas|alamat|nomor|telepon|hp|barang|rt|rw|kelurahan|kecamatan|agama|status/i.test(
        candidate,
      )
    ) {
      customerName = candidate;
    }
  }

  // Fallback: Scan lines for KTP uppercase name or line right after NIK
  if (!customerName) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^nama\s*[:=.]/i.test(line)) {
        const val = line.replace(/^nama\s*[:=.]/i, "").trim();
        if (val.length > 2) {
          customerName = val;
          break;
        }
      }
      // KTP format: line after NIK or PROVINSI line
      if (/provinsi|nik|ktp/i.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].replace(/^nama\s*[:=.]?/i, "").trim();
        if (
          nextLine.length > 3 &&
          /^[A-Z\s.'`]+$/.test(nextLine) &&
          !/provinsi|nik|kota|kabupaten/i.test(nextLine)
        ) {
          customerName = nextLine;
          break;
        }
      }
    }
  }

  // 5. Address (Alamat)
  const addressRegex =
    /(?:alamat|address|lokasi|tempat\s*tinggal|rt\/rw|jalan|jl\.)\s*[:=.]?\s*([^\n]+)/i;
  const addressMatch = normalizedText.match(addressRegex);
  if (addressMatch && addressMatch[1]) {
    const rawAddr = addressMatch[1].trim();
    if (rawAddr.length > 3 && !/nama|barang|pinjaman|nik|ktp/i.test(rawAddr)) {
      address = rawAddr;
    }
  }

  // 6. Item Brand / Name & Category Detection
  const lowercaseText = normalizedText.toLowerCase();

  // Detect Brand & Category automatically from text keywords
  let detectedBrand = "";
  if (/oppo/i.test(lowercaseText)) detectedBrand = "Oppo";
  else if (/samsung/i.test(lowercaseText)) detectedBrand = "Samsung";
  else if (/iphone|apple/i.test(lowercaseText)) detectedBrand = "iPhone";
  else if (/xiaomi|redmi/i.test(lowercaseText)) detectedBrand = "Xiaomi";
  else if (/realme/i.test(lowercaseText)) detectedBrand = "Realme";
  else if (/vivo/i.test(lowercaseText)) detectedBrand = "Vivo";
  else if (/asus/i.test(lowercaseText)) detectedBrand = "Asus";
  else if (/lenovo/i.test(lowercaseText)) detectedBrand = "Lenovo";
  else if (/macbook/i.test(lowercaseText)) detectedBrand = "MacBook";
  else if (/honda|vario|beat|scoopy/i.test(lowercaseText))
    detectedBrand = "Honda Motor";
  else if (/yamaha|nmax|aerox/i.test(lowercaseText))
    detectedBrand = "Yamaha Motor";
  else if (/emas|antam|cincin|kalung|gelang/i.test(lowercaseText))
    detectedBrand = "Emas / Perhiasan";

  if (
    /handphone|hp|phone|oppo|samsung|iphone|xiaomi|realme|vivo|laptop|macbook|asus|lenovo|tv|ipad|tablet|elektronik/i.test(
      lowercaseText,
    )
  ) {
    category = "Elektronik";
  } else if (
    /emas|logam|perhiasan|kalung|cincin|gelang|antam|gram|gr/i.test(
      lowercaseText,
    )
  ) {
    category = "Emas & Logam Mulia";
  } else if (
    /motor|mobil|kendaraan|vario|beat|nmax|scoopy|honda|yamaha|suzuki|kawasaki/i.test(
      lowercaseText,
    )
  ) {
    category = "Kendaraan";
  } else {
    category = "Elektronik";
  }

  const itemRegex =
    /(?:jenis\s*barang|nama\s*barang|merk|type|tipe|barang|item|jaminan)\s*[:=.]?\s*([A-Za-z0-9\s.-]+)/i;
  const itemMatch = normalizedText.match(itemRegex);
  if (itemMatch && itemMatch[1]) {
    const candidate = itemMatch[1]
      .split("\n")[0]
      .replace(/[\r\n]/g, "")
      .trim();
    if (
      candidate.length > 2 &&
      !/tenor|jatuh|besar|pinjaman|nama|alamat/i.test(candidate)
    ) {
      itemName = candidate;
    }
  }

  if (!itemName && detectedBrand) {
    itemName =
      category === "Elektronik" ? `Handphone ${detectedBrand}` : detectedBrand;
  }

  // 7. Loan Amount & Tebusan Extraction
  const amountRegex =
    /(?:besar\s*gadai|uang\s*pinjaman|jumlah\s*pinjaman|pinjaman|nilai\s*gadai|pinjam|cair)\s*[:=.]?\s*(?:rp|idr)?\s*([\d.,\s]+)/i;
  const amountMatch = normalizedText.match(amountRegex);
  if (amountMatch && amountMatch[1]) {
    loanAmount = parseCurrency(amountMatch[1]);
  }

  // Extract all currency values in text
  const rpMatches = normalizedText.match(/(?:rp|idr)?\s*[\d.]{4,12}/gi) || [];
  const parsedAmounts = rpMatches
    .map((m) => parseCurrency(m))
    .filter((val) => val !== null && val >= 50000)
    .sort((a, b) => a - b);

  if (!loanAmount && parsedAmounts.length > 0) {
    // If multiple amounts found, smallest is loan amount, larger is payoff amount
    loanAmount = parsedAmounts[0];
    if (parsedAmounts.length > 1) {
      payoffAmount = parsedAmounts[parsedAmounts.length - 1];
    }
  }

  // 8. Tenor & Tebusan
  const tenorRegex =
    /(?:tenor\s*gadai|tenor|durasi|jangka\s*waktu|jangka)\s*[:=.]?\s*(\d{1,3})\s*(?:hari|days|bln|bulan)?/i;
  const tenorMatch = normalizedText.match(tenorRegex);
  if (tenorMatch && tenorMatch[1]) {
    durationDays = parseInt(tenorMatch[1]);
  }

  const tebusanRegex =
    /(?:jumlah\s*tebusan|tebusan|total\s*pelunasan|pelunasan)\s*[:=.]?\s*(?:rp|idr)?\s*([\d.,\s]+)/i;
  const tebusanMatch = normalizedText.match(tebusanRegex);
  if (tebusanMatch && tebusanMatch[1]) {
    payoffAmount = parseCurrency(tebusanMatch[1]);
  }

  // 9. Due Date
  const dateRegex =
    /(?:jatuh\s*tempo|due\s*date|tgl\s*tempo)\s*[:=.]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i;
  const dateMatch = normalizedText.match(dateRegex);
  if (dateMatch && dateMatch[1]) {
    dueDate = dateMatch[1].trim();
  }

  // Interest rate calculation
  let interestRate = 10.0;
  if (loanAmount && payoffAmount && payoffAmount > loanAmount) {
    const interestTotal = payoffAmount - loanAmount;
    interestRate = parseFloat(((interestTotal / loanAmount) * 100).toFixed(1));
  }

  // --- SMART AUTO-FILL FOR EASY CUSTOMER & TRANSACTION CREATION ---
  // If fields are partially missing from handwritten notes, auto-fill sensible values so user doesn't get empty form!
  const finalTxCode =
    transactionCode || `PH-${Math.floor(100000 + Math.random() * 900000)}`;
  const finalNik = nik || "";
  const finalCustomerName =
    customerName || (nik ? `Nasabah NIK ${nik.slice(-4)}` : "");
  const finalPhone = phone || "";
  const finalAddress = address || "";
  const finalItemName =
    itemName ||
    (detectedBrand
      ? `Barang Jaminan (${detectedBrand})`
      : "Handphone / Elektronik");
  const finalCategory = category || "Elektronik";
  const finalLoanAmount =
    loanAmount || (payoffAmount ? Math.round(payoffAmount / 1.15) : 500000);

  return {
    rawText: text,
    parsed: {
      transactionCode: finalTxCode,
      nik: finalNik,
      customerName: finalCustomerName,
      phone: finalPhone,
      address: finalAddress,
      itemName: finalItemName,
      category: finalCategory,
      loanAmount: finalLoanAmount,
      interestRate: interestRate || 10.0,
      durationDays: durationDays || 14,
      dueDate: dueDate || "",
    },
  };
};

/**
 * Perform AI Vision OCR scan using Google Gemini 1.5 Flash API
 * @param {string} filePath
 * @param {string} apiKey
 */
const scanWithGemini = async (filePath, apiKey) => {
  const fs = require("fs");
  try {
    if (!apiKey || apiKey.trim().length < 25) {
      console.warn(
        `[Gemini API Warning] API Key terlalu pendek (${apiKey ? apiKey.length : 0} karakter). Gemini API Key yang valid terdiri dari sekitar 39 karakter yang diawali AIzaSy...`,
      );
      return null;
    }

    console.log(
      `[Gemini Vision AI] Initializing Vision scan on: ${filePath} with key length: ${apiKey.length}`,
    );
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");

    const ext = path.extname(filePath).toLowerCase();
    let mimeType = "image/jpeg";
    if (ext === ".png") mimeType = "image/png";
    else if (ext === ".webp") mimeType = "image/webp";

    const prompt = `Anda adalah sistem OCR cerdas untuk Surat Nota Gadai dan Kartu KTP Indonesia.
Analisis gambar ini (yang berisi surat nota gadai tulisan tangan dan/atau kartu KTP fisik).
Ekstrak semua data berikut dan kembalikan HANYA dalam format JSON tanpa teks pembuka/penutup markdown:
{
  "transactionCode": "Kode/Nomor nota gadai jika ada, misal: PH-040899",
  "nik": "16 digit NIK Identitas KTP jika ada",
  "customerName": "Nama Lengkap Nasabah / Pemilik KTP / Peminjam",
  "phone": "Nomor HP / WhatsApp Nasabah",
  "address": "Alamat Tempat Tinggal Nasabah",
  "itemName": "Nama & Tipe Barang Jaminan (misal: Handphone Oppo A5, Laptop Asus, Motor Honda Vario, Emas Perhiasan)",
  "category": "Pilih salah satu: Elektronik / Emas & Logam Mulia / Kendaraan / Lainnya",
  "loanAmount": 500000,
  "payoffAmount": 560000,
  "durationDays": 14
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Gemini API Status ${response.status}] ${errText}`);
      return null;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const cleanedJson = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsedData = JSON.parse(cleanedJson);

    console.log("[Gemini Vision AI Success] Parsed data:", parsedData);

    return {
      rawText: `[Hasil AI Vision Scan (Gemini 1.5 Flash)]\n${JSON.stringify(parsedData, null, 2)}`,
      parsed: {
        transactionCode:
          parsedData.transactionCode ||
          `PH-${Math.floor(100000 + Math.random() * 900000)}`,
        nik: parsedData.nik || "",
        customerName: parsedData.customerName || "",
        phone: parsedData.phone || "",
        address: parsedData.address || "",
        itemName: parsedData.itemName || "",
        category: parsedData.category || "Elektronik",
        loanAmount: parsedData.loanAmount || 500000,
        interestRate: 10.0,
        durationDays: parsedData.durationDays || 14,
        dueDate: "",
      },
    };
  } catch (error) {
    console.warn("[Gemini Vision AI Warning]:", error.message);
    return null;
  }
};

const USER_ACTIVE_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

/**
 * Perform optical character recognition on local file path using multi-pass scanning
 * @param {string} filePath
 */
const scanReceipt = async (filePath, customApiKey = null) => {
  const localLangPath = path.resolve(__dirname, "../../");

  // 1. Try Gemini Vision AI with customApiKey, process.env.GEMINI_API_KEY, or fallback USER_ACTIVE_GEMINI_KEY
  let apiKey =
    customApiKey && customApiKey.trim().length >= 25
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY || USER_ACTIVE_GEMINI_KEY;
  if (!apiKey || apiKey.trim().length < 25) {
    apiKey = USER_ACTIVE_GEMINI_KEY;
  }

  if (apiKey && apiKey.trim().length >= 25) {
    const aiResult = await scanWithGemini(filePath, apiKey.trim());
    if (aiResult) return aiResult;
  }

  // 2. Fallback to Dual-Pass Tesseract OCR
  try {
    console.log(
      `[OCR Multi-Pass] Initializing Pass 1 (AUTO mode ind+eng) on: ${filePath}`,
    );

    const result1 = await Tesseract.recognize(filePath, "ind+eng", {
      langPath: localLangPath,
      gzip: false,
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`[OCR Process] ${(m.progress * 100).toFixed(0)}%`);
        }
      },
    });

    let text1 = result1.data?.text || "";
    console.log(`[OCR Pass 1 Result] Length: ${text1.length} characters.`);

    let combinedText = text1;
    if (text1.length < 60) {
      console.log(
        `[OCR Multi-Pass] Low character count. Initializing Pass 2 (SPARSE_TEXT mode)...`,
      );
      try {
        const result2 = await Tesseract.recognize(filePath, "ind+eng", {
          langPath: localLangPath,
          gzip: false,
          tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
        });
        const text2 = result2.data?.text || "";
        console.log(`[OCR Pass 2 Result] Length: ${text2.length} characters.`);
        combinedText = `${text1}\n${text2}`;
      } catch (e2) {
        console.warn(`[OCR Pass 2 Warning]:`, e2.message);
      }
    }

    return parseOcrText(combinedText);
  } catch (error) {
    console.warn(
      "[OCR Warning] Primary scan failed, running fallback scan:",
      error.message,
    );
    try {
      const fallbackResult = await Tesseract.recognize(filePath, "eng", {
        langPath: localLangPath,
        gzip: false,
        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
      });
      return parseOcrText(fallbackResult.data?.text || "");
    } catch (e) {
      console.error("[OCR Error] All OCR attempts failed:", e.message);
      return parseOcrText("");
    }
  }
};

module.exports = {
  scanReceipt,
};
