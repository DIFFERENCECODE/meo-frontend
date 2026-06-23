'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { SkeletonChatRow } from '@/components/Skeleton';
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
      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap
        opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0
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
    isRightPanelOpen,
    theme,
    colors,
    colorMode,
    toggleColorMode,
    vendor,
    setVendor,
  } = useTheme();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);

  // CSS custom props for tooltips (avoids prop-drilling colors into a static span).
  const railTipVars = {
    '--rail-tip-bg': colors.card,
    '--rail-tip-fg': colors.foreground,
    '--rail-tip-border': colors.cardBorder,
  } as React.CSSProperties;

  // ── Collapsed icon rail ────────────────────────────────────────────────────
  const CollapsedRail = () => (
    <motion.aside
      key="rail"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 56, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'h-screen flex flex-col items-center overflow-hidden z-50',
        'fixed md:relative left-0 top-0',
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
          className="relative group p-3 rounded-lg transition-colors hover:bg-white/10"
          aria-label="Open menu"
          title="Open menu"
        >
          <Menu className="h-5 w-5" style={{ color: colors.foreground }} />
          <RailTooltip label="Menu" />
        </button>

        {/* New Chat */}
        <button
          onClick={onNewChat}
          className="relative group p-3 rounded-lg transition-colors hover:bg-white/10"
          aria-label={t('sidebar.new_chat')}
          title={t('sidebar.new_chat')}
        >
          <SquarePen className="h-5 w-5" style={{ color: colors.foreground }} />
          <RailTooltip label="New Chat" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-6 my-1" style={{ height: 1, backgroundColor: `${colors.cardBorder}60` }} />

      {/* Nav icons */}
      <div className="flex-1 flex flex-col items-center gap-0.5 py-2 w-full">
        <button
          data-tour="library-nav"
          onClick={onLibraryOpen}
          className="relative group p-3 rounded-lg transition-colors hover:bg-white/10 w-full flex justify-center"
          title="Library"
        >
          <BookOpen className="h-5 w-5" style={{ color: colors.muted }} />
          <RailTooltip label="Library" />
        </button>

        <Link
          data-tour="marketplace-nav"
          href="/marketplace"
          className="relative group p-3 rounded-lg transition-colors hover:bg-white/10 w-full flex justify-center"
          title="Marketplace"
        >
          <ShoppingBag className="h-5 w-5" style={{ color: colors.muted }} />
          <RailTooltip label="Marketplace" />
        </Link>

        <button
          data-tour="vendor-nav"
          className="relative group p-3 rounded-lg transition-colors hover:bg-white/10 w-full flex justify-center"
          title={`Vendor: ${vendor === 'eos' ? 'Eos' : 'Meterbolic'}`}
        >
          <Store className="h-5 w-5" style={{ color: colors.muted }} />
          <RailTooltip label={vendor === 'eos' ? 'Eos' : 'Meterbolic'} />
        </button>

        <Link
          data-tour="personalize-nav"
          href="/personalize"
          className="relative group p-3 rounded-lg transition-colors hover:bg-white/10 w-full flex justify-center"
          title={t('sidebar.personalize')}
        >
          <Sparkles className="h-5 w-5" style={{ color: colors.muted }} />
          <RailTooltip label="Personalise" />
        </Link>

        <Link
          data-tour="activity-nav"
          href="/activity"
          className="relative group p-3 rounded-lg transition-colors hover:bg-white/10 w-full flex justify-center"
          title={t('sidebar.activity')}
        >
          <Clock className="h-5 w-5" style={{ color: colors.muted }} />
          <RailTooltip label="Activity" />
        </Link>
      </div>

      {/* Settings at bottom */}
      <div className="pb-3 w-full flex flex-col items-center">
        <div className="w-6 mb-1" style={{ height: 1, backgroundColor: `${colors.cardBorder}60` }} />
        <button
          className="relative group p-3 rounded-lg transition-colors hover:bg-white/10 w-full flex justify-center"
          onClick={() => { toggleLeftPanel(); setTimeout(() => setShowSettings(true), 250); }}
          title="Settings"
        >
          <Settings className="h-5 w-5" style={{ color: colors.muted }} />
          <RailTooltip label="Settings" />
        </button>
      </div>
    </motion.aside>
  );

  // ── Expanded panel ─────────────────────────────────────────────────────────
  const ExpandedPanel = () => (
    <>
      {/* Mobile overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="md:hidden fixed inset-0 z-40 bg-black/50"
        onClick={toggleLeftPanel}
      />

      <motion.aside
        key="panel"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 260, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'h-screen flex flex-col overflow-hidden z-50',
          'fixed md:relative left-0 top-0',
          className,
        )}
        style={{ backgroundColor: colors.background }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLeftPanel}
              className="p-2 rounded-lg transition-colors hover:bg-white/10"
              aria-label="Close menu"
            >
              <Menu className="h-5 w-5" style={{ color: colors.foreground }} />
            </button>
            <span className="font-medium text-base" style={{ color: colors.foreground }}>
              {theme.name}
            </span>
            <ChevronRight className="h-4 w-4" style={{ color: colors.muted }} />
          </div>
        </div>

        {/* New Chat */}
        <div className="px-3 py-2">
          <button
            data-tour="new-chat"
            onClick={onNewChat}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-full border transition-colors hover:bg-white/5"
            style={{ borderColor: colors.cardBorder, color: colors.foreground }}
          >
            <SquarePen className="h-5 w-5" />
            <span className="font-medium">{t('sidebar.new_chat')}</span>
          </button>
        </div>

        {/* Free plan */}
        <div className="px-3 pb-1">
          <a
            href="https://www.meterbolic.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border w-fit text-xs transition-colors hover:bg-white/5 no-underline"
            style={{ borderColor: colors.cardBorder }}
          >
            <span style={{ color: colors.muted }}>Free plan</span>
            <span style={{ color: colors.muted }}>·</span>
            <span className="font-medium" style={{ color: colors.primary }}>Upgrade</span>
          </a>
        </div>

        {/* Chats */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>
            {t('sidebar.chats')}
          </p>
          <div className="space-y-1">
            {chatsLoading && (!chats || chats.length === 0) ? (
              <>
                <SkeletonChatRow />
                <SkeletonChatRow />
                <SkeletonChatRow />
                <SkeletonChatRow />
              </>
            ) : chats && chats.length > 0 ? (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className="group relative w-full rounded-lg transition-colors hover:bg-white/5"
                  style={{
                    backgroundColor: currentChatId === chat.id ? colors.accent || 'transparent' : undefined,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChat?.(chat.id)}
                    className="w-full text-left px-3 py-2 pr-9 rounded-lg text-sm truncate"
                    style={{ color: colors.foreground }}
                  >
                    <span className="block truncate">{chat.title}</span>
                    {formatChatDate(chat.updated_at || chat.created_at) && (
                      <span className="block text-xs mt-0.5" style={{ color: colors.muted }}>
                        {formatChatDate(chat.updated_at || chat.created_at)}
                      </span>
                    )}
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
                      style={{ color: colors.muted }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="px-3 py-2 text-sm" style={{ color: colors.muted }}>
                {t('sidebar.empty_chats')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 space-y-1" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
          <div className="px-2 pb-1">
            <LanguagePicker compact showLabelWhenCompact />
          </div>
          <button
            data-tour="library-nav"
            onClick={onLibraryOpen}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: colors.muted }}
          >
            <BookOpen className="h-5 w-5" />
            <span>Library</span>
          </button>
          <Link
            data-tour="marketplace-nav"
            href="/marketplace"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: colors.muted }}
          >
            <ShoppingBag className="h-5 w-5" />
            <span>Marketplace</span>
          </Link>

          {/* Vendor switcher */}
          <div className="relative">
            <button
              data-tour="vendor-nav"
              onClick={() => setShowVendorPicker(!showVendorPicker)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ color: colors.muted }}
            >
              <span className="flex items-center gap-3">
                <Store className="h-5 w-5" />
                <span>Vendor</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: colors.primary }}>
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
                  <div className="mx-2 mb-1 p-1 rounded-lg space-y-0.5" style={{ backgroundColor: colors.accent }}>
                    {(['meterbolic', 'eos'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => { setVendor(v); setShowVendorPicker(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/5"
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
          </div>

          <Link
            data-tour="personalize-nav"
            href="/personalize"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: colors.muted }}
          >
            <Sparkles className="h-5 w-5" />
            <span>{t('sidebar.personalize')}</span>
          </Link>
          <Link
            data-tour="activity-nav"
            href="/activity"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: colors.muted }}
          >
            <Clock className="h-5 w-5" />
            <span>{t('sidebar.activity')}</span>
          </Link>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: colors.muted }}
          >
            <Settings className="h-5 w-5" />
            <span>{t('sidebar.settings')}</span>
          </button>

          {/* Settings submenu */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="ml-6 mt-1 p-2 rounded-lg space-y-1" style={{ backgroundColor: colors.accent }}>
                  <Link
                    href="/profile"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                    style={{ color: colors.foreground }}
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/pricing"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                    style={{ color: colors.foreground }}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Subscription</span>
                  </Link>
                  {onStartTour && (
                    <button
                      onClick={() => { setShowSettings(false); onStartTour(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                      style={{ color: colors.foreground }}
                    >
                      <span>🗺️</span>
                      <span>Take the tour</span>
                    </button>
                  )}
                  <button
                    onClick={toggleColorMode}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                    style={{ color: colors.foreground }}
                  >
                    <span className="flex items-center gap-2">
                      {colorMode === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      <span>{colorMode === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: colors.primary + '30', color: colors.primary }}
                    >
                      {colorMode === 'dark' ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isLeftPanelOpen ? (
        <ExpandedPanel key="expanded" />
      ) : (
        // Only show rail on md+ screens; on mobile keep the floating strip behaviour
        <CollapsedRail key="rail" />
      )}
    </AnimatePresence>
  );
}

export default LeftPanel;
