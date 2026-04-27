'use client';

import { useState } from 'react';
import { Save, Building2, Calendar, User } from 'lucide-react';

export default function PengaturanPage() {
  const [formData, setFormData] = useState({
    namaBisnis: 'UMKM Saya',
    namaPemilik: 'John Doe',
    tahunFiskal: '2024',
    mataUang: 'IDR',
    email: 'john@example.com',
    noTelepon: '+62812345678',
    alamat: 'Jl. Contoh No. 123, Jakarta',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Pengaturan berhasil disimpan!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
          <p className="text-slate-500 mt-1">Kelola informasi bisnis Anda</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Building2 size={20} />
            Informasi Bisnis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Nama Bisnis</label>
              <input
                type="text"
                value={formData.namaBisnis}
                onChange={(e) => setFormData({...formData, namaBisnis: e.target.value})}
                className="input"
              />
            </div>
            <div>
              <label className="label">Nama Pemilik</label>
              <input
                type="text"
                value={formData.namaPemilik}
                onChange={(e) => setFormData({...formData, namaPemilik: e.target.value})}
                className="input"
              />
            </div>
            <div>
              <label className="label">Tahun Fiskal</label>
              <input
                type="text"
                value={formData.tahunFiskal}
                onChange={(e) => setFormData({...formData, tahunFiskal: e.target.value})}
                className="input"
              />
            </div>
            <div>
              <label className="label">Mata Uang</label>
              <select
                value={formData.mataUang}
                onChange={(e) => setFormData({...formData, mataUang: e.target.value})}
                className="input"
              >
                <option value="IDR">IDR - Rupiah Indonesia</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <User size={20} />
            Informasi Kontak
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="input"
              />
            </div>
            <div>
              <label className="label">No. Telepon</label>
              <input
                type="tel"
                value={formData.noTelepon}
                onChange={(e) => setFormData({...formData, noTelepon: e.target.value})}
                className="input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Alamat</label>
              <textarea
                value={formData.alamat}
                onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                className="input"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Save size={20} />
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}