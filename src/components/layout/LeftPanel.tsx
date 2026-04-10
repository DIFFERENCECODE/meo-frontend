'use client';

import React, { useState, useEffect } from 'react';
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
  X,
  Activity as ActivityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { VendorToggle } from '@/components/vendor/VendorToggle';
import { ModeToggle } from '@/components/mode/ModeToggle';
import { getValidIdToken } from '@/app/lib/auth';
import { cn } from '@/lib/utils';

interface Measurement {
  time: string;
  name: string;
  unit: string;
  value: number;
}

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
  const [showActivity, setShowActivity] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [measLoading, setMeasLoading] = useState(false);

  const loadActivity = async () => {
    setShowActivity(true);
    setMeasLoading(true);
    try {
      const token = await getValidIdToken();
      if (!token) { setMeasLoading(false); return; }
      const res = await fetch('/api/user-data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setMeasLoading(false); return; }
      const data = await res.json();
      let entries: Measurement[] = [];
      if (data?.measurements?.length > 0) {
        entries = data.measurements;
      } else if (data?.bio_age_data?.records?.length > 0) {
        entries = data.bio_age_data.records.map((r: any) => ({
          time: new Date(r.time).toISOString(),
          name: r.analyte || 'BAS',
          unit: r.unit || '',
          value: r.value,
        }));
      }
      entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      // Dedupe
      const seen = new Set<string>();
      const unique = entries.filter((m) => {
        const key = `${m.time}|${m.name}|${m.unit}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setMeasurements(unique.slice(0, 30));
    } catch {}
    setMeasLoading(false);
  };

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
                  onClick={loadActivity}
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

      {/* Activity Modal */}
      <AnimatePresence>
        {showActivity && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60"
              onClick={() => setShowActivity(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col"
              style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: `1px solid ${colors.cardBorder}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: colors.primary + '20' }}
                  >
                    <ActivityIcon className="h-4 w-4" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: colors.foreground }}>
                      Recent Activity
                    </h2>
                    <p className="text-xs" style={{ color: colors.muted }}>
                      Your latest measurements
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowActivity(false)}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" style={{ color: colors.muted }} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {measLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div
                      className="w-6 h-6 rounded-full animate-spin border-2"
                      style={{
                        borderColor: colors.cardBorder,
                        borderTopColor: colors.primary,
                      }}
                    />
                  </div>
                ) : measurements.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: colors.muted }} />
                    <p className="text-sm" style={{ color: colors.muted }}>
                      No measurements yet
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.muted }}>
                      Your measurement history will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {measurements.map((m, i) => {
                      const date = new Date(m.time);
                      const dateStr = date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const timeStr = date.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors hover:bg-white/5"
                        >
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: colors.foreground }}
                            >
                              {m.name}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
                              {dateStr} · {timeStr}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p
                              className="text-sm font-semibold"
                              style={{ color: colors.primary }}
                            >
                              {typeof m.value === 'number' ? m.value.toFixed(2) : m.value}
                            </p>
                            <p className="text-xs" style={{ color: colors.muted }}>
                              {m.unit}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="px-6 py-3 text-xs text-center"
                style={{
                  borderTop: `1px solid ${colors.cardBorder}`,
                  color: colors.muted,
                }}
              >
                Showing {measurements.length} most recent measurements
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default LeftPanel;
