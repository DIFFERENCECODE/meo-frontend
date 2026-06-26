'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { LeftPanel, ChatListItem } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { cn } from '@/lib/utils';

// Tracks whether we're below the `md` breakpoint (phones). Used to render the
// right panel as a full-screen overlay instead of a squished side column.
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);
  return isMobile;
}

interface ThreePanelLayoutProps {
  children: React.ReactNode;
  viewMode?: 'response' | 'analysis' | 'solution';
  analysisContent?: React.ReactNode;
  solutionContent?: React.ReactNode;
  onNewChat?: () => void;
  onSettingsClick?: () => void;
  onCloseRightPanel?: () => void;
  onLibraryOpen?: () => void;
  onStartTour?: () => void;
  chats?: ChatListItem[];
  currentChatId?: string | null;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  chatsLoading?: boolean;
  className?: string;
}

export function ThreePanelLayout({
  children,
  viewMode = 'response',
  analysisContent,
  solutionContent,
  onNewChat,
  onSettingsClick,
  onCloseRightPanel,
  onLibraryOpen,
  onStartTour,
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  chatsLoading,
  className,
}: ThreePanelLayoutProps) {
  const { isLeftPanelOpen, isRightPanelOpen, mode, colors } = useTheme();

  const showRightPanel = isRightPanelOpen ||
    viewMode === 'analysis' ||
    viewMode === 'solution' ||
    mode === 'practitioner';

  const isMobile = useIsMobile();
  // On mobile there's no room for a side-by-side panel, so we don't auto-open it
  // for practitioner mode — it appears as a full-screen overlay only when the user
  // explicitly opens it or when there's analysis/solution content to show.
  const showRightMobile = isRightPanelOpen ||
    viewMode === 'analysis' ||
    viewMode === 'solution';

  // Right panel width as a percentage of the container.
  // Persists across open/close so the user's last resize is remembered.
  const [rightWidthPct, setRightWidthPct] = useState(32);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidthPx: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onHandlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // setPointerCapture routes all future pointer events to this element
    // even when the pointer moves outside it — essential for reliable drag.
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    dragRef.current = {
      startX: e.clientX,
      startWidthPx: (rightWidthPct / 100) * containerWidth,
    };
    setIsDragging(true);
  }, [rightWidthPct]);

  const onHandlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    // Dragging LEFT increases the right panel (startX > clientX → positive dx)
    const dx = dragRef.current.startX - e.clientX;
    const newWidthPx = dragRef.current.startWidthPx + dx;
    const newPct = Math.min(52, Math.max(20, (newWidthPx / containerWidth) * 100));
    setRightWidthPct(newPct);
  }, []);

  const onHandlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  return (
    <div
      className={cn('h-screen w-screen flex overflow-hidden', className)}
      style={{
        background: `linear-gradient(180deg, ${colors.backgroundGradientStart} 0%, ${colors.backgroundGradientMid} 40%, ${colors.backgroundGradientEnd} 100%)`
      }}
    >
      <LeftPanel
        onNewChat={onNewChat}
        onSettingsClick={onSettingsClick}
        onLibraryOpen={onLibraryOpen}
        onStartTour={onStartTour}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
        chatsLoading={chatsLoading}
      />

      {/* Center + Right: custom resizable split.
          setPointerCapture on the drag handle ensures events are captured
          even when the pointer moves faster than the re-render cycle. */}
      <div ref={containerRef} className="flex-1 h-full flex overflow-hidden">
        {/* Center — fills all space not taken by the right panel */}
        <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
          {children}
        </div>

        <AnimatePresence initial={false}>
          {showRightPanel && !isMobile && (
            <>
              {/* Drag handle — wide touch target, thin visual separator */}
              <motion.div
                key="right-sep"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-4 h-full flex-shrink-0 flex items-center justify-center cursor-col-resize touch-none select-none group"
                onPointerDown={onHandlePointerDown}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
              >
                <div
                  className="w-px h-full transition-colors group-hover:bg-white/30 group-active:bg-white/50"
                  style={{ backgroundColor: `${colors.cardBorder}80` }}
                />
              </motion.div>

              {/* Right panel — spring-animated on open/close, instant during drag */}
              <motion.div
                key="right-panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${rightWidthPct}%`, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={isDragging
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 400, damping: 38, mass: 0.8 }
                }
                className="h-full flex-shrink-0 overflow-hidden"
                style={{ minWidth: 0 }}
              >
                <RightPanel
                  viewMode={viewMode}
                  analysisContent={analysisContent}
                  solutionContent={solutionContent}
                  onClose={onCloseRightPanel}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile: render the right panel as a full-screen overlay (with backdrop)
            instead of a side column, so it never squishes the chat. */}
        <AnimatePresence initial={false}>
          {showRightMobile && isMobile && (
            <>
              <motion.div
                key="right-backdrop-m"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/50"
                onClick={onCloseRightPanel}
              />
              <motion.div
                key="right-panel-m"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 38, mass: 0.8 }}
                className="fixed inset-0 z-50 w-full h-full overflow-hidden"
                style={{ background: colors.background }}
              >
                <RightPanel
                  viewMode={viewMode}
                  analysisContent={analysisContent}
                  solutionContent={solutionContent}
                  onClose={onCloseRightPanel}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ThreePanelLayout;
