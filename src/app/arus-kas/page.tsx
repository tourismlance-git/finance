'use client';

import { useState, useEffect } from 'react';
import { Download, Eye, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { api, formatRupiah } from '@/lib/api';
import { buildAccountingSummary, buildPeriodSeries } from '@/lib/accounting';

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

export default function ArusKasPage() {
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

        const result = await api.getTransaksi(effectiveStartDate, effectiveEndDate);
        if (result.success && result.data) {
          const summary = buildAccountingSummary(result.data, []);
          const chartSeries = buildPeriodSeries(
            result.data,
            periodeType as 'tanggal' | 'bulan' | 'tahun',
            periodeType === 'tanggal' ? effectiveStartDate : periodeType === 'bulan' ? `${startYear}-${startMonth}` : startYear,
            periodeType === 'tanggal' ? effectiveEndDate : periodeType === 'bulan' ? `${endYear}-${endMonth}` : endYear
          );

          setDashboardData({
            ...summary,
            chartData: chartSeries.map((point) => ({
              bulan: point.label,
              masuk: point.pendapatan,
              keluar: point.pengeluaran,
              saldo: point.saldo,
            })),
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [endDate, endMonth, endYear, periodeType, startDate, startMonth, startYear]);

  const totalPemasukan = dashboardData?.arusKas?.kasMasukOperasi || 0;
  const totalPengeluaran = (dashboardData?.arusKas?.kasKeluarOperasi || 0) + (dashboardData?.arusKas?.kasKeluarInvestasi || 0);
  const arusKasBersih = dashboardData?.arusKas?.kenaikanKasBersih || 0;
  const saldoKas = dashboardData?.arusKas?.saldoKasAkhir || 0;
  const chartData = dashboardData?.chartData || [];

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
    alert(`Export Laporan Arus Kas untuk periode ${getPeriodeLabel()}`);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-slate-200">
          <p className="font-semibold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatRupiah(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Arus Kas</h1>
          <p className="text-slate-500 mt-1">Laporan aliran kas bisnis</p>
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

      {showPreview && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Grafik Arus Kas</h3>
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="masuk" name="Kas Masuk" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMasuk)" />
                  <Area type="monotone" dataKey="keluar" name="Kas Keluar" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorKeluar)" />
                  <Area type="monotone" dataKey="saldo" name="Saldo Kas" stroke="#3b82f6" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-emerald-600" size={20} />
            <span className="text-sm text-emerald-700">Total Pemasukan</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatRupiah(totalPemasukan)}</p>
        </div>
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="text-red-600" size={20} />
            <span className="text-sm text-red-700">Total Pengeluaran</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{formatRupiah(totalPengeluaran)}</p>
        </div>
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="text-blue-600" size={20} />
            <span className="text-sm text-blue-700">Saldo Kas Saat Ini</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{formatRupiah(saldoKas)}</p>
        </div>
      </div>

      <div className="card">
        <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
          <div className="flex justify-between">
            <span className="text-base text-slate-700">Arus Kas Bersih</span>
            <span className={`text-lg font-bold ${arusKasBersih >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatRupiah(arusKasBersih)}
            </span>
          </div>
          <div className="flex justify-between pt-4 border-t-2 border-slate-200">
            <span className="text-xl font-bold text-slate-900">Saldo Kas Akhir</span>
            <span className="text-xl font-bold text-emerald-600">{formatRupiah(saldoKas)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
