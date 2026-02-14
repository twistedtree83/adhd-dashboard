// ============================================================================
// Bottom Navigation - Mobile-friendly bottom nav
// ============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Mic, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/capture', label: 'Capture', icon: Mic, isCenter: true },
  { path: '/meetings', label: 'Meetings', icon: Calendar },
  { path: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.path}
                href={item.path}
                className="relative -top-4"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </motion.div>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center w-16 h-full ${
                isActive ? 'text-blue-500' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs mt-1">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottomNav"
                  className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
