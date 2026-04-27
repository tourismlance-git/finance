'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Eye, Loader2 } from 'lucide-react';
import { api, formatRupiah } from '@/lib/api';
import { buildAccountingSummary } from '@/lib/accounting';

const laporanOptions = [
  { value: 'laba-rugi', label: 'Laporan Laba Rugi', description: 'Laporan keuntungan dan kerugian' },
  { value: 'neraca', label: 'Laporan Neraca', description: 'Laporan posisi keuangan' },
  { value: 'arus-kas', label: 'Laporan Arus Kas', description: 'Laporan aliran kas' },
  { value: 'semua', label: 'Semua Laporan', description: 'Export semua laporan sekaligus' },
];

const formatOptions = [
  { value: 'pdf', label: 'PDF', description: 'Format dokumen siap cetak' },
  { value: 'xlsx', label: 'Excel (XLSX)', description: 'Format spreadsheet' },
];

const PERIOD_TYPES = [
  { value: 'tanggal', label: 'Tanggal ke Tanggal' },
  { value: 'bulan', label: 'Bulan ke Bulan' },
  { value: 'tahun', label: 'Tahunan' },
];

const BULAN_OPTIONS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const year = new Date().getFullYear() - 5 + i;
  return { value: year.toString(), label: year.toString() };
});

const getMonthEndDate = (year: string, month: string) => {
  const endDate = new Date(Number(year), Number(month), 0).getDate();
  return `${year}-${month}-${String(endDate).padStart(2, '0')}`;
};

export default function LaporanPage() {
  const [selectedLaporan, setSelectedLaporan] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [periodeType, setPeriodeType] = useState('bulan');
  const [startYear, setStartYear] = useState(currentYear.toString());
  const [endYear, setEndYear] = useState(currentYear.toString());
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [startDate, setStartDate] = useState(`${currentYear}-${currentMonth}-01`);
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (showPreview && selectedLaporan) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const effectiveStartDate =
            periodeType === 'tanggal'
              ? startDate
              : periodeType === 'bulan'
                ? `${startYear}-${startMonth}-01`
                : `${startYear}-01-01`;
          const effectiveEndDate =
            periodeType === 'tanggal'
              ? endDate
              : periodeType === 'bulan'
                ? getMonthEndDate(endYear, endMonth)
                : `${endYear}-12-31`;

          const [result, rekeningResult] = await Promise.all([
            api.getTransaksi(effectiveStartDate, effectiveEndDate),
            api.getRekening(),
          ]);

          if (result.success && result.data && rekeningResult.success && rekeningResult.data) {
            const summary = buildAccountingSummary(result.data, rekeningResult.data);
            setPreviewData({});

            if (selectedLaporan === 'laba-rugi' || selectedLaporan === 'semua') {
              setPreviewData((prev: any) => ({
                ...prev,
                'laba-rugi': {
                  title: 'Laporan Laba Rugi',
                  headers: ['No', 'Keterangan', 'Jumlah'],
                  rows: [
                    { items: ['1', 'Total Pendapatan', formatRupiah(summary.labaRugi.totalPendapatan)], bold: true },
                    { items: ['2', 'Total Biaya', formatRupiah(summary.labaRugi.totalBiaya)], bold: true },
                    { items: ['', 'Laba/Rugi Bersih', formatRupiah(summary.labaRugi.labaBersih)], bold: true },
                  ],
                },
              }));
            }
            if (selectedLaporan === 'neraca' || selectedLaporan === 'semua') {
              setPreviewData((prev: any) => ({
                ...prev,
                'neraca': {
                  title: 'Laporan Neraca',
                  headers: ['No', 'Keterangan', 'Jumlah'],
                  rows: [
                    { items: ['A', 'ASET', ''], bold: true },
                    { items: ['1', 'Kas Buku', formatRupiah(summary.neraca.aset.kas)] },
                    ...Object.entries(summary.neraca.aset.asetLain).map(([label, value], index) => ({
                      items: [String(index + 2), label, formatRupiah(Number(value) || 0)],
                    })),
                    { items: ['', 'Total Aset', formatRupiah(summary.neraca.aset.totalAset)], bold: true },
                    { items: ['B', 'EKUITAS', ''], bold: true },
                    { items: ['1', 'Modal / Saldo Awal', formatRupiah(summary.neraca.ekuitas.modalSaldoAwal)] },
                    { items: ['2', 'Laba Berjalan', formatRupiah(summary.neraca.ekuitas.labaBerjalan)] },
                    { items: ['', 'Total Ekuitas', formatRupiah(summary.neraca.ekuitas.totalEkuitas)], bold: true },
                  ],
                },
              }));
            }
            if (selectedLaporan === 'arus-kas' || selectedLaporan === 'semua') {
              setPreviewData((prev: any) => ({
                ...prev,
                'arus-kas': {
                  title: 'Laporan Arus Kas',
                  headers: ['No', 'Keterangan', 'Jumlah'],
                  rows: [
                    { items: ['A', 'ARUS KAS DARI AKTIVITAS OPERASI', ''], bold: true },
                    { items: ['1', 'Kas Masuk Operasi', formatRupiah(summary.arusKas.kasMasukOperasi)] },
                    { items: ['2', 'Kas Keluar Operasi', formatRupiah(summary.arusKas.kasKeluarOperasi)] },
                    { items: ['B', 'ARUS KAS DARI INVESTASI', ''], bold: true },
                    { items: ['3', 'Pembelian Aset', formatRupiah(summary.arusKas.kasKeluarInvestasi)] },
                    { items: ['', 'Kenaikan Kas Neto', formatRupiah(summary.arusKas.kenaikanKasBersih)], bold: true },
                  ],
                },
              }));
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [showPreview, selectedLaporan, startDate, endDate, startYear, endYear, startMonth, endMonth, periodeType]);

  const getPeriodeLabel = () => {
    if (periodeType === 'tanggal') {
      return `${startDate} - ${endDate}`;
    } else if (periodeType === 'bulan') {
      const startMonthLabel = BULAN_OPTIONS.find(b => b.value === startMonth)?.label || '';
      const endMonthLabel = BULAN_OPTIONS.find(b => b.value === endMonth)?.label || '';
      return `${startMonthLabel} ${startYear} - ${endMonthLabel} ${endYear}`;
    } else {
      return `Tahun ${startYear} - ${endYear}`;
    }
  };

  const handleExport = () => {
    alert(`Meng-export ${selectedLaporan} dalam format ${selectedFormat} untuk periode ${getPeriodeLabel()}`);
  };

  const handlePreview = () => {
    if (!selectedLaporan) {
      alert('Pilih jenis laporan terlebih dahulu');
      return;
    }
    setPreviewData(null);
    setShowPreview(true);
  };

  const renderPreviewContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      );
    }
    
    if (!selectedLaporan) {
      return (
        <div className="text-center py-12">
          <FileText className="mx-auto text-slate-300 mb-4" size={64} />
          <p className="text-slate-500 text-lg">Pilih jenis laporan untuk melihat preview</p>
        </div>
      );
    }

    if (!showPreview || !previewData) {
      return (
        <div className="bg-slate-100 rounded-lg p-8 text-center">
          <FileText className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-500">
            Klik tombol &quot;Tampilkan Preview&quot; untuk melihat laporan terlebih dahulu
          </p>
        </div>
      );
    }

    const renderTable = (data: any) => (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100">
              {data.headers.map((header: string, i: number) => (
                <th key={i} className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                {row.items.map((item: string, j: number) => (
                  <td 
                    key={j} 
                    className={`py-2 px-4 ${row.bold ? 'font-semibold text-slate-900' : 'text-slate-600'} ${j === row.items.length - 1 && row.bold ? 'text-right' : ''}`}
                  >
                    {item}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    if (selectedLaporan === 'semua') {
      return (
        <div className="space-y-6">
          {previewData['laba-rugi'] && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Laporan Laba Rugi</h3>
                <p className="text-sm text-slate-500">Periode: {getPeriodeLabel()}</p>
              </div>
              <div className="p-4">{renderTable(previewData['laba-rugi'])}</div>
            </div>
          )}
          {previewData['neraca'] && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Laporan Neraca</h3>
                <p className="text-sm text-slate-500">Periode: {getPeriodeLabel()}</p>
              </div>
              <div className="p-4">{renderTable(previewData['neraca'])}</div>
            </div>
          )}
          {previewData['arus-kas'] && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Laporan Arus Kas</h3>
                <p className="text-sm text-slate-500">Periode: {getPeriodeLabel()}</p>
              </div>
              <div className="p-4">{renderTable(previewData['arus-kas'])}</div>
            </div>
          )}
        </div>
      );
    }

    const data = previewData[selectedLaporan];
    if (!data) return null;

    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{data.title}</h3>
          <p className="text-sm text-slate-500">Periode: {getPeriodeLabel()}</p>
        </div>
        <div className="p-4">{renderTable(data)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
          <p className="text-slate-500 mt-1">Export dan download laporan keuangan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Pilih Laporan
          </h2>
          <div className="space-y-3">
            {laporanOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedLaporan === option.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="laporan"
                    value={option.value}
                    checked={selectedLaporan === option.value}
                    onChange={() => setSelectedLaporan(option.value)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Periode
            </h2>
            
            <div className="mb-4">
              <label className="label">Tipe Periode</label>
              <div className="grid grid-cols-3 gap-2">
                {PERIOD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setPeriodeType(type.value)}
                    className={`py-2 px-3 text-sm rounded-lg border-2 transition-colors ${
                      periodeType === type.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {periodeType === 'tanggal' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Dari Tanggal</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            )}

            {periodeType === 'bulan' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Dari Bulan</label>
                  <div className="flex gap-2">
                    <select
                      value={startYear}
                      onChange={(e) => setStartYear(e.target.value)}
                      className="input"
                    >
                      {TAHUN_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <select
                      value={startMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                      className="input"
                    >
                      {BULAN_OPTIONS.map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Sampai Bulan</label>
                  <div className="flex gap-2">
                    <select
                      value={endYear}
                      onChange={(e) => setEndYear(e.target.value)}
                      className="input"
                    >
                      {TAHUN_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <select
                      value={endMonth}
                      onChange={(e) => setEndMonth(e.target.value)}
                      className="input"
                    >
                      {BULAN_OPTIONS.map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {periodeType === 'tahun' && (
              <div>
                <label className="label">Pilih Tahun</label>
                <input
                  type="number"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min="2000"
                  max="2100"
                  className="input"
                />
              </div>
            )}

            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Periode Aktif:</span> {getPeriodeLabel()}
              </p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Download size={20} />
              Format File
            </h2>
            <div className="space-y-3">
              {formatOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedFormat === option.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="format"
                      value={option.value}
                      checked={selectedFormat === option.value}
                      onChange={() => setSelectedFormat(option.value)}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Eye size={20} />
            Preview
          </h2>
          <button
            onClick={handlePreview}
            disabled={!selectedLaporan}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye size={18} />
            Tampilkan Preview
          </button>
        </div>
        
        {showPreview ? (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">
                {selectedLaporan === 'laba-rugi' && 'Laporan Laba Rugi'}
                {selectedLaporan === 'neraca' && 'Laporan Neraca'}
                {selectedLaporan === 'arus-kas' && 'Laporan Arus Kas'}
              </h3>
              <p className="text-sm text-slate-500">Periode: {getPeriodeLabel()}</p>
            </div>
            <div className="p-4">
              {renderPreviewContent()}
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-lg p-8 text-center">
            <FileText className="mx-auto text-slate-400 mb-4" size={48} />
            <p className="text-slate-500">
              Klik tombol &quot;Tampilkan Preview&quot; untuk melihat laporan terlebih dahulu
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handlePreview}
          disabled={!selectedLaporan}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye size={20} />
          Preview
        </button>
        <button
          onClick={handleExport}
          disabled={!selectedLaporan}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={20} />
          Export Laporan
        </button>
      </div>
    </div>
  );
}
