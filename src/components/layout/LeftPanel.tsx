'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  SquarePen,
  Settings,
  Clock,
  Sun,
  Moon,
  User,
  CreditCard,
  Sparkles,
  Trash2,
  ShoppingBag,
  BookOpen,
  Store,
  ChevronDown,
  ChevronRight,
  Check,
  Home,
  TrendingUp,
  History,
  ClipboardList,
  Link2,
  UserRound,
  FlaskConical,
  Plus,
  PanelLeftClose,
  Smartphone,
} from 'lucide-react';
import { useModalFocus } from '@/hooks/useModalFocus';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { SkeletonChatRow } from '@/components/Skeleton';
import { SidebarUser } from './SidebarUser';
import { LanguagePicker } from '@/components/layout/LanguagePicker';
import { useTranslation } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export interface ChatListItem {
  id: string;
  title: string;
  created_at?: string | null;
  updated_at?: string | null;
}

interface LeftPanelProps {
  onNewChat?: () => void;
  onSettingsClick?: () => void;
  chats?: ChatListItem[];
  currentChatId?: string | null;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  chatsLoading?: boolean;
  onLibraryOpen?: () => void;
  className?: string;
}

/** Today / Previous 7 days / Older, newest first, as the frames group them. */
function groupChats(chats: ChatListItem[]): [string, ChatListItem[]][] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = startOfToday.getTime() - 7 * 86400000;
  const groups: Record<string, ChatListItem[]> = { Today: [], 'Previous 7 days': [], Older: [] };
  for (const c of chats) {
    const t = new Date(c.updated_at || c.created_at || 0).getTime();
    groups[t >= startOfToday.getTime() ? 'Today' : t >= weekAgo ? 'Previous 7 days' : 'Older'].push(c);
  }
  return (Object.entries(groups) as [string, ChatListItem[]][]).filter(([, v]) => v.length > 0);
}

function formatChatDate(created_at?: string | null): string {
  if (!created_at) return '';
  try {
    const d = new Date(created_at);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

// Tooltip that appears to the right of an icon in the collapsed rail.
function RailTooltip({ label }: { label: string }) {
  return (
    <span
      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded-[9px] t-body2 font-medium whitespace-nowrap
        opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0
        transition-all duration-150 z-[60]"
      style={{
        backgroundColor: 'var(--rail-tip-bg)',
        color: 'var(--rail-tip-fg)',
        border: '1px solid var(--rail-tip-border)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}
    >
      {label}
    </span>
  );
}

export function LeftPanel({
  onNewChat,
  onSettingsClick,
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  chatsLoading,
  onLibraryOpen,
  onStartTour,
  className,
}: LeftPanelProps & { onStartTour?: () => void }) {
  const {
    isLeftPanelOpen,
    toggleLeftPanel,
    setLeftPanelOpen,
    isRightPanelOpen,
    theme,
    colors,
    colorMode,
    toggleColorMode,
    vendor,
    setVendor,
  } = useTheme();
  const reducedMotion = useReducedMotion();
  const [drawerElement, setDrawerElement] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useModalFocus(drawerElement, isLeftPanelOpen && isMobile);
  const pathname = usePathname();

  // How many sources have actually sent data, for the Connectors badge and the
  // sync card. Counted by the backend from what is on the record, so "2 live"
  // is never a claim about a pairing that has not delivered anything.
  const [liveSources, setLiveSources] = useState(0);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { getValidIdToken } = await import('@/app/lib/auth');
        const token = await getValidIdToken();
        if (!token) return;
        const res = await fetch('/api/me/connectors', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const d = await res.json();
        const n = (d?.sources ?? []).filter((x: { status?: string }) => x.status === 'connected').length;
        if (live) setLiveSources(n);
      } catch {
        /* the badge is a convenience */
      }
    })();
    return () => { live = false; };
  }, []);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname && window.matchMedia('(max-width: 767px)').matches) {
      setLeftPanelOpen(false);
    }
    previousPath.current = pathname;
  }, [pathname, setLeftPanelOpen]);

  useEffect(() => {
    if (!isLeftPanelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLeftPanelOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isLeftPanelOpen, setLeftPanelOpen]);
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);

  // CSS custom props for tooltips (avoids prop-drilling colors into a static span).
  const railTipVars = {
    '--rail-tip-bg': colors.card,
    '--rail-tip-fg': colors.foreground,
    '--rail-tip-border': colors.cardBorder,
  } as React.CSSProperties;

  // Rail overflow: 'hidden' during slide animation so icons don't peek out,
  // 'visible' once settled so RailTooltips (left-full absolute) are not clipped.
  const [railOverflow, setRailOverflow] = useState<'hidden' | 'visible'>('visible');

  return (
    <>
      {/* On phones the collapsed icon rail is hidden (it ate content width), so
          show a floating menu button instead to open the drawer. */}
      {!isLeftPanelOpen && (
        <button
          onClick={toggleLeftPanel}
          className="md:hidden fixed top-3 left-3 z-30 p-2.5 rounded-[9px] shadow-md"
          style={{ backgroundColor: colors.background, border: `1px solid ${colors.cardBorder}40` }}
          aria-label="Open menu"
          data-menu-trigger
          aria-expanded={false}
          aria-controls="patient-navigation"
        >
          <Menu className="h-5 w-5" style={{ color: colors.foreground }} />
        </button>
      )}
    <AnimatePresence mode="wait" initial={false}>
      {isLeftPanelOpen ? (
        // ── Expanded panel ─────────────────────────────────────────────────
        // key="expanded" tells AnimatePresence to animate out when switching
        // to the rail — do NOT wrap in an inner component (new function ref
        // on every render causes AnimatePresence to flicker on every keystroke).
        <React.Fragment key="expanded">
          {/* Mobile overlay */}
          <motion.div
            data-menu-backdrop
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={toggleLeftPanel}
          />

          <motion.aside
            id="patient-navigation"
            ref={setDrawerElement}
            role={isMobile ? 'dialog' : undefined}
            aria-modal={isMobile ? true : undefined}
            aria-label="Navigation"
            tabIndex={-1}
            initial={reducedMotion ? { opacity: 0 } : { width: 0, opacity: 0 }}
            animate={{ width: 248, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.3 }}
            className={cn(
              'h-dvh flex flex-col overflow-hidden z-50',
              'fixed md:relative left-0 top-0',
              className,
            )}
            style={{ backgroundColor: colors.background }}
          >
            {/* Header: the frames open on the MeO mark, not a menu button. The
                collapse control stays, quietly, for the person who wants room. */}
            <div className="flex items-center justify-between" style={{ padding: '18px 12px 14px 20px' }}>
              <Link href="/" className="flex items-center no-underline" style={{ gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/clinician-mark.png" alt="" style={{ width: 30, height: 30, borderRadius: 9 }} />
                <span>
                  <span className="block" style={{ fontSize: 14.5, fontWeight: 800, color: '#ffffff' }}>MeO</span>
                  <span className="block" style={{ fontSize: 10.5, color: '#a3b4b4' }}>by Meterbolic</span>
                </span>
              </Link>
              <button
                onClick={toggleLeftPanel}
                className="meo-press p-2 rounded-[9px] hover:bg-white/5"
                aria-label="Collapse menu"
                aria-expanded={true}
                aria-controls="patient-navigation"
              >
                <PanelLeftClose className="h-4 w-4" style={{ color: '#a3b4b4' }} />
              </button>
            </div>

            {/* New chat: the one filled control in the sidebar, as in the frames. */}
            <div style={{ padding: '0 12px 10px' }}>
              <button
                data-tour="new-chat"
                onClick={() => { onNewChat?.(); if (isMobile) setLeftPanelOpen(false); }}
                className="meo-press flex items-center justify-center w-full"
                style={{ gap: 8, padding: '11px 16px', borderRadius: 10, background: '#a4d65e', color: '#1a3a3a', fontSize: 14, fontWeight: 600, border: 0, cursor: 'pointer' }}
              >
                <Plus className="h-4 w-4" />
                <span>{t('sidebar.new_chat')}</span>
              </button>
            </div>

            {/* Scroll region: nav + history. The footer stays pinned below it
                so Settings and sign-out are reachable at any viewport height. */}
            <div className="flex-1 min-h-0 overflow-y-auto">

            {/* Primary navigation.
                The storyboard puts these ABOVE the chat history, because the
                record is the app's home and chat is one destination among
                several. They used to sit in the footer under the conversation
                list, which quietly said the opposite. */}
            <nav aria-label="Main navigation" className="px-3 pt-1 pb-1" style={{ display: 'flex', flexDirection: 'column', gap: 2 }} onClick={(event) => {
              if ((event.target as HTMLElement).closest('a') && window.matchMedia('(max-width: 767px)').matches) setLeftPanelOpen(false);
            }}>
              {[
                { href: '/', label: 'My record', Icon: Home },
                { href: '/test', label: 'Guided test', Icon: FlaskConical },
                { href: '/trends', label: 'Trends', Icon: TrendingUp },
                { href: '/timeline', label: 'Timeline', Icon: History },
                { href: '/library', label: 'Library', Icon: BookOpen, tour: 'library-nav' },
                { href: '/marketplace', label: 'Marketplace', Icon: ShoppingBag, tour: 'marketplace-nav' },
                { divider: true },
                { href: '/plan', label: 'My plan', Icon: ClipboardList },
                { href: '/from-practitioner', label: 'From your practitioner', Icon: UserRound },
                { href: '/connectors', label: 'Connectors', Icon: Link2, badge: liveSources ? `${liveSources} live` : null },
              ].map((item, i) => {
                if ('divider' in item) {
                  return <div key={`d${i}`} style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 4px' }} />;
                }
                const { href, label, Icon, tour, badge } = item as { href: string; label: string; Icon: typeof Home; tour?: string; badge?: string | null };
                const active = pathname === href;
                return (
                  <Link
                    key={label}
                    data-tour={tour}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className="meo-press flex items-center no-underline"
                    style={{
                      gap: 10, padding: '9px 12px', borderRadius: 10, fontSize: 13.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#a4d65e' : '#c3d0d0',
                      background: active ? 'rgba(164,214,94,0.12)' : 'transparent',
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {badge && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#c3d0d0', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mx-4 my-1" style={{ height: 1, backgroundColor: colors.cardBorder }} />

            {/* Chats, grouped by when, titles only, as the frames list them. */}
            <div className="px-3 pt-2 pb-2">
              {chatsLoading && (!chats || chats.length === 0) ? (
                <>
                  <SkeletonChatRow />
                  <SkeletonChatRow />
                  <SkeletonChatRow />
                </>
              ) : chats && chats.length > 0 ? (
                groupChats(chats).map(([group, items]) => (
                  <div key={group}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a3b4b4', padding: '12px 12px 4px', margin: 0 }}>
                      {group}
                    </p>
                    {items.map((chat) => (
                      <div
                        key={chat.id}
                        className="group relative w-full meo-row"
                        style={{ borderRadius: 9, backgroundColor: currentChatId === chat.id ? 'rgba(164,214,94,0.12)' : undefined }}
                      >
                        <button
                          type="button"
                          onClick={() => { onSelectChat?.(chat.id); if (isMobile) setLeftPanelOpen(false); }}
                          className="w-full text-left truncate"
                          style={{ padding: '6px 34px 6px 12px', fontSize: 13, color: '#ffffff', background: 'transparent', border: 0, cursor: 'pointer' }}
                          title={formatChatDate(chat.updated_at || chat.created_at) || undefined}
                        >
                          <span className="block truncate">{chat.title}</span>
                        </button>
                        {onDeleteChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(t('chat.delete_confirm', { title: chat.title }))) {
                                onDeleteChat(chat.id);
                              }
                            }}
                            aria-label={t('sidebar.delete_chat_aria')}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-500/15"
                            style={{ color: '#a3b4b4' }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <p className="px-3 py-2" style={{ fontSize: 13, color: '#a3b4b4' }}>
                  {t('sidebar.empty_chats')}
                </p>
              )}
            </div>

            </div>

            {/* Footer.
                The storyboard's sidebar ends with one entry, not seven. Language,
                vendor, Personalize and Activity all used to be stacked here, which
                meant the bottom of the panel competed with the primary nav at the
                top for the same attention — and lost, because none of them is what
                a patient opens the app to do. They are all still reachable, one
                level down, under Settings. */}
            <div className="p-2" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
              {/* Language stays on the surface rather than under Settings: for
                  anyone not reading in English it is the first thing they need,
                  and burying it makes them hunt for it. */}
              <div className="px-2 pb-1">
                <LanguagePicker compact showLabelWhenCompact />
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[9px] t-lead transition-colors hover:bg-transparent/5"
                style={{ color: colors.muted }}
              >
                <span className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  <span>{t('sidebar.settings')}</span>
                </span>
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform"
                  style={{ transform: showSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 p-2 rounded-[9px] space-y-0.5" style={{ backgroundColor: colors.accent }}>
                      <Link href="/profile" className="w-full flex items-center gap-2 px-3 py-2 rounded-[9px] t-lead transition-colors hover:bg-transparent/5" style={{ color: colors.foreground }}>
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                      <Link data-tour="personalize-nav" href="/personalize" className="w-full flex items-center gap-2 px-3 py-2 rounded-[9px] t-lead transition-colors hover:bg-transparent/5" style={{ color: colors.foreground }}>
                        <Sparkles className="h-4 w-4" />
                        <span>{t('sidebar.personalize')}</span>
                      </Link>
                      <Link data-tour="activity-nav" href="/activity" className="w-full flex items-center gap-2 px-3 py-2 rounded-[9px] t-lead transition-colors hover:bg-transparent/5" style={{ color: colors.foreground }}>
                        <Clock className="h-4 w-4" />
                        <span>{t('sidebar.activity')}</span>
                      </Link>
                      <Link href="/pricing" className="w-full flex items-center gap-2 px-3 py-2 rounded-[9px] t-lead transition-colors hover:bg-transparent/5" style={{ color: colors.foreground }}>
                        <CreditCard className="h-4 w-4" />
                        <span>Subscription</span>
                      </Link>

                      <div className="my-1" style={{ height: 1, backgroundColor: colors.cardBorder }} />

                      {/* Vendor switcher — a tenant setting, not a destination. */}
                      <button
                        data-tour="vendor-nav"
                        onClick={() => setShowVendorPicker(!showVendorPicker)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-[9px] t-lead transition-colors hover:bg-transparent/5"
                        style={{ color: colors.foreground }}
                      >
                        <span className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          <span>Vendor</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="t-body2" style={{ color: colors.primary }}>
                            {vendor === 'eos' ? 'Eos' : 'Meterbolic'}
                          </span>
                          <ChevronDown
                            className="h-3.5 w-3.5 transition-transform"
                            style={{ transform: showVendorPicker ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </span>
                      </button>
                      <AnimatePresence>
                        {showVendorPicker && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-6 mb-1 space-y-0.5">
                              {(['meterbolic', 'eos'] as const).map((v) => (
                                <button
                                  key={v}
                                  onClick={() => { setVendor(v); setShowVendorPicker(false); }}
                                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-md t-lead transition-colors hover:bg-transparent/5"
                                  style={{ color: colors.foreground }}
                                >
                                  <span>{v === 'eos' ? 'Eos' : 'Meterbolic'}</span>
                                  {vendor === v && <Check className="h-3.5 w-3.5" style={{ color: colors.primary }} />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {onStartTour && (
                        <button
                          onClick={() => { setShowSettings(false); onStartTour(); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-[9px] t-lead transition-colors hover:bg-transparent/5" style={{ color: colors.foreground }}
                        >
                          <span>🗺️</span>
                          <span>Take the tour</span>
                        </button>
                      )}
                      <button
                        onClick={toggleColorMode}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-[9px] t-lead transition-colors hover:bg-transparent/5"
                        style={{ color: colors.foreground }}
                      >
                        <span className="flex items-center gap-2">
                          {colorMode === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                          <span>{colorMode === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                        </span>
                        <span
                          className="t-body2 px-2 py-0.5 rounded"
                          style={{ backgroundColor: colors.primary + '30', color: colors.primary }}
                        >
                          {colorMode === 'dark' ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ borderTop: `1px solid ${colors.cardBorder}`, marginTop: 8, paddingTop: 2 }}>
                <Link
                  href="/connectors"
                  className="meo-press flex items-center no-underline"
                  style={{ gap: 10, margin: '6px 4px 4px', padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11.5, color: '#c3d0d0' }}
                >
                  <Smartphone className="h-4 w-4 shrink-0" style={{ color: liveSources ? '#a4d65e' : '#a3b4b4' }} />
                  <span className="truncate">{liveSources ? `${liveSources} source${liveSources === 1 ? '' : 's'} sending data` : 'Connect your meter or phone'}</span>
                </Link>
                <SidebarUser />
              </div>
            </div>
          </motion.aside>
        </React.Fragment>
      ) : (
        // ── Collapsed icon rail ─────────────────────────────────────────────
        <motion.aside
          key="rail"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 56, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.3 }}
          onAnimationStart={() => setRailOverflow('hidden')}
          onAnimationComplete={() => setRailOverflow('visible')}
          className={cn(
            'h-screen hidden md:flex flex-col items-center z-50',
            'fixed md:relative left-0 top-0',
            railOverflow === 'hidden' ? 'overflow-hidden' : 'overflow-visible',
            className,
          )}
          style={{
            backgroundColor: colors.background,
            borderRight: `1px solid ${colors.cardBorder}40`,
            ...railTipVars,
          }}
        >
          {/* Hamburger */}
          <div className="pt-3 pb-1 flex flex-col items-center gap-1 w-full">
            <button
              onClick={toggleLeftPanel}
              className="relative group p-3 rounded-[9px] transition-colors hover:bg-transparent/10"
              aria-label="Open menu"
          data-menu-trigger
          aria-expanded={false}
          aria-controls="patient-navigation"
            >
              <Menu className="h-5 w-5" style={{ color: colors.foreground }} />
              <RailTooltip label="Menu" />
            </button>

            <button
              onClick={() => { onNewChat?.(); if (isMobile) setLeftPanelOpen(false); }}
              className="relative group p-3 rounded-[9px] transition-colors hover:bg-transparent/10"
              aria-label={t('sidebar.new_chat')}
            >
              <SquarePen className="h-5 w-5" style={{ color: colors.foreground }} />
              <RailTooltip label="New Chat" />
            </button>
          </div>

          <div className="w-6 my-1" style={{ height: 1, backgroundColor: `${colors.cardBorder}60` }} />

          <div className="flex-1 flex flex-col items-center gap-0.5 py-2 w-full">
            {/* The record is the app's home, so it leads the rail. Chat is
                reached from New Chat and from the history below, not from
                here — it is a destination now, not the ground floor. */}
            <Link
              href="/"
              className="relative group p-3 rounded-[9px] transition-colors hover:bg-transparent/10 w-full flex justify-center"
            >
              <Home className="h-5 w-5" style={{ color: colors.muted }} />
              <RailTooltip label="My record" />
            </Link>

            <Link
              href="/test"
              className="relative group p-3 rounded-[9px] transition-colors hover:bg-transparent/10 w-full flex justify-center"
            >
              <FlaskConical className="h-5 w-5" style={{ color: colors.muted }} />
              <RailTooltip label="Guided test" />
            </Link>

            <Link
              href="/trends"
              className="relative group p-3 rounded-[9px] transition-colors hover:bg-transparent/10 w-full flex justify-center"
            >
              <TrendingUp className="h-5 w-5" style={{ color: colors.muted }} />
              <RailTooltip label="Trends" />
            </Link>

            <Link
              href="/timeline"
              className="relative group p-3 rounded-[9px] transition-colors hover:bg-transparent/10 w-full flex justify-center"
            >
              <History className="h-5 w-5" style={{ color: colors.muted }} />
              <RailTooltip label="Timeline" />
            </Link>

            <Link
              href="/library"
              className="relative group p-3 rounded-[9px] transition-colors hover:bg-white/10 w-full flex justify-center"
            >
              <BookOpen className="h-5 w-5" style={{ color: colors.muted }} />
              <RailTooltip label="Library" />
            </Link>

            <Link
              data-tour="marketplace-nav"
              href="/marketplace"
              className="relative group p-3 rounded-[9px] transition-colors hover:bg-transparent/10 w-full flex justify-center"
            >
              <ShoppingBag className="h-5 w-5" style={{ color: colors.muted }} />
              <RailTooltip label="Marketplace" />
            </Link>

          </div>

          <div className="pb-3 w-full flex flex-col items-center">
            <div className="w-6 mb-1" style={{ height: 1, backgroundColor: `${colors.cardBorder}60` }} />
            <button
              className="relative group p-3 rounded-[9px] transition-colors hover:bg-transparent/10 w-full flex justify-center"
              onClick={() => { toggleLeftPanel(); setTimeout(() => setShowSettings(true), 250); }}
            >
              <Settings className="h-5 w-5" style={{ color: colors.muted }} />
              <RailTooltip label="Settings" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
    </>
  );
}

export default LeftPanel;
