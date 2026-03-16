'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { LeftPanel } from './LeftPanel';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps content with the app sidebar (LeftPanel) so pages like Profile
 * open with the same navigation as the main chat view.
 */
export function AppShell({ children, className }: AppShellProps) {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <div
      className={cn('h-screen w-screen flex overflow-hidden', className)}
      style={{
        background: `linear-gradient(180deg, ${theme.colors.backgroundGradientStart} 0%, ${theme.colors.backgroundGradientMid} 40%, ${theme.colors.backgroundGradientEnd} 100%)`,
      }}
    >
      <LeftPanel
        onNewChat={() => router.push('/')}
        onSettingsClick={() => {}}
      />
      <motion.main
        className="flex-1 flex flex-col h-full overflow-auto relative"
        layout
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {children}
      </motion.main>
    </div>
  );
}

export default AppShell;
