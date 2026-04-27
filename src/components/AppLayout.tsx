'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-56 min-h-screen overflow-hidden bg-slate-50">
        <div className="h-full p-4 md:p-4 lg:p-5 pt-16 md:pt-5">
          {children}
        </div>
      </main>
    </div>
  );
}