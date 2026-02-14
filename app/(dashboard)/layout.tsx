// ============================================================================
// Dashboard Layout - Main app shell with navigation
// ============================================================================

import { Metadata } from 'next';
import { DashboardHeader } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { NotificationProvider } from '@/components/providers/NotificationProvider';

export const metadata: Metadata = {
  title: 'ADHD Assistant | Dashboard',
  description: 'Your ADHD-friendly productivity dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DashboardHeader />
        <main className="pb-24 pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </NotificationProvider>
  );
}
