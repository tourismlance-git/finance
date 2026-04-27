'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Wallet, Building, PiggyBank, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { api, formatRupiah } from '@/lib/api';

type Rekening = {
  id: string;
  nama: string;
  nomor: string;
  saldo: number;
  jenis: string;
};

const API_URL = '/api/sheets';

export default function CekRekeningPage() {
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saldoKas, setSaldoKas] = useState(0);
  const [loadingSaldo, setLoadingSaldo] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    nomor: '',
    saldo: '',
    jenis: 'Bank',
  });

  const resetForm = () => ({
    nama: '',
    nomor: '',
    saldo: '',
    jenis: 'Bank',
  });

  const fetchRekening = async () => {
    try {
      setLoading(true);
      const result = await api.getRekening();
      if (result.success && result.data) {
        setRekening(result.data.map((r: any) => ({
          id: r.id || r.nama,
          nama: r.nama || '',
          nomor: r.nomor || '',
          saldo: parseInt(r.saldo) || 0,
          jenis: r.jenis || 'Bank',
        })));
      }
    } catch (err) {
      console.error('Error fetching rekening:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshSaldoKas = async () => {
    try {
      setLoadingSaldo(true);
      const result = await api.getDashboard();
      if (result.success && result.data) {
        setSaldoKas(result.data.saldoKas || 0);
      }
    } catch (err) {
      console.error('Error fetching saldo:', err);
    } finally {
      setLoadingSaldo(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingSaldo(true);
        
        const [rekResult, dashResult] = await Promise.all([
          api.getRekening(),
          api.getDashboard(),
        ]);
        
        if (rekResult.success && rekResult.data) {
          setRekening(rekResult.data.map((r: any) => ({
            id: r.id || r.nama,
            nama: r.nama || '',
            nomor: r.nomor || '',
            saldo: parseInt(r.saldo) || 0,
            jenis: r.jenis || 'Bank',
          })));
        }
        
        if (dashResult.success && dashResult.data) {
          setSaldoKas(dashResult.data.saldoKas || 0);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
        setLoadingSaldo(false);
      }
    };
    fetchData();
  }, []);

  const totalSaldoRekening = rekening.reduce((acc, r) => acc + r.saldo, 0);
  const selisih = totalSaldoRekening - saldoKas;
  const isMatch = selisih === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const newRekening = {
        id: editId || Date.now().toString(),
        nama: formData.nama,
        nomor: formData.nomor,
        saldo: parseInt(formData.saldo),
        jenis: formData.jenis,
      };

      if (editId) {
        await fetch(API_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'Rekening', data: newRekening, id: editId }),
        });
      } else {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'Rekening', data: newRekening }),
        });
      }

      await fetchRekening();
      await refreshSaldoKas();
      setShowModal(false);
      setEditId(null);
      setFormData(resetForm());
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (r: Rekening) => {
    setFormData({
      nama: r.nama,
      nomor: r.nomor || '',
      saldo: r.saldo.toString(),
      jenis: r.jenis,
    });
    setEditId(r.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus rekening ini?')) return;
    try {
      setSaving(true);
      await fetch(`${API_URL}?table=Rekening&id=${id}`, { method: 'DELETE' });
      await fetchRekening();
      await refreshSaldoKas();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (jenis: string) => {
    if (jenis === 'Bank') return <Building size={20} />;
    if (jenis === 'Kas') return <Wallet size={20} />;
    return <PiggyBank size={20} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cek Rekening</h1>
          <p className="text-slate-500 mt-1">Cek kesesuaian saldo aktual dengan laporan</p>
        </div>
        <button onClick={() => { setFormData(resetForm()); setEditId(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Tambah Rekening
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : (
        <>
          <div className={`card ${isMatch ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Saldo Buku Kas</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {loadingSaldo ? '...' : formatRupiah(saldoKas)}
                </p>
              </div>
              <div className="text-center">
                {loadingSaldo ? (
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                ) : isMatch ? (
                  <CheckCircle className="text-emerald-600 mx-auto" size={48} />
                ) : (
                  <AlertTriangle className="text-red-600 mx-auto" size={48} />
                )}
                <p className={`text-lg font-semibold mt-2 ${isMatch ? 'text-emerald-700' : 'text-red-700'}`}>
                  {loadingSaldo ? '...' : (isMatch ? 'SESUAI' : 'TIDAK SESUAI')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Saldo Aktual Rekening</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatRupiah(totalSaldoRekening)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Selisih</p>
                <p className={`text-xl font-bold ${selisih === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {loadingSaldo ? '...' : (selisih === 0 ? 'Rp 0' : formatRupiah(selisih))}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Daftar Rekening</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-sm font-medium text-slate-500 py-3">Tipe</th>
                    <th className="text-left text-sm font-medium text-slate-500 py-3">Nama Rekening</th>
                    <th className="text-left text-sm font-medium text-slate-500 py-3">Nomor Rekening</th>
                    <th className="text-right text-sm font-medium text-slate-500 py-3">Saldo</th>
                    <th className="text-right text-sm font-medium text-slate-500 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rekening.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">Belum ada rekening</td>
                    </tr>
                  ) : (
                    rekening.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                              {getIcon(r.jenis)}
                            </div>
                            <span className="text-sm text-slate-600 capitalize">{r.jenis}</span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-slate-900 font-medium">{r.nama}</td>
                        <td className="py-4 text-sm text-slate-600 font-mono">{r.nomor || '-'}</td>
                        <td className="py-4 text-sm text-slate-900 text-right font-medium">
                          {formatRupiah(r.saldo)}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(r)} className="p-2 text-slate-400 hover:text-emerald-600">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-red-600">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editId ? 'Edit Rekening' : 'Tambah Rekening'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditId(null); setFormData(resetForm()); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Tipe Rekening</label>
                <select
                  value={formData.jenis}
                  onChange={(e) => setFormData({...formData, jenis: e.target.value})}
                  className="input"
                  required
                >
                  <option value="Bank">Bank</option>
                  <option value="Kas">Kas</option>
                </select>
              </div>
              <div>
                <label className="label">Nama Rekening</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="input"
                  placeholder="Contoh: Bank BCA"
                  required
                />
              </div>
              <div>
                <label className="label">Nomor Rekening</label>
                <input
                  type="text"
                  value={formData.nomor}
                  onChange={(e) => setFormData({...formData, nomor: e.target.value})}
                  className="input"
                  placeholder="Contoh: 1234567890"
                />
              </div>
              <div>
                <label className="label">Saldo (IDR)</label>
                <input
                  type="number"
                  value={formData.saldo}
                  onChange={(e) => setFormData({...formData, saldo: e.target.value})}
                  className="input"
                  placeholder="Masukkan nominal saldo"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditId(null); setFormData(resetForm()); }}
                  className="btn-secondary flex-1"
                  disabled={saving}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin inline" size={16} /> : (editId ? 'Simpan' : 'Tambah')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
