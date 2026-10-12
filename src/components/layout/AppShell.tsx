'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { LeftPanel, ChatListItem } from './LeftPanel';
import { SectionAssistant } from '@/components/assistant/SectionAssistant';
import { apiFetch, getIdToken, getValidIdToken, redirectToLogin } from '@/app/lib/auth';
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
  rightPanelLabel?: string;
  /**
   * Set false only on screens that own their own composer (chat). The guided
   * test keeps it: mid-test is exactly when "is 5.8 high?" gets asked, and
   * making someone abandon the step to ask is how you lose the reading.
   */
  showAskBar?: boolean;
  askPlaceholder?: string;
  /** Passed to the conversation so the answer starts where the question did. */
  askContext?: string;
  /**
   * Send a visitor with no usable session to sign-in. On by default: every
   * screen behind the shell shows the person's own record, and without this
   * an expired session left them on "Couldn't load your record" with no way
   * back. Off only for pages that work signed out (pricing, marketplace).
   */
  requireAuth?: boolean;
}

// Guards against a sign-in loop if the code exchange itself is broken: after
// a few bounces in a minute, stop redirecting and let the page show its error.
function shouldRedirectToLogin(): boolean {
  try {
    const key = 'meo_login_bounces';
    const now = Date.now();
    const recent = (JSON.parse(window.sessionStorage.getItem(key) || '[]') as number[])
      .filter((t) => now - t < 60_000);
    if (recent.length >= 3) return false;
    window.sessionStorage.setItem(key, JSON.stringify([...recent, now]));
  } catch {
    // sessionStorage unavailable: redirect anyway, the loop guard is a nicety.
  }
  return true;
}

/**
 * Wraps content with the app sidebar (LeftPanel) so pages like Profile
 * open with the same navigation as the main chat view.
 */
export function AppShell({
  children,
  className,
  rightPanel,
  rightPanelLabel = 'Reading details',
  showAskBar = true,
  askPlaceholder = 'Ask MeO…',
  askContext,
  requireAuth = true,
}: AppShellProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [chats, setChats] = useState<ChatListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // A stored token or a ?code= in the URL means this person was signed in
      // (or is mid sign-in); only they get the "session expired" notice.
      const hadSession =
        !!getIdToken() || new URL(window.location.href).searchParams.has('code');
      const token = await getValidIdToken();
      if (cancelled) return;
      if (!token) {
        if (requireAuth && shouldRedirectToLogin()) {
          redirectToLogin(hadSession ? 'session_expired' : undefined);
        }
        return;
      }
      try {
        const res = await fetch('/api/chats', { headers: { Authorization: `Bearer ${token}` } });
        const list: ChatListItem[] = res.ok ? await res.json() : [];
        if (!cancelled) setChats(list);
      } catch {
        // The sidebar's history is a convenience; the page still works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requireAuth]);

  return (
    <div
      className={cn('h-dvh w-full flex overflow-hidden', className)}
      style={{
        background: `linear-gradient(180deg, ${colors.backgroundGradientStart} 0%, ${colors.backgroundGradientMid} 40%, ${colors.backgroundGradientEnd} 100%)`,
      }}
    >
      <Backdrop />
      <LeftPanel
        onLibraryOpen={() => router.push('/library')}
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
          'min-w-0 flex-1 flex flex-col h-full overflow-hidden relative pt-14',
        )}
        layout
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      >
        {/* Profile avatar — always top-right, above all content */}
        <div
          className="fixed top-0 right-0 z-50 p-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <ProfileMenu />
        </div>

        <div className="flex-1 flex min-h-0 relative">
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            <SectionAssistant context={askContext} composer={showAskBar ? <AskBar placeholder={askPlaceholder} /> : null}>
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="min-h-full flex flex-col">{children}</div>
              {rightPanel && (
                <details className="xl:hidden mx-7 mb-6 rounded-2xl" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                  <summary className="min-h-11 cursor-pointer px-5 py-3 font-semibold" style={{ color: colors.foreground }}>{rightPanelLabel}</summary>
                  {rightPanel}
                </details>
              )}
            </div>
            </SectionAssistant>
          </div>

          {rightPanel && (
            <aside
              aria-label={rightPanelLabel}
              className="hidden xl:flex w-[372px] flex-none flex-col overflow-auto border-l"
              style={{ borderColor: colors.cardBorder, backgroundColor: 'rgba(16,38,38,0.45)' }}
            >
              {rightPanel}
            </aside>
          )}
        </div>
      </motion.main>
    </div>
  );
}

export default AppShell;
