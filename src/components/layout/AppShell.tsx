'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { LeftPanel, ChatListItem } from './LeftPanel';
import LibraryPanel from './LibraryPanel';
import { apiFetch, getIdToken } from '@/app/lib/auth';
import { ProfileMenu } from './ProfileMenu';
import { Backdrop } from './Backdrop';
import { AskBar } from './AskBar';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Optional third column. The storyboard uses it on the record, trends,
   * library and marketplace — the screens where there is a "what you're
   * looking at" to show beside the main content — and omits it on the
   * protocol screens, where a second column would compete with the step.
   */
  rightPanel?: React.ReactNode;
  /**
   * Set false only on screens that own their own composer (chat). The guided
   * test keeps it: mid-test is exactly when "is 5.8 high?" gets asked, and
   * making someone abandon the step to ask is how you lose the reading.
   */
  showAskBar?: boolean;
  askPlaceholder?: string;
  /** Passed to the conversation so the answer starts where the question did. */
  askContext?: string;
}

/**
 * Wraps content with the app sidebar (LeftPanel) so pages like Profile
 * open with the same navigation as the main chat view.
 */
export function AppShell({
  children,
  className,
  rightPanel,
  showAskBar = true,
  askPlaceholder = 'Ask MeO…',
  askContext,
}: AppShellProps) {
  const { theme, colors, isLeftPanelOpen } = useTheme();
  const router = useRouter();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  // The Library button lives in LeftPanel, which AppShell renders on every
  // screen — but AppShell never owned the panel, so the button did nothing
  // anywhere except inside the chat view, which wires its own copy. The
  // sidebar is shared, so the state it drives has to live here too.
  const [libraryOpen, setLibraryOpen] = useState(false);

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
        background: `linear-gradient(180deg, ${colors.backgroundGradientStart} 0%, ${colors.backgroundGradientMid} 40%, ${colors.backgroundGradientEnd} 100%)`,
      }}
    >
      <Backdrop />
      <LeftPanel
        onLibraryOpen={() => setLibraryOpen(true)}
        onNewChat={() => router.push('/chat')}
        onSettingsClick={() => {}}
        chats={chats}
        onSelectChat={(id) => router.push(`/chat?chat=${id}`)}
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
              router.push('/chat');
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

        <div className="flex-1 flex min-h-0 relative">
          <div className="flex-1 flex flex-col min-w-0 overflow-auto">
            <div className="flex-1">{children}</div>
            {showAskBar && (
              <div className="sticky bottom-0 px-5 pb-5 pt-2">
                <div className="max-w-6xl mx-auto">
                  <AskBar placeholder={askPlaceholder} context={askContext} />
                </div>
              </div>
            )}
          </div>

          {rightPanel && (
            <aside
              className="hidden lg:flex w-[372px] flex-none flex-col overflow-auto border-l"
              style={{ borderColor: colors.cardBorder, backgroundColor: 'rgba(16,38,38,0.45)' }}
            >
              {rightPanel}
            </aside>
          )}
        </div>
      </motion.main>

      {libraryOpen && (
        <LibraryPanel
          onClose={() => setLibraryOpen(false)}
          onAskMeO={(prompt) => {
            setLibraryOpen(false);
            router.push(`/chat?q=${encodeURIComponent(prompt)}`);
          }}
        />
      )}
    </div>
  );
}

export default AppShell;
