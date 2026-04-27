import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SPREADSHEET_ID = '1ip9jldvaDt1da2wNyqqrZpIlujByg_YAj_vl_SfWEUI';
const DB_PATH = path.join(__dirname, '../data/database.xlsx');

const CREDENTIALS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8')
    .split('\n')
    .find(l => l.startsWith('GOOGLE_CREDENTIALS='))
    ?.replace('GOOGLE_CREDENTIALS=', '') ?? '{}'
);

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

function readExcelSheet(sheetName) {
  const buf = fs.readFileSync(DB_PATH);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

async function clearAndWriteSheet(gsSheetName, data) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const v = row[h];
      if (v instanceof Date) return v.toISOString().split('T')[0];
      return v === undefined || v === null ? '' : String(v);
    })
  );

  // Clear existing content
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${gsSheetName}!A:Z`,
  });

  // Write headers + data
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${gsSheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers, ...rows] },
  });

  console.log(`✓ ${gsSheetName}: ${rows.length} rows imported`);
}

async function ensureSheetExists(name) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === name);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: name } } }] },
    });
    console.log(`+ Created sheet: ${name}`);
  }
}

async function main() {
  console.log('Importing Excel data to Google Sheets...\n');

  // Buku Kas (dari sheet Buku Kas di Excel)
  await ensureSheetExists('Buku Kas');
  const bukuKas = readExcelSheet('Buku Kas');
  await clearAndWriteSheet('Buku Kas', bukuKas);

  // Kategori
  await ensureSheetExists('Kategori');
  const kategori = readExcelSheet('Kategori');
  await clearAndWriteSheet('Kategori', kategori);

  // Rekening
  await ensureSheetExists('Rekening');
  const rekening = readExcelSheet('Rekening');
  await clearAndWriteSheet('Rekening', rekening);

  console.log('\nImport selesai!');
}

main().catch(console.error);
