'use client';

import { useState, useEffect } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { 
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { api, formatRupiah } from '@/lib/api';
import { buildAccountingSummary } from '@/lib/accounting';

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

export default function NeracaPage() {
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
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const effectiveEndDate =
          periodeType === 'tanggal'
            ? endDate
            : periodeType === 'bulan'
              ? getMonthEndDate(endYear, endMonth)
              : `${endYear}-12-31`;

        const [transaksiResult, rekeningResult] = await Promise.all([
          api.getTransaksi(undefined, effectiveEndDate),
          api.getRekening(),
        ]);

        if (transaksiResult.success && transaksiResult.data && rekeningResult.success && rekeningResult.data) {
          const summary = buildAccountingSummary(transaksiResult.data, rekeningResult.data);
          setDashboardData(summary);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [endDate, endMonth, endYear, periodeType]);

  const totalAset = dashboardData?.neraca?.aset?.totalAset || 0;
  const totalKewajiban = dashboardData?.neraca?.kewajiban?.totalKewajiban || 0;
  const totalEkuitas = dashboardData?.neraca?.ekuitas?.totalEkuitas || 0;
  const asetLain = dashboardData?.neraca?.aset?.asetLain || {};

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
    alert(`Export Laporan Neraca untuk periode ${getPeriodeLabel()}`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-slate-200">
          <p className="font-semibold text-slate-800">{payload[0].name}</p>
          <p className="text-sm text-slate-600">{formatRupiah(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Neraca</h1>
          <p className="text-slate-500 mt-1">Laporan posisi keuangan bisnis</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye size={20} />
            Preview
          </button>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2">
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Periode: {getPeriodeLabel()}</h2>
          
          <div className="flex items-center gap-2">
            {PERIOD_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setPeriodeType(type.value)}
                className={`py-1.5 px-3 text-xs rounded-lg border-2 transition-colors ${
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
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
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
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
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
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
            <div>
              <label className="label">Dari Tahun</label>
              <select
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                className="input"
              >
                {TAHUN_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sampai Tahun</label>
              <select
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                className="input"
              >
                {TAHUN_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {showPreview && dashboardData && (
        <div className="card">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Ringkasan Neraca</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-emerald-600">Total Aset</p>
              <p className="text-xl font-bold text-emerald-700">{formatRupiah(totalAset)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">Total Kewajiban</p>
              <p className="text-xl font-bold text-red-700">{formatRupiah(totalKewajiban)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Total Ekuitas</p>
              <p className="text-xl font-bold text-blue-700">{formatRupiah(totalEkuitas)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-medium text-emerald-600 mb-4">ASET</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-700">Kas & Bank</span>
                    <span className="text-sm text-slate-900 font-medium">{formatRupiah(dashboardData?.neraca?.aset?.kas || 0)}</span>
                  </div>
                  {Object.entries(asetLain).map(([namaAset, nilai]) => (
                    <div key={namaAset} className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-700">{namaAset}</span>
                      <span className="text-sm text-slate-900 font-medium">{formatRupiah(Number(nilai) || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 border-t-2 border-slate-200">
                    <span className="text-base font-semibold text-slate-900">Total Aset</span>
                    <span className="text-base font-bold text-emerald-700">{formatRupiah(totalAset)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-red-600 mb-4">KEWAJIBAN</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-700">-</span>
                    <span className="text-sm text-slate-900 font-medium">-</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-slate-200">
                    <span className="text-base font-semibold text-slate-900">Total Kewajiban</span>
                    <span className="text-base font-bold text-red-700">{formatRupiah(totalKewajiban)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-blue-600 mb-4">EKUITAS</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-700">Modal / Saldo Awal</span>
                    <span className="text-sm text-slate-900 font-medium">
                      {formatRupiah(dashboardData?.neraca?.ekuitas?.modalSaldoAwal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-700">Laba Berjalan</span>
                    <span className="text-sm text-slate-900 font-medium">
                      {formatRupiah(dashboardData?.neraca?.ekuitas?.labaBerjalan || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-slate-200">
                    <span className="text-base font-semibold text-slate-900">Total Ekuitas</span>
                    <span className="text-base font-bold text-blue-700">{formatRupiah(totalEkuitas)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-slate-900">TOTAL ASET</span>
                <span className="text-xl font-bold text-emerald-700">{formatRupiah(totalAset)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-lg text-slate-700">TOTAL KEWAJIBAN + EKUITAS</span>
                <span className="text-lg font-bold text-slate-900">{formatRupiah(totalKewajiban + totalEkuitas)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
