import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import {
  buildAccountingSummary,
  filterTransactionsByDateRange,
  normalizeRekening,
  normalizeTransaction,
} from '@/lib/accounting';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1ip9jldvaDt1da2wNyqqrZpIlujByg_YAj_vl_SfWEUI';

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  
  return auth;
}

async function getSheet(name: string) {
  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  
  let sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === name);
  let sheetId = sheet?.properties?.sheetId;
  
  const correctHeaders = name === 'Rekening' 
    ? ['id', 'nama', 'nomor', 'saldo', 'jenis']
    : name === 'Transaksi'
    ? ['id', 'tanggal', 'deskripsi', 'kategori', 'jumlah', 'tipe']
    : ['id', 'nama', 'tipe'];
  
  // Always check and fix headers
  if (sheet && sheetId) {
    const headerResult = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${name}!A1:Z1`,
    });
    const headers = headerResult.data.values?.[0] || [];
    
    const needsFix = headers.length !== correctHeaders.length || 
                     headers[0] !== 'id' ||
                     (name === 'Rekening' && headers.length < 5);
    
    console.log(`Sheet ${name} headers:`, headers, 'needsFix:', needsFix);
    
    if (needsFix) {
      // Delete and recreate
      console.log(`Deleting and recreating sheet ${name}`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ deleteSheet: { sheetId: sheetId } }]
        }
      });
      
      const res = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: name } } }]
        }
      });
      sheetId = res.data.replies?.[0]?.addSheet?.properties?.sheetId;
      
      // Write headers immediately
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${name}!1:1`,
        valueInputOption: 'RAW',
        requestBody: { values: [correctHeaders] },
      });
      console.log(`Created headers for ${name}:`, correctHeaders);
    }
  } else if (!sheet) {
    // Create new sheet with headers
    const res = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: name } } }]
      }
    });
    sheetId = res.data.replies?.[0]?.addSheet?.properties?.sheetId;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${name}!1:1`,
      valueInputOption: 'RAW',
      requestBody: { values: [correctHeaders] },
    });
    console.log(`Created new sheet ${name} with headers:`, correctHeaders);
  }
  
  return { sheets, sheetId };
}

// GET - Ambil data
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table') || 'Rekening';
  const action = searchParams.get('action');
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  
  // Dashboard action
  if (action === 'dashboard') {
    try {
      const { sheets } = await getSheet('Transaksi');
      
      const transResult = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Transaksi!A:Z',
      });
      
      const rekeningResult = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Rekening!A:Z',
      });
      
      const transRows = transResult.data.values || [];
      const rekRows = rekeningResult.data.values || [];
      
      const rekening = rekRows.slice(1).map(row => ({
        id: row[0] || '',
        nama: row[1] || '',
        nomor: row[2] || '',
        saldo: row[3] || 0,
        jenis: row[4] || 'Bank',
      }));

      const transactions = transRows.slice(1).map(row => ({
        id: row[0] || '',
        tanggal: row[1] || '',
        deskripsi: row[2] || '',
        kategori: row[3] || '',
        jumlah: row[4] || 0,
        tipe: row[5] || 'debit',
      }));
      const summary = buildAccountingSummary(transactions, rekening);
      
      return NextResponse.json({
        success: true,
        data: {
          totalPemasukan: summary.totalPemasukan,
          totalPengeluaran: summary.totalPengeluaran,
          totalBiaya: summary.totalBiaya,
          saldoKas: summary.saldoBukuKas,
          saldoRekening: summary.totalSaldoRekening,
          selisihRekening: summary.selisihKas,
          labaRugi: summary.labaRugi.labaBersih,
          totalTransaksi: summary.transactions.length,
          rekening: summary.rekening,
          transactions: summary.transactions,
          recentTransactions: summary.recentTransactions,
          labaRugiDetail: summary.labaRugi,
          arusKas: summary.arusKas,
          neraca: summary.neraca,
        }
      });
    } catch (error: any) {
      console.error('Dashboard GET Error:', error.message);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }
  
  try {
    const { sheets } = await getSheet(table);
    
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${table}!A:Z`,
    });
    
    const rows = result.data.values || [];
    console.log(`GET ${table}: rows.length=${rows.length}, firstRow=${JSON.stringify(rows[0])}`);
    
    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    const headers = rows[0];
    let data = rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });

    if (table === 'Transaksi') {
      data = filterTransactionsByDateRange(data.map(normalizeTransaction), startDate, endDate);
    } else if (table === 'Rekening') {
      data = data.map(normalizeRekening);
    }
    
    return NextResponse.json({ success: true, data }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('GET Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST - Tambah data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { table, data } = body;
    const recordId = String(data?.id || Date.now().toString());
    
    const { sheets } = await getSheet(table);
    
    // Get headers (already fixed by getSheet)
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${table}!1:1`,
    });
    
    const headers = result.data.values?.[0] || [];
    const correctHeaders = table === 'Rekening' 
      ? ['id', 'nama', 'nomor', 'saldo', 'jenis']
      : table === 'Transaksi'
      ? ['id', 'tanggal', 'deskripsi', 'kategori', 'jumlah', 'tipe']
      : ['id', 'nama', 'tipe'];
    
    // Ensure headers are correct
    if (headers.join(',') !== correctHeaders.join(',')) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${table}!1:1`,
        valueInputOption: 'RAW',
        requestBody: { values: [correctHeaders] },
      });
    }
    
    // Map values to headers
    const values = correctHeaders.map(h => {
      const val = h === 'id' ? recordId : data[h];
      if (val === undefined || val === null) return '';
      if (typeof val === 'number') return val;
      return String(val);
    });
    
    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${table}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });
    
    return NextResponse.json({ success: true, message: 'Data berhasil ditambahkan', id: recordId });
  } catch (error: any) {
    console.error('POST Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT - Update data
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { table, data, id } = body;
    
    console.log('PUT request:', { table, id, data });
    
    const { sheets } = await getSheet(table);
    
    // Get all data
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${table}!A:Z`,
    });
    
    const rows = result.data.values || [];
    if (rows.length < 2) {
      return NextResponse.json({ success: false, message: 'Data tidak ditemukan' }, { status: 404 });
    }
    
    const headers = rows[0];
    console.log('Headers:', headers);
    
    // Define correct headers
    const correctHeaders = table === 'Rekening' 
      ? ['id', 'nama', 'nomor', 'saldo', 'jenis']
      : table === 'Transaksi'
      ? ['id', 'tanggal', 'deskripsi', 'kategori', 'jumlah', 'tipe']
      : ['id', 'nama', 'tipe'];
    
    const idIndex = headers.indexOf('id');
    
    if (idIndex === -1) {
      return NextResponse.json({ success: false, message: 'Kolom id tidak ditemukan' }, { status: 400 });
    }
    
    // Find row - debug
    console.log('Looking for id:', id, 'type:', typeof id);
    rows.forEach((row, i) => {
      if (i > 0) console.log(`Row ${i}: id=${row[idIndex]}, type=${typeof row[idIndex]}`);
    });
    
    const rowIndex = rows.findIndex((row, i) => i > 0 && String(row[idIndex]) === String(id));
    console.log('Found rowIndex:', rowIndex);
    
    if (rowIndex === -1) {
      return NextResponse.json({ success: false, message: `Data tidak ditemukan, id: ${id}` }, { status: 404 });
    }
    
    // Update row using correct headers
    const existingRow = rows[rowIndex] || [];
    const existingData = Object.fromEntries(headers.map((header, index) => [header, existingRow[index] || '']));
    const newValues = correctHeaders.map(h => {
      const val = h === 'id' ? id : data[h] ?? existingData[h];
      console.log(`Header ${h}: value=${val}`);
      if (val === undefined || val === null) return '';
      if (typeof val === 'number') return val;
      return String(val);
    });
    console.log('Updating row with:', newValues);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${table}!${rowIndex + 1}:${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newValues] },
    });
    
    return NextResponse.json({ success: true, message: 'Data berhasil diupdate' });
  } catch (error: any) {
    console.error('PUT Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Hapus data
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table') || 'Rekening';
    const id = searchParams.get('id');
    
    console.log('DELETE request:', { table, id });
    
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID diperlukan' }, { status: 400 });
    }
    
    const { sheets, sheetId } = await getSheet(table);
    
    // Get all data
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${table}!A:Z`,
    });
    
    const rows = result.data.values || [];
    const headers = rows[0];
    console.log('DELETE headers:', headers);
    const idIndex = headers.indexOf('id');
    
    if (idIndex === -1) {
      return NextResponse.json({ success: false, message: 'Kolom id tidak ditemukan' }, { status: 400 });
    }
    
    // Debug: print all ids
    rows.forEach((row, i) => {
      if (i > 0) console.log(`Row ${i}: id=${row[idIndex]}`);
    });
    
    const rowIndex = rows.findIndex((row, i) => i > 0 && String(row[idIndex]) === String(id));
    console.log('Found rowIndex for delete:', rowIndex, 'id to match:', id);
    
    if (rowIndex === -1) {
      console.log('DUMPING ALL ROW IDs FOR DEBUG:');
      rows.slice(1).forEach((row, i) => {
        console.log(`  Row ${i+1}: "${row[idIndex]}" (type: ${typeof row[idIndex]})`);
      });
      return NextResponse.json({ success: false, message: `Data tidak ditemukan, id: ${id}` }, { status: 404 });
    }
    
    // Delete row - use actual sheetId and correct indices
    const deleteResult = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      }
    });
    
    console.log('Delete batch result:', JSON.stringify(deleteResult.data));
    console.log('Delete SUCCESS - rowIndex:', rowIndex, 'sheetId:', sheetId);
    
    return NextResponse.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error: any) {
    console.error('DELETE Error:', error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
