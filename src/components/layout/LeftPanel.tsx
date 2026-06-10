'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  SquarePen,
  ChevronRight,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { VendorToggle } from '@/components/vendor/VendorToggle';
import { ModeToggle } from '@/components/mode/ModeToggle';
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
  /** Dynamic chats from API; when provided, sidebar shows these instead of mock list */
  chats?: ChatListItem[];
  /** Current chat id (for highlight) */
  currentChatId?: string | null;
  /** When user selects a chat in the list */
  onSelectChat?: (id: string) => void;
  /** When user deletes a chat. Parent should DELETE /api/chats/{id} and
   *  update local chat list + currentChatId. */
  onDeleteChat?: (id: string) => void;
  /** True while the initial /api/chats fetch is in flight — renders
   *  a stack of Skeleton rows so the sidebar never collapses to
   *  "No chats yet" during the load race. */
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

export function LeftPanel({ onNewChat, onSettingsClick, chats, currentChatId, onSelectChat, onDeleteChat, chatsLoading, onLibraryOpen, className }: LeftPanelProps) {
  const { isLeftPanelOpen, toggleLeftPanel, isRightPanelOpen, theme, colors, colorMode, toggleColorMode } = useTheme();
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      {/* Collapsed state - hamburger menu icon (Gemini-style).
          Hidden while the right panel is open on mobile so the toggles
          don't bleed through into the RightPanel header (z-50 on top of
          z-40 panel was producing a visible icon overlap on phones). */}
      <AnimatePresence>
        {!isLeftPanelOpen && !isRightPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-0 left-0 z-50 flex items-center gap-2 p-3"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <button
              onClick={toggleLeftPanel}
              className="p-2 rounded-lg transition-colors hover:bg-white/10"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" style={{ color: colors.foreground }} />
            </button>
            <button
              onClick={onNewChat}
              className="p-2 rounded-lg transition-colors hover:bg-white/10"
              aria-label={t('sidebar.new_chat')}
            >
              <SquarePen className="h-5 w-5" style={{ color: colors.foreground }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded panel - Gemini-style minimalist */}
      <AnimatePresence>
        {isLeftPanelOpen && (
          <>
            {/* Mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              onClick={toggleLeftPanel}
            />

            {/* Panel */}
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'h-screen flex flex-col overflow-hidden z-50',
                'fixed md:relative left-0 top-0',
                className
              )}
              style={{
                backgroundColor: colors.background,
              }}
            >
              {/* Header - Vendor name + collapse */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleLeftPanel}
                    className="p-2 rounded-lg transition-colors hover:bg-white/10"
                    aria-label="Close menu"
                  >
                    <Menu className="h-5 w-5" style={{ color: colors.foreground }} />
                  </button>
                  <span 
                    className="font-medium text-base"
                    style={{ color: colors.foreground }}
                  >
                    {theme.name}
                  </span>
                  <ChevronRight className="h-4 w-4" style={{ color: colors.muted }} />
                </div>
              </div>

              {/* New Chat Button - Gemini style */}
              <div className="px-3 py-2">
                <button
                  onClick={onNewChat}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-full border transition-colors hover:bg-white/5"
                  style={{
                    borderColor: colors.cardBorder,
                    color: colors.foreground,
                  }}
                >
                  <SquarePen className="h-5 w-5" />
                  <span className="font-medium">{t('sidebar.new_chat')}</span>
                </button>
              </div>

              {/* Free plan · Upgrade */}
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

              {/* Chats Section */}
              <div className="flex-1 overflow-y-auto px-2 py-4">
                <p 
                  className="px-3 py-2 text-xs font-medium uppercase tracking-wider"
                  style={{ color: colors.muted }}
                >
                  {t('sidebar.chats')}
                </p>
                <div className="space-y-1">
                  {chatsLoading && (!chats || chats.length === 0) ? (
                    // Show skeleton rows during the initial /api/chats
                    // race so the sidebar doesn't momentarily flash
                    // "No chats yet" before real data lands.
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
                          backgroundColor:
                            currentChatId === chat.id ? colors.accent || 'transparent' : undefined,
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
                            <span
                              className="block text-xs mt-0.5"
                              style={{ color: colors.muted }}
                            >
                              {formatChatDate(chat.updated_at || chat.created_at)}
                            </span>
                          )}
                        </button>
                        {onDeleteChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Quick confirm — plain browser prompt keeps this
                              // in one file. Swap for a toast/modal later.
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

                {/* Vendor/Mode Toggles - Collapsible section */}
                <div className="mt-6 space-y-4">
                  <div className="px-3">
                    <p 
                      className="text-xs font-medium uppercase tracking-wider mb-2"
                      style={{ color: colors.muted }}
                    >
                      Vendor
                    </p>
                    <VendorToggle />
                  </div>
                  <div className="px-3">
                    <p
                      className="text-xs font-medium uppercase tracking-wider mb-2"
                      style={{ color: colors.muted }}
                    >
                      Mode
                    </p>
                    <ModeToggle />
                  </div>
                  <div className="px-3">
                    <Link
                      href="/marketplace"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
                      style={{ color: colors.muted }}
                    >
                      <ShoppingBag className="h-5 w-5" />
                      <span>Marketplace</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Footer - Activity, Language & Settings */}
              <div
                className="p-2 space-y-1"
                style={{ borderTop: `1px solid ${colors.cardBorder}` }}
              >
                {/* Platform language — reads/writes LanguageContext
                    directly so every picker instance (here, in the
                    chat input) stays in sync. Shown with native label
                    so users can spot "العربية" at a glance. */}
                <div className="px-2 pb-1">
                  <LanguagePicker compact showLabelWhenCompact />
                </div>
                <button
                  onClick={onLibraryOpen}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
                  style={{ color: colors.muted }}
                >
                  <BookOpen className="h-5 w-5" />
                  <span>Library</span>
                </button>
                <Link
                  href="/personalize"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
                  style={{ color: colors.muted }}
                >
                  <Sparkles className="h-5 w-5" />
                  <span>{t('sidebar.personalize')}</span>
                </Link>
                <Link
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

                {/* Settings Submenu */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div 
                        className="ml-6 mt-1 p-2 rounded-lg space-y-1"
                        style={{ backgroundColor: colors.accent }}
                      >
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
                        <button
                          onClick={toggleColorMode}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                          style={{ color: colors.foreground }}
                        >
                          <span className="flex items-center gap-2">
                            {colorMode === 'dark' ? (
                              <Moon className="h-4 w-4" />
                            ) : (
                              <Sun className="h-4 w-4" />
                            )}
                            <span>{colorMode === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                          </span>
                          <span 
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: colors.primary + '30',
                              color: colors.primary 
                            }}
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
        )}
      </AnimatePresence>
    </>
  );
}

export default LeftPanel;
