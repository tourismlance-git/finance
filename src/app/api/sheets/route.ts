import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildAccountingSummary,
  filterTransactionsByDateRange,
  normalizeRekening,
  normalizeTransaction,
} from '@/lib/accounting';

const DB_PATH = path.join(process.cwd(), 'data', 'database.xlsx');

// Internal table name -> Excel sheet name
const SHEET_MAP: Record<string, string> = {
  Transaksi: 'Buku Kas',
  Rekening: 'Rekening',
  Kategori: 'Kategori',
};

function getSheetName(table: string): string {
  return SHEET_MAP[table] ?? table;
}

function readWorkbook() {
  const buf = fs.readFileSync(DB_PATH);
  return XLSX.read(buf, { type: 'buffer', cellDates: true });
}

function writeWorkbook(wb: XLSX.WorkBook) {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(DB_PATH, buf);
}

function getSheetData(wb: XLSX.WorkBook, sheetName: string): Record<string, any>[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function setSheetData(wb: XLSX.WorkBook, sheetName: string, data: Record<string, any>[]) {
  const ws = XLSX.utils.json_to_sheet(data);
  if (wb.Sheets[sheetName]) {
    wb.Sheets[sheetName] = ws;
  } else {
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
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
      const wb = readWorkbook();
      const transRows = getSheetData(wb, getSheetName('Transaksi'));
      const rekRows = getSheetData(wb, getSheetName('Rekening'));

      const rekening = rekRows.map(normalizeRekening);
      const transactions = transRows.map(normalizeTransaction);
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
    const wb = readWorkbook();
    const sheetName = getSheetName(table);
    let data = getSheetData(wb, sheetName);

    if (table === 'Transaksi') {
      data = filterTransactionsByDateRange(data.map(normalizeTransaction), startDate, endDate);
    } else if (table === 'Rekening') {
      data = data.map(normalizeRekening);
    }

    return NextResponse.json({ success: true, data }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
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
    const id = String(data?.id || Date.now());

    const wb = readWorkbook();
    const sheetName = getSheetName(table);
    const rows = getSheetData(wb, sheetName);

    const newRow = { ...data, id };
    if (newRow.tanggal instanceof Date) {
      newRow.tanggal = newRow.tanggal.toISOString().split('T')[0];
    }
    rows.push(newRow);
    setSheetData(wb, sheetName, rows);
    writeWorkbook(wb);

    return NextResponse.json({ success: true, message: 'Data berhasil ditambahkan', id });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { table, data, id } = body;

    const wb = readWorkbook();
    const sheetName = getSheetName(table);
    const rows = getSheetData(wb, sheetName);

    const idx = rows.findIndex(r => String(r.id) === String(id));
    if (idx === -1) {
      return NextResponse.json({ success: false, message: `Data tidak ditemukan, id: ${id}` }, { status: 404 });
    }

    rows[idx] = { ...rows[idx], ...data, id };
    setSheetData(wb, sheetName, rows);
    writeWorkbook(wb);

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

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID diperlukan' }, { status: 400 });
    }

    const wb = readWorkbook();
    const sheetName = getSheetName(table);
    const rows = getSheetData(wb, sheetName);

    const idx = rows.findIndex(r => String(r.id) === String(id));
    if (idx === -1) {
      return NextResponse.json({ success: false, message: `Data tidak ditemukan, id: ${id}` }, { status: 404 });
    }

    rows.splice(idx, 1);
    setSheetData(wb, sheetName, rows);
    writeWorkbook(wb);

    return NextResponse.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
