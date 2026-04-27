// API Service untuk komunikasi dengan Google Sheets API

import {
  buildAccountingSummary,
  normalizeRekening,
  normalizeTransaction,
  sortTransactionsNewestFirst,
  type AccountingRekening as Rekening,
  type AccountingTransaction as Transaksi,
} from '@/lib/accounting';

const SHEETS_API_URL = '/api/sheets';

export type TransaksiInput = Omit<Transaksi, 'id'>;

export interface Kategori {
  id: string;
  nama: string;
  tipe: 'pemasukan' | 'pengeluaran';
}

export interface DashboardData {
  totalPemasukan: number;
  totalPengeluaran: number;
  totalBiaya: number;
  saldoKas: number;
  saldoRekening: number;
  selisihRekening: number;
  labaRugi: number;
  totalTransaksi: number;
  rekening: Rekening[];
  transactions: Transaksi[];
  recentTransactions: Transaksi[];
  labaRugiDetail: ReturnType<typeof buildAccountingSummary>['labaRugi'];
  arusKas: ReturnType<typeof buildAccountingSummary>['arusKas'];
  neraca: ReturnType<typeof buildAccountingSummary>['neraca'];
}

class ApiService {
  private async fetchSheets<T>(table: string): Promise<T> {
    try {
      const res = await fetch(`${SHEETS_API_URL}?table=${table}`);
      const data = await res.json();
      return data as T;
    } catch (err: any) {
      console.error('Error fetching:', err.message);
      return { success: false, data: [], message: err.message } as T;
    }
  }

  // Transaksi
  async getTransaksi(tanggalAwal?: string, tanggalAkhir?: string) {
    const params = new URLSearchParams({ table: 'Transaksi' });
    if (tanggalAwal) params.set('startDate', tanggalAwal);
    if (tanggalAkhir) params.set('endDate', tanggalAkhir);

    try {
      const res = await fetch(`${SHEETS_API_URL}?${params.toString()}`);
      const result = await res.json();
      return {
        ...result,
        data: sortTransactionsNewestFirst((result.data || []).map(normalizeTransaction)),
      } as { success: boolean; data: Transaksi[] };
    } catch (err: any) {
      console.error('Error fetching transaksi:', err.message);
      return { success: false, data: [], message: err.message };
    }
  }

  async addTransaksi(data: TransaksiInput) {
    const id = Date.now().toString();
    const res = await fetch(SHEETS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'Transaksi', data: { ...data, id } })
    });
    return res.json();
  }

  async deleteTransaksi(id: string) {
    const res = await fetch(`${SHEETS_API_URL}?table=Transaksi&id=${id}`, { method: 'DELETE' });
    return res.json();
  }

  async updateTransaksi(id: string, data: Partial<Transaksi>) {
    const res = await fetch(SHEETS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'Transaksi', data: { ...data, id }, id })
    });
    return res.json();
  }

  // Kategori
  async getKategori() {
    return this.fetchSheets<{ success: boolean; data: Kategori[] }>('Kategori');
  }

  // Rekening
  async getRekening() {
    try {
      const res = await fetch(`${SHEETS_API_URL}?table=Rekening`);
      const result = await res.json();
      return {
        ...result,
        data: (result.data || []).map(normalizeRekening),
      } as { success: boolean; data: Rekening[] };
    } catch (err: any) {
      console.error('Error fetching rekening:', err.message);
      return { success: false, data: [], message: err.message };
    }
  }

  // Dashboard - hitung dari transaksi dan rekening
  async getDashboard() {
    try {
      const res = await fetch(`${SHEETS_API_URL}?action=dashboard`);
      const result = await res.json();

      if (!result.success) {
        return { success: false, message: result.message };
      }

      return {
        success: true,
        data: {
          ...result.data,
          rekening: (result.data.rekening || []).map(normalizeRekening),
          transactions: (result.data.transactions || []).map(normalizeTransaction),
          recentTransactions: (result.data.recentTransactions || []).map(normalizeTransaction),
        }
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // Import Transaksi from TSV
  async importTransaksi(tsvData: string) {
    const rows = tsvData.split('\n').filter(row => row.trim());
    const headers = rows[0].split('\t');
    
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split('\t');
      const transaksi = {
        tanggal: cols[headers.indexOf('tanggal')] || new Date().toISOString().split('T')[0],
        deskripsi: cols[headers.indexOf('deskripsi')] || '',
        kategori: cols[headers.indexOf('kategori')] || '',
        jumlah: Number.parseInt(cols[headers.indexOf('jumlah')], 10) || 0,
        tipe: (cols[headers.indexOf('tipe')] || 'debit') as 'debit' | 'credit'
      };
      await this.addTransaksi(transaksi);
    }
    return { success: true, message: 'Import berhasil' };
  }
}

export const api = new ApiService();

// Helper functions
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR',
    maximumFractionDigits: 0 
  }).format(amount).replace(/\u00A0/g, ' ');
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
