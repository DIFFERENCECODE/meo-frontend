'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import { LayoutDashboard, Users, Activity, FileText, ArrowLeft, Shield } from 'lucide-react';

const ADMIN_EMAILS = ['eric@meterbolic.com', 'muhammad.naeem@meterbolic.com'];

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/monitoring', label: 'Monitoring', icon: Activity },
  { href: '/admin/content', label: 'Content', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { theme, colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      router.replace('/');
      return;
    }
    fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          router.replace('/');
          return;
        }
        const isAdmin =
          data.role === 'admin' ||
          ADMIN_EMAILS.includes((data.email || '').toLowerCase());
        if (!isAdmin) {
          router.replace('/');
          return;
        }
        setAuthorized(true);
      })
      .catch(() => router.replace('/'))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full animate-spin" style={{ background: colors.primary }}>
            <span className="text-2xl font-bold" style={{ color: colors.primaryForeground }}>M</span>
          </div>
          <p className="text-sm animate-pulse" style={{ color: colors.muted }}>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: colors.background }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex flex-col border-r"
        style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
      >
        <div className="p-4 border-b" style={{ borderColor: colors.cardBorder }}>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: colors.primary }} />
            <span className="font-bold" style={{ color: colors.foreground }}>Admin Panel</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? colors.accent : 'transparent',
                  color: isActive ? colors.foreground : colors.muted,
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: colors.cardBorder }}>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80"
            style={{ color: colors.muted }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to MeO
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
