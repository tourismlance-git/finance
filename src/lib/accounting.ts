export type TransactionType = 'debit' | 'credit';

export interface AccountingTransaction {
  id: string;
  tanggal: string;
  deskripsi: string;
  kategori: string;
  jumlah: number;
  tipe: TransactionType;
}

export interface AccountingRekening {
  id: string;
  nama: string;
  nomor: string;
  saldo: number;
  jenis: string;
}

export interface AccountingSummary {
  transactions: AccountingTransaction[];
  rekening: AccountingRekening[];
  totalPemasukan: number;
  totalPengeluaran: number;
  totalBiaya: number;
  totalPembelianAset: number;
  saldoBukuKas: number;
  totalSaldoRekening: number;
  selisihKas: number;
  labaRugi: {
    pendapatan: Record<string, number>;
    biaya: Record<string, number>;
    totalPendapatan: number;
    totalBiaya: number;
    labaBersih: number;
  };
  arusKas: {
    kasMasukOperasi: number;
    kasKeluarOperasi: number;
    kasKeluarInvestasi: number;
    arusKasOperasiBersih: number;
    arusKasInvestasiBersih: number;
    kenaikanKasBersih: number;
    saldoKasAkhir: number;
  };
  neraca: {
    aset: {
      kas: number;
      asetLain: Record<string, number>;
      totalAset: number;
    };
    kewajiban: {
      totalKewajiban: number;
    };
    ekuitas: {
      modalSaldoAwal: number;
      labaBerjalan: number;
      totalEkuitas: number;
    };
    totalKewajibanDanEkuitas: number;
  };
  recentTransactions: AccountingTransaction[];
}

export interface PeriodSeriesPoint {
  label: string;
  pendapatan: number;
  pengeluaran: number;
  biaya: number;
  investasi: number;
  saldo: number;
}

const ASSET_CATEGORY_KEYWORDS = [
  'persediaan',
  'perlengkapan',
  'inventaris',
  'peralatan',
  'aset',
];

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const LONG_MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function sanitizeDate(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
}

export function parseAmount(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const normalized = value
    .replace(/[^0-9,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeTransaction(raw: any): AccountingTransaction {
  const tipeValue = String(raw?.tipe || '').toLowerCase();
  const tipe: TransactionType = tipeValue === 'credit' || tipeValue === 'kredit' ? 'credit' : 'debit';

  return {
    id: String(raw?.id || ''),
    tanggal: sanitizeDate(raw?.tanggal),
    deskripsi: String(raw?.deskripsi || ''),
    kategori: String(raw?.kategori || '').trim(),
    jumlah: parseAmount(raw?.jumlah),
    tipe,
  };
}

export function normalizeRekening(raw: any): AccountingRekening {
  return {
    id: String(raw?.id || ''),
    nama: String(raw?.nama || ''),
    nomor: String(raw?.nomor || ''),
    saldo: parseAmount(raw?.saldo),
    jenis: String(raw?.jenis || 'Bank'),
  };
}

export function sortTransactionsNewestFirst(transactions: AccountingTransaction[]) {
  return [...transactions].sort((left, right) => {
    const dateCompare = right.tanggal.localeCompare(left.tanggal);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return right.id.localeCompare(left.id);
  });
}

export function filterTransactionsByDateRange(
  transactions: AccountingTransaction[],
  startDate?: string,
  endDate?: string
) {
  return transactions.filter((transaction) => {
    if (!transaction.tanggal) {
      return false;
    }

    if (startDate && transaction.tanggal < startDate) {
      return false;
    }

    if (endDate && transaction.tanggal > endDate) {
      return false;
    }

    return true;
  });
}

export function isAssetCategory(category: string) {
  const normalized = category.trim().toLowerCase();
  return ASSET_CATEGORY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function addToGroup(group: Record<string, number>, key: string, amount: number) {
  const label = key || 'Tanpa Kategori';
  group[label] = (group[label] || 0) + amount;
}

function sumAmount(items: { jumlah: number }[]) {
  return items.reduce((total, item) => total + item.jumlah, 0);
}

export function buildAccountingSummary(rawTransactions: any[], rawRekening: any[]): AccountingSummary {
  const transactions = sortTransactionsNewestFirst(rawTransactions.map(normalizeTransaction));
  const rekening = rawRekening.map(normalizeRekening);

  const debitTransactions = transactions.filter((transaction) => transaction.tipe === 'debit');
  const creditTransactions = transactions.filter((transaction) => transaction.tipe === 'credit');
  const assetTransactions = creditTransactions.filter((transaction) => isAssetCategory(transaction.kategori));
  const expenseTransactions = creditTransactions.filter((transaction) => !isAssetCategory(transaction.kategori));

  const pendapatanByCategory: Record<string, number> = {};
  const biayaByCategory: Record<string, number> = {};
  const asetByCategory: Record<string, number> = {};

  debitTransactions.forEach((transaction) => addToGroup(pendapatanByCategory, transaction.kategori, transaction.jumlah));
  expenseTransactions.forEach((transaction) => addToGroup(biayaByCategory, transaction.kategori, transaction.jumlah));
  assetTransactions.forEach((transaction) => addToGroup(asetByCategory, transaction.kategori, transaction.jumlah));

  const totalPemasukan = sumAmount(debitTransactions);
  const totalPengeluaran = sumAmount(creditTransactions);
  const totalBiaya = sumAmount(expenseTransactions);
  const totalPembelianAset = sumAmount(assetTransactions);
  const saldoBukuKas = totalPemasukan - totalPengeluaran;
  const totalSaldoRekening = rekening.reduce((total, account) => total + account.saldo, 0);
  const labaBersih = totalPemasukan - totalBiaya;
  const totalAset = saldoBukuKas + totalPembelianAset;
  const modalSaldoAwal = totalAset - labaBersih;

  return {
    transactions,
    rekening,
    totalPemasukan,
    totalPengeluaran,
    totalBiaya,
    totalPembelianAset,
    saldoBukuKas,
    totalSaldoRekening,
    selisihKas: totalSaldoRekening - saldoBukuKas,
    labaRugi: {
      pendapatan: pendapatanByCategory,
      biaya: biayaByCategory,
      totalPendapatan: totalPemasukan,
      totalBiaya,
      labaBersih,
    },
    arusKas: {
      kasMasukOperasi: totalPemasukan,
      kasKeluarOperasi: totalBiaya,
      kasKeluarInvestasi: totalPembelianAset,
      arusKasOperasiBersih: totalPemasukan - totalBiaya,
      arusKasInvestasiBersih: -totalPembelianAset,
      kenaikanKasBersih: saldoBukuKas,
      saldoKasAkhir: saldoBukuKas,
    },
    neraca: {
      aset: {
        kas: saldoBukuKas,
        asetLain: asetByCategory,
        totalAset,
      },
      kewajiban: {
        totalKewajiban: 0,
      },
      ekuitas: {
        modalSaldoAwal,
        labaBerjalan: labaBersih,
        totalEkuitas: totalAset,
      },
      totalKewajibanDanEkuitas: totalAset,
    },
    recentTransactions: transactions.slice(0, 10),
  };
}

function getMonthEnd(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatMonthLabel(year: number, month: number) {
  return `${LONG_MONTH_NAMES[month - 1]} ${year}`;
}

type PeriodType = 'tanggal' | 'bulan' | 'tahun';

export function buildPeriodSeries(
  transactions: AccountingTransaction[],
  periodType: PeriodType,
  startValue: string,
  endValue: string
): PeriodSeriesPoint[] {
  const points: PeriodSeriesPoint[] = [];
  let runningSaldo = 0;

  const getPoint = (label: string, bucketTransactions: AccountingTransaction[]) => {
    const pendapatan = sumAmount(bucketTransactions.filter((transaction) => transaction.tipe === 'debit'));
    const pengeluaran = sumAmount(bucketTransactions.filter((transaction) => transaction.tipe === 'credit'));
    const biaya = sumAmount(
      bucketTransactions.filter((transaction) => transaction.tipe === 'credit' && !isAssetCategory(transaction.kategori))
    );
    const investasi = sumAmount(
      bucketTransactions.filter((transaction) => transaction.tipe === 'credit' && isAssetCategory(transaction.kategori))
    );
    runningSaldo += pendapatan - pengeluaran;

    return {
      label,
      pendapatan,
      pengeluaran,
      biaya,
      investasi,
      saldo: runningSaldo,
    };
  };

  if (periodType === 'tanggal') {
    const start = new Date(startValue);
    const end = new Date(endValue);
    const cursor = new Date(start);

    while (cursor <= end) {
      const currentDate = cursor.toISOString().split('T')[0];
      const bucketTransactions = transactions.filter((transaction) => transaction.tanggal === currentDate);
      points.push(getPoint(`${cursor.getDate()} ${SHORT_MONTH_NAMES[cursor.getMonth()]}`, bucketTransactions));
      cursor.setDate(cursor.getDate() + 1);
    }

    return points;
  }

  if (periodType === 'bulan') {
    const [startYear, startMonth] = startValue.split('-').map(Number);
    const [endYear, endMonth] = endValue.split('-').map(Number);

    for (let year = startYear; year <= endYear; year += 1) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;

      for (let month = monthStart; month <= monthEnd; month += 1) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(getMonthEnd(year, month)).padStart(2, '0')}`;
        const bucketTransactions = filterTransactionsByDateRange(transactions, startDate, endDate);
        points.push(getPoint(formatMonthLabel(year, month), bucketTransactions));
      }
    }

    return points;
  }

  const startYear = Number(startValue);
  const endYear = Number(endValue);

  for (let year = startYear; year <= endYear; year += 1) {
    const bucketTransactions = filterTransactionsByDateRange(transactions, `${year}-01-01`, `${year}-12-31`);
    points.push(getPoint(String(year), bucketTransactions));
  }

  return points;
}

