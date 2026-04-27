'use client';

import { usePathname } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/';

  return isLoginPage ? <>{children}</> : <AppLayout>{children}</AppLayout>;
}