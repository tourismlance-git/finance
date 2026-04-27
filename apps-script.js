// Google Apps Script - Backend API untuk Laporan Keuangan UMKM
// Deploy sebagai Web App dan gunakan URL-nya di aplikasi

const SPREADSHEET_ID = '1ip9jldvaDt1da2wNyqqrZpIlujByg_YAj_vl_SfWEUI';

// Handle CORS
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function doGet(e) {
  // Handle OPTIONS request for CORS
  if (e.parameter.action === undefined && e.method === 'OPTIONS') {
    return ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(corsHeaders());
  }
  
  const action = e.parameter.action;
  let result = {};
  
  try {
    switch(action) {
      case 'getTransaksi':
        result = getTransaksi(e.parameter.tanggalAwal, e.parameter.tanggalAkhir);
        break;
      case 'addTransaksi':
        result = addTransaksi(JSON.parse(e.parameter.data));
        break;
      case 'updateTransaksi':
        result = updateTransaksi(e.parameter.id, JSON.parse(e.parameter.data));
        break;
      case 'deleteTransaksi':
        result = deleteTransaksi(e.parameter.id);
        break;
      case 'getKategori':
        result = getKategori();
        break;
      case 'addKategori':
        result = addKategori(JSON.parse(e.parameter.data));
        break;
      case 'getRekening':
        result = getRekening();
        break;
      case 'updateRekening':
        result = updateRekening(JSON.parse(e.parameter.data));
        break;
      case 'getDashboard':
        result = getDashboard();
        break;
      case 'addRekening':
        result = addRekening(JSON.parse(e.parameter.data));
        break;
      case 'deleteRekening':
        result = deleteRekening(e.parameter.id);
        break;
      case 'deleteKategori':
        result = deleteKategori(e.parameter.id);
        break;
      case 'updateKategori':
        result = updateKategori(JSON.parse(e.parameter.data));
        break;
      case 'importTransaksi':
        result = importTransaksi(e.parameter.tsvData);
        break;
      case 'clearTransaksi':
        result = clearTransaksi();
        break;
      default:
        result = { success: false, message: 'Action tidak ditemukan' };
    }
  } catch(error) {
    result = { success: false, message: error.toString() };
  }
  
  const output = ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Add CORS headers
  const newOutput = Utilities.newBlob(JSON.stringify(result), ContentService.MimeType.JSON);
  newOutput.setHeaders(corsHeaders());
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(corsHeaders());
}

function doPost(e) {
  return doGet(e);
}

// ================== TRANSAKSI ==================

function getTransaksi(tanggalAwal, tanggalAkhir) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Transaksi') || ss.insertSheet('Transaksi');
  
  // Setup header jika kosong
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'tanggal', 'deskripsi', 'kategori', 'jumlah', 'tipe', 'createdAt', 'updatedAt']);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const transactions = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const tanggal = new Date(row[1]);
    
    if (!tanggalAwal || !tanggalAkhir || 
        (tanggal >= new Date(tanggalAwal) && tanggal <= new Date(tanggalAkhir))) {
      transactions.push({
        id: row[0],
        tanggal: row[1],
        deskripsi: row[2],
        kategori: row[3],
        jumlah: Number(row[4]),
        tipe: row[5],
        createdAt: row[6],
        updatedAt: row[7]
      });
    }
  }
  
  return { success: true, data: transactions };
}

function addTransaksi(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Transaksi') || ss.insertSheet('Transaksi');
  
  const id = Utilities.getUuid();
  const now = new Date();
  
  sheet.appendRow([
    id,
    data.tanggal,
    data.deskripsi,
    data.kategori,
    data.jumlah,
    data.tipe,
    now,
    now
  ]);
  
  return { success: true, message: 'Transaksi berhasil ditambahkan', id: id };
}

function updateTransaksi(id, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Transaksi');
  const dataRange = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === id) {
      sheet.getRange(i + 1, 2).setValue(data.tanggal);
      sheet.getRange(i + 1, 3).setValue(data.deskripsi);
      sheet.getRange(i + 1, 4).setValue(data.kategori);
      sheet.getRange(i + 1, 5).setValue(data.jumlah);
      sheet.getRange(i + 1, 6).setValue(data.tipe);
      sheet.getRange(i + 1, 8).setValue(new Date());
      return { success: true, message: 'Transaksi berhasil diupdate' };
    }
  }
  
  return { success: false, message: 'Transaksi tidak ditemukan' };
}

function deleteTransaksi(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Transaksi');
  const dataRange = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Transaksi berhasil dihapus' };
    }
  }
  
  return { success: false, message: 'Transaksi tidak ditemukan' };
}

// ================== KATEGORI ==================

function getKategori() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Kategori');
  
  if (!sheet) {
    sheet = ss.insertSheet('Kategori');
    sheet.appendRow(['id', 'nama', 'tipe', 'createdAt']);
    sheet.appendRow(['1', 'Pendapatan Jasa', 'pemasukan', new Date()]);
    sheet.appendRow(['2', 'Pendapatan Produksi', 'pemasukan', new Date()]);
    sheet.appendRow(['3', 'Pendapatan Lain', 'pemasukan', new Date()]);
    sheet.appendRow(['4', 'Biaya Listrik', 'pengeluaran', new Date()]);
    sheet.appendRow(['5', 'Biaya Internet', 'pengeluaran', new Date()]);
    sheet.appendRow(['6', 'Biaya Sewa', 'pengeluaran', new Date()]);
  }
  
  const data = sheet.getDataRange().getValues();
  const kategori = [];
  
  for (let i = 1; i < data.length; i++) {
    kategori.push({
      id: data[i][0],
      nama: data[i][1],
      tipe: data[i][2],
      createdAt: data[i][3]
    });
  }
  
  return { success: true, data: kategori };
}

function addKategori(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Kategori') || ss.insertSheet('Kategori');
  
  const id = Utilities.getUuid();
  sheet.appendRow([id, data.nama, data.tipe, new Date()]);
  
  return { success: true, message: 'Kategori berhasil ditambahkan' };
}

function updateKategori(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Kategori');
  const dataRange = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      sheet.getRange(i + 1, 2).setValue(data.nama);
      sheet.getRange(i + 1, 3).setValue(data.tipe);
      return { success: true, message: 'Kategori berhasil diupdate' };
    }
  }
  
  return { success: false, message: 'Kategori tidak ditemukan' };
}

function deleteKategori(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Kategori');
  const dataRange = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Kategori berhasil dihapus' };
    }
  }
  
  return { success: false, message: 'Kategori tidak ditemukan' };
}

// ================== REKENING ==================

function getRekening() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Rekening');
  
  if (!sheet) {
    sheet = ss.insertSheet('Rekening');
    sheet.appendRow(['id', 'nama', 'saldo', 'jenis', 'updatedAt']);
    sheet.appendRow(['1', 'Bank BCA', 10000000, 'Bank', new Date()]);
    sheet.appendRow(['2', 'Bank Mandiri', 5000000, 'Bank', new Date()]);
    sheet.appendRow(['3', 'Kas Tangan', 500000, 'Kas', new Date()]);
  }
  
  const data = sheet.getDataRange().getValues();
  const rekening = [];
  
  for (let i = 1; i < data.length; i++) {
    rekening.push({
      id: data[i][0],
      nama: data[i][1],
      saldo: Number(data[i][2]),
      jenis: data[i][3],
      updatedAt: data[i][4]
    });
  }
  
  return { success: true, data: rekening };
}

function updateRekening(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Rekening');
  const dataRange = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      sheet.getRange(i + 1, 3).setValue(data.saldo);
      sheet.getRange(i + 1, 5).setValue(new Date());
      return { success: true, message: 'Rekening berhasil diupdate' };
    }
  }
  
  return { success: false, message: 'Rekening tidak ditemukan' };
}

function addRekening(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Rekening') || ss.insertSheet('Rekening');
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'nama', 'saldo', 'jenis', 'updatedAt']);
  }
  
  const id = Utilities.getUuid();
  sheet.appendRow([id, data.nama, data.saldo, data.jenis, new Date()]);
  
  return { success: true, message: 'Rekening berhasil ditambahkan' };
}

function deleteRekening(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Rekening');
  const dataRange = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Rekening berhasil dihapus' };
    }
  }
  
  return { success: false, message: 'Rekening tidak ditemukan' };
}

// ================== DASHBOARD ==================

function getDashboard() {
  const transaksi = getTransaksi().data;
  const rekening = getRekening().data;
  
  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  
  transaksi.forEach(t => {
    if (t.tipe === 'debit') {
      totalPemasukan += t.jumlah;
    } else {
      totalPengeluaran += t.jumlah;
    }
  });
  
  const totalSaldoRekening = rekening.reduce((sum, r) => sum + r.saldo, 0);
  
  // Get recent transactions (last 10)
  const recentTransactions = transaksi.slice(-10).reverse();
  
  return {
    success: true,
    data: {
      totalPemasukan,
      totalPengeluaran,
      saldoKas: totalSaldoRekening,
      labaRugi: totalPemasukan - totalPengeluaran,
      totalTransaksi: transaksi.length,
      rekening,
      recentTransactions
    }
  };
}

// ================== IMPORT EXCEL ==================

function importTransaksi(tsvData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Transaksi') || ss.insertSheet('Transaksi');
  
  const rows = tsvData.split('\n');
  let imported = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split('\t');
    if (cols.length >= 5 && cols[0] !== 'tanggal') {
      const id = Utilities.getUuid();
      const now = new Date();
      sheet.appendRow([
        id,
        cols[0],  // tanggal
        cols[1],  // deskripsi
        cols[2],  // kategori
        Number(cols[3].replace(/[^0-9]/g, '')),  // jumlah
        cols[4] || 'debit',  // tipe
        now,
        now
      ]);
      imported++;
    }
  }
  
  return { success: true, message: `Berhasil import ${imported} transaksi` };
}

function clearTransaksi() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Transaksi');
  
  if (!sheet) {
    return { success: true, message: 'Sheet Transaksi tidak ada, tidak ada yang perlu dihapus' };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  return { success: true, message: 'Semua transaksi berhasil dihapus' };
}