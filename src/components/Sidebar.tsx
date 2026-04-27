'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  Download,
  Settings,
  Target,
  LogIn,
  Tag,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/home', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/buku-kas', label: 'Buku Kas', icon: BookOpen },
  { href: '/laba-rugi', label: 'Laba Rugi', icon: TrendingUp },
  { href: '/neraca', label: 'Neraca', icon: FileText },
  { href: '/arus-kas', label: 'Arus Kas', icon: TrendingDown },
  { href: '/cek-rekening', label: 'Cek Rekening', icon: Target },
  { href: '/laporan', label: 'Laporan', icon: PieChart },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    document.cookie = 'isLoggedIn=; path=/; max-age=0';
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('adminUser');
    router.push('/');
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg"
      >
        <Menu size={24} />
      </button>

      {/* Desktop Sidebar - unchanged */}
      <aside className="hidden md:flex w-56 bg-slate-900 text-white h-screen flex-col fixed left-0 top-0 z-50">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-lg font-bold text-emerald-400">Laporan Keuangan</h1>
          <p className="text-xs text-slate-400 mt-1">UMKM Management</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1">
          <Link
            href="/kategori"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/kategori' 
                ? 'bg-emerald-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Tag size={20} />
            <span className="font-medium">Kategori</span>
          </Link>
          <Link
            href="/pengaturan"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/pengaturan' 
                ? 'bg-emerald-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings size={20} />
            <span className="font-medium">Pengaturan</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left text-red-400 hover:bg-red-900/30 hover:text-red-300"
          >
            <LogIn size={20} className="rotate-180" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed inset-0 bg-slate-900 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-emerald-400">Laporan Keuangan</h1>
            <p className="text-xs text-slate-400 mt-1">UMKM Management</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1">
          <Link
            href="/kategori"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/kategori' 
                ? 'bg-emerald-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Tag size={20} />
            <span className="font-medium">Kategori</span>
          </Link>
          <Link
            href="/pengaturan"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/pengaturan' 
                ? 'bg-emerald-600 text-white' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings size={20} />
            <span className="font-medium">Pengaturan</span>
          </Link>
          <button
            onClick={() => { setIsOpen(false); handleLogout(); }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left text-red-400 hover:bg-red-900/30 hover:text-red-300"
          >
            <LogIn size={20} className="rotate-180" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}