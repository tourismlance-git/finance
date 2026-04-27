'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Search, ArrowUpRight, ArrowDownRight, Edit2, Trash2, Upload, X, Loader2 } from 'lucide-react';
import { api, formatRupiah, formatDate } from '@/lib/api';

type Transaksi = {
  id: string;
  tanggal: string;
  deskripsi: string;
  kategori: string;
  jumlah: number;
  tipe: 'debit' | 'credit';
};

const kategoriOptions = [
  { value: 'pendapatan-jasa', label: 'Pendapatan Jasa', tipe: 'debit' },
  { value: 'pendapatan-produksi', label: 'Pendapatan Produksi', tipe: 'debit' },
  { value: 'pendapatan-konsultasi', label: 'Pendapatan Konsultasi', tipe: 'debit' },
  { value: 'pendapatan-lain', label: 'Pendapatan Lainnya', tipe: 'debit' },
  { value: 'persediaan', label: 'Persediaan', tipe: 'credit' },
  { value: 'perlengkapan', label: 'Perlengkapan', tipe: 'credit' },
  { value: 'biaya-listrik', label: 'Biaya Listrik', tipe: 'credit' },
  { value: 'biaya-internet', label: 'Biaya Internet', tipe: 'credit' },
  { value: 'biaya-sewa', label: 'Biaya Sewa', tipe: 'credit' },
  { value: 'biaya-gaji', label: 'Biaya Gaji', tipe: 'credit' },
  { value: 'biaya-transport', label: 'Biaya Transport', tipe: 'credit' },
  { value: 'biaya-promosi', label: 'Biaya Promosi', tipe: 'credit' },
  { value: 'biaya-perbaikan', label: 'Biaya Perbaikan', tipe: 'credit' },
  { value: 'biaya-lain', label: 'Biaya Lainnya', tipe: 'credit' },
];

export default function BukuKasPage() {
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    deskripsi: '',
    kategori: '',
    jumlah: '',
    tipe: 'debit' as 'debit' | 'credit',
  });

  const resetForm = () => ({
    tanggal: new Date().toISOString().split('T')[0],
    deskripsi: '',
    kategori: '',
    jumlah: '',
    tipe: 'debit' as 'debit' | 'credit',
  });

  useEffect(() => {
    const fetchTransaksi = async () => {
      try {
        setLoading(true);
        const result = await api.getTransaksi();
        if (result.success && result.data) {
          setTransactions(result.data);
        }
      } catch (err: any) {
        setError(err.message || 'Gagal mengambil data');
      } finally {
        setLoading(false);
      }
    };
    fetchTransaksi();
  }, []);

  const filteredTransactions = transactions.filter(t => 
    t.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.kategori.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPemasukan = transactions.filter(t => t.tipe === 'debit').reduce((acc, t) => acc + t.jumlah, 0);
  const totalPengeluaran = transactions.filter(t => t.tipe === 'credit').reduce((acc, t) => acc + t.jumlah, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kategoriLabel = kategoriOptions.find(k => k.value === formData.kategori)?.label || formData.kategori;
    const transaksiData = {
      tanggal: formData.tanggal,
      deskripsi: formData.deskripsi,
      kategori: kategoriLabel,
      jumlah: parseInt(formData.jumlah),
      tipe: formData.tipe,
    };
    
    try {
      console.log('Submitting transaction:', transaksiData);
      if (editId) {
        await api.updateTransaksi(editId, transaksiData);
        setTransactions(transactions.map(t => 
          t.id === editId ? { ...t, ...transaksiData } : t
        ));
      } else {
        const result = await api.addTransaksi(transaksiData);
        console.log('Add result:', result);
        if (result.success && result.id) {
          setTransactions([{ ...transaksiData, id: result.id }, ...transactions]);
        } else {
          alert(result.message || 'Gagal menyimpan transaksi');
          return;
        }
      }
      setShowModal(false);
      setFormData(resetForm());
      setEditId(null);
    } catch (err: any) {
      console.error('Transaction error:', err);
      alert('Gagal menyimpan transaksi: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    try {
      const result = await api.deleteTransaksi(id);
      if (!result.success) {
        alert('Gagal menghapus: ' + (result.message || 'Unknown error'));
        return;
      }
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert('Gagal menghapus transaksi: ' + err.message);
    }
  };

  const handleImport = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      
      try {
        const result = await api.importTransaksi(text);
        if (result.success) {
          const fetchResult = await api.getTransaksi();
          if (fetchResult.success && fetchResult.data) {
            setTransactions(fetchResult.data);
          }
          alert(result.message);
        }
      } catch (err: any) {
        alert('Gagal import: ' + err.message);
      }
      setShowImportModal(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buku Kas</h1>
          <p className="text-slate-500 mt-1">Kelola transaksi harian bisnis Anda</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center gap-2">
            <Upload size={20} />
            Import
          </button>
          <button onClick={() => { setFormData(resetForm()); setEditId(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Tambah Transaksi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-emerald-50 border-emerald-200">
          <p className="text-sm text-emerald-700">Total Pemasukan</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatRupiah(totalPemasukan)}</p>
        </div>
        <div className="card bg-red-50 border-red-200">
          <p className="text-sm text-red-700">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{formatRupiah(totalPengeluaran)}</p>
        </div>
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-700">Saldo Akhir</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{formatRupiah(saldo)}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Tidak ada transaksi</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-sm font-medium text-slate-500 py-3">Tanggal</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-3">Deskripsi</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-3">Kategori</th>
                  <th className="text-right text-sm font-medium text-slate-500 py-3">Jumlah</th>
                  <th className="text-right text-sm font-medium text-slate-500 py-3">Tipe</th>
                  <th className="text-right text-sm font-medium text-slate-500 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaksi) => (
                  <tr key={transaksi.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 text-sm text-slate-600">{formatDate(transaksi.tanggal)}</td>
                    <td className="py-4 text-sm text-slate-900 font-medium">{transaksi.deskripsi}</td>
                    <td className="py-4 text-sm text-slate-600">{transaksi.kategori}</td>
                    <td className="py-4 text-sm text-slate-900 text-right font-medium">
                      {formatRupiah(transaksi.jumlah)}
                    </td>
                    <td className="py-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        transaksi.tipe === 'debit' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {transaksi.tipe === 'debit' ? (
                          <><ArrowUpRight size={12} />Pemasukan</>
                        ) : (
                          <><ArrowDownRight size={12} />Pengeluaran</>
                        )}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setFormData({
                              tanggal: transaksi.tanggal,
                              deskripsi: transaksi.deskripsi,
                              kategori: kategoriOptions.find(k => k.label === transaksi.kategori)?.value || '',
                              jumlah: transaksi.jumlah.toString(),
                              tipe: transaksi.tipe,
                            });
                            setEditId(transaksi.id);
                            setShowModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(transaksi.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editId ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditId(null); setFormData(resetForm()); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Tanggal</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Tipe Transaksi</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipe"
                      value="debit"
                      checked={formData.tipe === 'debit'}
                      onChange={() => setFormData({...formData, tipe: 'debit'})}
                      className="text-emerald-600"
                    />
                    <span className="text-sm text-slate-700">Pemasukan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipe"
                      value="credit"
                      checked={formData.tipe === 'credit'}
                      onChange={() => setFormData({...formData, tipe: 'credit'})}
                      className="text-emerald-600"
                    />
                    <span className="text-sm text-slate-700">Pengeluaran</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="label">Kategori</label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                  className="input"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {kategoriOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <input
                  type="text"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                  className="input"
                  placeholder="Masukkan deskripsi transaksi"
                  required
                />
              </div>
              <div>
                <label className="label">Jumlah (IDR)</label>
                <input
                  type="number"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({...formData, jumlah: e.target.value})}
                  className="input"
                  placeholder="Masukkan nominal"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditId(null); setFormData(resetForm()); }}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editId ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Import dari Excel</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Format Excel (TSV):</p>
                <table className="w-full text-xs text-slate-600">
                  <tr>
                    <td className="py-1">Kolom 1:</td>
                    <td className="py-1">Tanggal (YYYY-MM-DD)</td>
                  </tr>
                  <tr>
                    <td className="py-1">Kolom 2:</td>
                    <td className="py-1">Deskripsi</td>
                  </tr>
                  <tr>
                    <td className="py-1">Kolom 3:</td>
                    <td className="py-1">Kategori</td>
                  </tr>
                  <tr>
                    <td className="py-1">Kolom 4:</td>
                    <td className="py-1">Jumlah (angka)</td>
                  </tr>
                </table>
                <p className="text-xs text-slate-500 mt-2">Contoh: 2024-01-15	Penjualan Produk	Pendapatan Jasa	2500000</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt,.tsv,.csv"
                className="input file:py-2 file:px-4 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:cursor-pointer"
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button onClick={handleImport} className="btn-primary flex-1">
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}