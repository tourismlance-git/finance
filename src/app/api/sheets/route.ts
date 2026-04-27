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

// Internal table name -> Google Sheets sheet name
const SHEET_MAP: Record<string, string> = {
  Transaksi: 'Buku Kas',
  Rekening: 'Rekening',
  Kategori: 'Kategori',
};

const CORRECT_HEADERS: Record<string, string[]> = {
  'Buku Kas': ['id', 'tanggal', 'deskripsi', 'kategori', 'jumlah', 'tipe'],
  Rekening: ['id', 'nama', 'nomor', 'saldo', 'jenis'],
  Kategori: ['id', 'nama', 'tipe'],
};

function getSheetName(table: string): string {
  return SHEET_MAP[table] ?? table;
}

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
}

async function ensureSheet(sheetsApi: any, sheetName: string) {
  const spreadsheet = await sheetsApi.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  let sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sheetName);
  let sheetId = sheet?.properties?.sheetId;
  const correctHeaders = CORRECT_HEADERS[sheetName] ?? ['id'];

  if (sheet) {
    const headerResult = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`,
    });
    const headers = headerResult.data.values?.[0] || [];
    const needsFix = headers.join(',') !== correctHeaders.join(',');

    if (needsFix) {
      await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ deleteSheet: { sheetId } }] },
      });
      const res = await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
      });
      sheetId = res.data.replies?.[0]?.addSheet?.properties?.sheetId;
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!1:1`,
        valueInputOption: 'RAW',
        requestBody: { values: [correctHeaders] },
      });
    }
  } else {
    const res = await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
    sheetId = res.data.replies?.[0]?.addSheet?.properties?.sheetId;
    await sheetsApi.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!1:1`,
      valueInputOption: 'RAW',
      requestBody: { values: [correctHeaders] },
    });
  }

  return { sheetId };
}

// GET
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table') || 'Rekening';
  const action = searchParams.get('action');
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  if (action === 'dashboard') {
    try {
      const auth = getAuth();
      const sheets = google.sheets({ version: 'v4', auth });

      const [transResult, rekeningResult] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Buku Kas!A:Z' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Rekening!A:Z' }),
      ]);

      const transRows = transResult.data.values || [];
      const rekRows = rekeningResult.data.values || [];

      const rekening = rekRows.slice(1).map((row: any[]) => normalizeRekening({
        id: row[0], nama: row[1], nomor: row[2], saldo: row[3], jenis: row[4],
      }));
      const transactions = transRows.slice(1).map((row: any[]) => normalizeTransaction({
        id: row[0], tanggal: row[1], deskripsi: row[2], kategori: row[3], jumlah: row[4], tipe: row[5],
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
        },
      });
    } catch (error: any) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetName = getSheetName(table);

    await ensureSheet(sheets, sheetName);

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = result.data.values || [];
    if (rows.length === 0) return NextResponse.json({ success: true, data: [] });

    const headers = rows[0];
    let data = rows.slice(1).map((row: any[]) => {
      const obj: any = {};
      headers.forEach((h: string, i: number) => { obj[h] = row[i] || ''; });
      return obj;
    });

    if (table === 'Transaksi') {
      data = filterTransactionsByDateRange(data.map(normalizeTransaction), startDate, endDate);
    } else if (table === 'Rekening') {
      data = data.map(normalizeRekening);
    }

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { table, data } = body;
    const recordId = String(data?.id || Date.now());
    const sheetName = getSheetName(table);
    const correctHeaders = CORRECT_HEADERS[sheetName] ?? ['id'];

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    await ensureSheet(sheets, sheetName);

    const values = correctHeaders.map(h => {
      const val = h === 'id' ? recordId : data[h];
      if (val === undefined || val === null) return '';
      return typeof val === 'number' ? val : String(val);
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });

    return NextResponse.json({ success: true, message: 'Data berhasil ditambahkan', id: recordId });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { table, data, id } = body;
    const sheetName = getSheetName(table);
    const correctHeaders = CORRECT_HEADERS[sheetName] ?? ['id'];

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = result.data.values || [];
    if (rows.length < 2) return NextResponse.json({ success: false, message: 'Data tidak ditemukan' }, { status: 404 });

    const headers = rows[0];
    const idIndex = headers.indexOf('id');
    const rowIndex = rows.findIndex((row: any[], i: number) => i > 0 && String(row[idIndex]) === String(id));

    if (rowIndex === -1) return NextResponse.json({ success: false, message: `Data tidak ditemukan, id: ${id}` }, { status: 404 });

    const existingRow = rows[rowIndex] || [];
    const existingData = Object.fromEntries(headers.map((h: string, i: number) => [h, existingRow[i] || '']));
    const newValues = correctHeaders.map(h => {
      const val = h === 'id' ? id : (data[h] ?? existingData[h]);
      if (val === undefined || val === null) return '';
      return typeof val === 'number' ? val : String(val);
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${rowIndex + 1}:${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newValues] },
    });

    return NextResponse.json({ success: true, message: 'Data berhasil diupdate' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table') || 'Rekening';
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, message: 'ID diperlukan' }, { status: 400 });

    const sheetName = getSheetName(table);
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sheetName);
    const sheetId = sheet?.properties?.sheetId;

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
    });

    const rows = result.data.values || [];
    const headers = rows[0] || [];
    const idIndex = headers.indexOf('id');
    const rowIndex = rows.findIndex((row: any[], i: number) => i > 0 && String(row[idIndex]) === String(id));

    if (rowIndex === -1) return NextResponse.json({ success: false, message: `Data tidak ditemukan, id: ${id}` }, { status: 404 });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
          },
        }],
      },
    });

    return NextResponse.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
