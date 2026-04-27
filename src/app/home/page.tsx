'use client';

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Receipt,
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3,
  PieChart,
  DollarSign,
  Target,
  Building,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import { api, formatRupiah, formatDate } from '@/lib/api';
import { buildPeriodSeries, type PeriodSeriesPoint } from '@/lib/accounting';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

const PERIOD_TYPES = [
  { value: 'tanggal', label: 'Tgl' },
  { value: 'bulan', label: 'Bulan' },
  { value: 'tahun', label: 'Tahun' },
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

const getDefaultDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState('');
  const [formattedData, setFormattedData] = useState({
    saldoKas: '',
    labaRugi: '',
    arusKas: '',
    totalPendapatan: '',
    totalPengeluaran: '',
    transactions: [] as {id: string; deskripsi: string; jumlah: string; tipe: string; tanggal: string; kategori: string}[],
    rekening: [] as {nama: string; saldo: string; jenis: string}[],
  });
  const [targetBulanan, setTargetBulanan] = useState('Rp 0');
  const [targetTahunan, setTargetTahunan] = useState('Rp 0');
  const [periodeType, setPeriodeType] = useState('bulan');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [totalTransaksi, setTotalTransaksi] = useState(0);
  
  const [startYear, setStartYear] = useState(currentYear.toString());
  const [endYear, setEndYear] = useState(currentYear.toString());
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [startDate, setStartDate] = useState(getDefaultDate());
  const [endDate, setEndDate] = useState(getDefaultDate());
  const [chartData, setChartData] = useState<PeriodSeriesPoint[]>([]);
  
  const [totalSaldoRekening, setTotalSaldoRekening] = useState(0);
  const saldoKasValue = dashboardData?.saldoKas || 0;
  const selisih = dashboardData?.selisihRekening ?? 0;
  
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Fetching dashboard data...');
        const result = await api.getDashboard();
        
        if (result.success && result.data) {
          setDashboardData(result.data);
          setTotalTransaksi(result.data.totalTransaksi || 0);
          const rekeningData = (result.data.rekening || []).map((r: any) => ({
            nama: r.nama,
            saldo: r.saldo,
            jenis: r.jenis,
          }));
          setTotalSaldoRekening(result.data.saldoRekening || 0);
          setFormattedData({
            saldoKas: formatRupiah(result.data.saldoKas || 0),
            labaRugi: formatRupiah(result.data.labaRugi || 0),
            arusKas: formatRupiah(result.data.arusKas?.kenaikanKasBersih || 0),
            totalPendapatan: formatRupiah(result.data.totalPemasukan || 0),
            totalPengeluaran: formatRupiah(result.data.totalPengeluaran || 0),
            transactions: (result.data.recentTransactions || []).map((t: any) => ({
              ...t,
              jumlah: formatRupiah(t.jumlah),
            })),
            rekening: rekeningData.map((r: any) => ({
              ...r,
              saldo: formatRupiah(r.saldo),
            })),
          });
          setTargetBulanan(formatRupiah(20000000));
          setTargetTahunan(formatRupiah(240000000));
        } else {
          console.log('API returned failure:', result);
          setError('Gagal mengambil data');
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'Gagal terhubung ke server');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (periodeType === 'tanggal') {
      setChartData(buildPeriodSeries(dashboardData?.transactions || [], 'tanggal', startDate, endDate));
    } else if (periodeType === 'bulan') {
      setChartData(buildPeriodSeries(dashboardData?.transactions || [], 'bulan', `${startYear}-${startMonth}`, `${endYear}-${endMonth}`));
    } else {
      setChartData(buildPeriodSeries(dashboardData?.transactions || [], 'tahun', startYear, endYear));
    }
  }, [startDate, endDate, startYear, endYear, startMonth, endMonth, periodeType, dashboardData]);

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Ringkasan keuangan bisnis Anda</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {PERIOD_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setPeriodeType(type.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border-2 transition-colors ${
                  periodeType === type.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {type.label}
              </button>
            ))}
            
            {periodeType === 'tanggal' && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                />
              </div>
            )}

            {periodeType === 'bulan' && (
              <div className="flex items-center gap-1">
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                >
                  {TAHUN_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                >
                  {BULAN_OPTIONS.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
                <span className="text-slate-400">-</span>
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                >
                  {TAHUN_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                >
                  {BULAN_OPTIONS.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
            )}

            {periodeType === 'tahun' && (
              <div className="flex items-center gap-1">
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                >
                  {TAHUN_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <span className="text-slate-400">-</span>
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                >
                  {TAHUN_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-slate-500 bg-white px-2 py-1 rounded border">
              <Clock size={12} />
              <span>{currentDate}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <Wallet size={16} />
              <span className="text-[10px] bg-white/20 px-1 rounded">+12%</span>
            </div>
            <p className="text-[10px] text-emerald-100">Saldo Kas</p>
            <p className="text-sm font-bold truncate">{formattedData.saldoKas || '...'}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={16} />
              <span className="text-[10px] bg-white/20 px-1 rounded">+8%</span>
            </div>
            <p className="text-[10px] text-blue-100">Laba Rugi</p>
            <p className="text-sm font-bold truncate">{formattedData.labaRugi || '...'}</p>
          </div>

          <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown size={16} />
              <span className="text-[10px] bg-white/20 px-1 rounded">-3%</span>
            </div>
            <p className="text-[10px] text-violet-100">Arus Kas</p>
            <p className="text-sm font-bold truncate">{formattedData.arusKas || '...'}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <Receipt size={16} />
            </div>
            <p className="text-[10px] text-orange-100">Transaksi</p>
            <p className="text-sm font-bold">{loading ? '...' : totalTransaksi}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 rounded">
                  <BarChart3 className="text-emerald-600" size={14} />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">Grafik Arus Kas</h2>
              </div>
            </div>
            <div className="h-48 min-h-[192px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPendapatan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(value) => `${(value / 1000000)}jt`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="pendapatan" name="Pendapatan" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPendapatan)" />
                  <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorPengeluaran)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-slate-600">Pendapatan</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <span className="text-xs text-slate-600">Pengeluaran</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-violet-100 rounded">
                <PieChart className="text-violet-600" size={14} />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Distribusi</h2>
            </div>
            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={24} />
              </div>
            ) : chartData.length > 0 ? (
              <>
                <div className="h-32 min-h-[128px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={chartData.map((d, i) => ({ name: d.label, value: d.pendapatan, color: COLORS[i % COLORS.length] }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2">
                  {chartData.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-slate-600">{item.label}</span>
                      </div>
                      <span className="font-medium text-slate-900">{formatRupiah(item.pendapatan)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-xs">
                Tidak ada data
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded">
                  <Receipt className="text-blue-600" size={14} />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">Transaksi Terbaru</h2>
              </div>
              <a href="/buku-kas" className="text-xs text-emerald-600">Lihat Semua →</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-2 px-3 font-medium text-slate-500">Tgl</th>
                    <th className="text-left py-2 font-medium text-slate-500">Deskripsi</th>
                    <th className="text-right py-2 font-medium text-slate-500">Jumlah</th>
                    <th className="text-right py-2 font-medium text-slate-500">Tipe</th>
                  </tr>
                </thead>
                <tbody>
                  {formattedData.transactions.map((transaksi) => (
                    <tr key={transaksi.id} className="border-b border-slate-100">
                      <td className="py-2 px-3 text-slate-600">{formatDate(transaksi.tanggal)}</td>
                      <td className="py-2 text-slate-900 font-medium truncate max-w-[150px]">{transaksi.deskripsi}</td>
                      <td className="py-2 text-slate-900 text-right font-medium">{transaksi.jumlah}</td>
                      <td className="py-2 text-right">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          transaksi.tipe === 'debit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {transaksi.tipe === 'debit' ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
                          {transaksi.tipe === 'debit' ? 'In' : 'Out'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded">
                  <Building className="text-amber-600" size={14} />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">Cek Rekening</h2>
              </div>
              <a href="/cek-rekening" className="text-xs text-emerald-600">Kelola →</a>
            </div>
            
            <div className="space-y-2">
              {formattedData.rekening.map((rek, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  {rek.nama === 'Bank BCA' && <Building className="text-blue-600" size={12} />}
                  {rek.nama === 'Bank Mandiri' && <Building className="text-green-600" size={12} />}
                  {rek.nama === 'Kas Tangan' && <DollarSign className="text-yellow-600" size={12} />}
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-900">{rek.nama}</p>
                    <p className="text-[10px] text-slate-500">{rek.saldo}</p>
                  </div>
                </div>
              ))}
              
              <div className={`p-2 rounded mt-2 ${selisih === 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">Status</p>
                  <p className={`text-xs font-bold ${selisih === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {selisih === 0 ? 'SESUAI' : 'TIDAK SESUAI'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded">
              <DollarSign className="text-emerald-600" size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Total Pendapatan</p>
              <p className="text-sm font-bold text-slate-900 truncate">{formattedData.totalPendapatan || '...'}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded">
              <TrendingDown className="text-rose-600" size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Total Pengeluaran</p>
              <p className="text-sm font-bold text-slate-900 truncate">{formattedData.totalPengeluaran || '...'}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded">
              <Target className="text-violet-600" size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Target Bulanan</p>
              <p className="text-sm font-bold text-slate-900 truncate">{targetBulanan}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded">
              <Target className="text-amber-600" size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Target Tahunan</p>
              <p className="text-sm font-bold text-slate-900 truncate">{targetTahunan}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
