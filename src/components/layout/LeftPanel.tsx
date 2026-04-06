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
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { VendorToggle } from '@/components/vendor/VendorToggle';
import { ModeToggle } from '@/components/mode/ModeToggle';
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

export function LeftPanel({ onNewChat, onSettingsClick, chats, currentChatId, onSelectChat, className }: LeftPanelProps) {
  const { isLeftPanelOpen, toggleLeftPanel, theme, colors, colorMode, toggleColorMode } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      {/* Collapsed state - hamburger menu icon (Gemini-style) */}
      <AnimatePresence>
        {!isLeftPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-0 left-0 z-50 flex items-center gap-2 p-3"
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
              aria-label="New chat"
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
                  <span className="font-medium">New chat</span>
                </button>
              </div>

              {/* Chats Section */}
              <div className="flex-1 overflow-y-auto px-2 py-4">
                <p 
                  className="px-3 py-2 text-xs font-medium uppercase tracking-wider"
                  style={{ color: colors.muted }}
                >
                  Chats
                </p>
                <div className="space-y-1">
                  {chats && chats.length > 0 ? (
                    chats.map((chat) => (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => onSelectChat?.(chat.id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors hover:bg-white/5"
                        style={{
                          color: colors.foreground,
                          backgroundColor: currentChatId === chat.id ? colors.accent || 'transparent' : undefined,
                        }}
                      >
                        <span className="block truncate">{chat.title}</span>
                        {formatChatDate(chat.updated_at || chat.created_at) && (
                          <span className="block text-xs mt-0.5" style={{ color: colors.muted }}>
                            {formatChatDate(chat.updated_at || chat.created_at)}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm" style={{ color: colors.muted }}>
                      No chats yet. Start a new one.
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
                </div>
              </div>

              {/* Footer - Activity & Settings */}
              <div 
                className="p-2 space-y-1"
                style={{ borderTop: `1px solid ${colors.cardBorder}` }}
              >
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
                  style={{ color: colors.muted }}
                >
                  <Clock className="h-5 w-5" />
                  <span>Activity</span>
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5"
                  style={{ color: colors.muted }}
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings & help</span>
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
