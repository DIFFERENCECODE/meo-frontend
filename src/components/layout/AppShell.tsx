'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { LeftPanel, ChatListItem } from './LeftPanel';
import { apiFetch, getIdToken } from '@/app/lib/auth';
import { ProfileMenu } from './ProfileMenu';
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
  const { theme, isLeftPanelOpen } = useTheme();
  const router = useRouter();
  const [chats, setChats] = useState<ChatListItem[]>([]);

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    fetch('/api/chats', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: ChatListItem[]) => setChats(list))
      .catch(() => {});
  }, []);

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
        chats={chats}
        onSelectChat={(id) => router.push(`/?chat=${id}`)}
        onDeleteChat={async (id) => {
          // Optimistic remove — restore the row if the DELETE fails so
          // the user isn't left thinking it worked.
          setChats((prev) => prev.filter((c) => c.id !== id));
          try {
            const res = await apiFetch(`/api/chats/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`status ${res.status}`);
            // If the deleted chat was the one currently open in the URL,
            // bounce the user back to the root so they land on their
            // next-most-recent conversation (or a fresh new chat).
            const currentUrl = new URL(window.location.href);
            if (currentUrl.searchParams.get('chat') === id) {
              router.push('/');
            }
          } catch (err) {
            console.error('Failed to delete chat', err);
            // Best-effort reload to resync with backend state.
            const token = getIdToken();
            if (token) {
              const res = await apiFetch('/api/chats');
              if (res.ok) setChats(await res.json());
            }
          }
        }}
      />
      <motion.main
        className={cn(
          'flex-1 flex flex-col h-full overflow-auto relative',
          !isLeftPanelOpen ? 'pt-14 md:pt-0' : '',
        )}
        layout
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Profile avatar — always top-right, above all content */}
        <div
          className="fixed top-0 right-0 z-50 p-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <ProfileMenu />
        </div>
        {children}
      </motion.main>
    </div>
  );
}

export default AppShell;
