import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPREADSHEET_ID = '1ip9jldvaDt1da2wNyqqrZpIlujByg_YAj_vl_SfWEUI';

const CREDENTIALS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8')
    .split('\n').find(l => l.startsWith('GOOGLE_CREDENTIALS='))
    ?.replace('GOOGLE_CREDENTIALS=', '') ?? '{}'
);

const auth = new google.auth.GoogleAuth({ credentials: CREDENTIALS, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
  console.log('Sheets saat ini:', sheetNames);

  if (!sheetNames.includes('Transaksi')) {
    console.log('Sheet Transaksi tidak ada, tidak perlu migrasi.');
    return;
  }

  // Ambil data dari Transaksi
  const transResult = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Transaksi!A:Z',
  });
  const transRows = transResult.data.values || [];
  if (transRows.length <= 1) {
    console.log('Sheet Transaksi kosong, tidak ada yang perlu dipindah.');
    return;
  }

  console.log(`Ditemukan ${transRows.length - 1} baris di Transaksi`);

  // Ambil data dari Buku Kas
  const bukuResult = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Buku Kas!A:Z',
  });
  const bukuRows = bukuResult.data.values || [];
  const existingIds = new Set(bukuRows.slice(1).map(r => String(r[0])));

  // Filter baris dari Transaksi yang belum ada di Buku Kas
  const newRows = transRows.slice(1).filter(r => !existingIds.has(String(r[0])));
  console.log(`${newRows.length} baris baru yang akan dipindah ke Buku Kas`);

  if (newRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Buku Kas!A:Z',
      valueInputOption: 'RAW',
      requestBody: { values: newRows },
    });
    console.log('✓ Data berhasil dipindah ke Buku Kas');
  }

  // Hapus sheet Transaksi
  const transaksiSheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Transaksi');
  if (transaksiSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteSheet: { sheetId: transaksiSheet.properties?.sheetId } }] },
    });
    console.log('✓ Sheet Transaksi dihapus');
  }

  console.log('\nMigrasi selesai!');
}

main().catch(console.error);
