'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { LeftPanel, ChatListItem } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { cn } from '@/lib/utils';

interface ThreePanelLayoutProps {
  children: React.ReactNode; // The chat panel content
  viewMode?: 'response' | 'analysis' | 'solution';
  analysisContent?: React.ReactNode;
  solutionContent?: React.ReactNode;
  onNewChat?: () => void;
  onSettingsClick?: () => void;
  onCloseRightPanel?: () => void;
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
  chats,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  chatsLoading,
  className,
}: ThreePanelLayoutProps) {
  const {
    isLeftPanelOpen,
    isRightPanelOpen,
    mode,
    theme,
    colors,
  } = useTheme();

  // Determine if right panel should be visible
  // Analysis/solution from chat always show, regardless of practitioner mode
  const showRightPanel = isRightPanelOpen ||
    viewMode === 'analysis' ||
    viewMode === 'solution' ||
    mode === 'practitioner';

  return (
    <div 
      className={cn('h-screen w-screen flex overflow-hidden', className)}
      style={{ 
        background: `linear-gradient(180deg, ${colors.backgroundGradientStart} 0%, ${colors.backgroundGradientMid} 40%, ${colors.backgroundGradientEnd} 100%)`
      }}
    >
      {/* Left Panel */}
      <LeftPanel
        onNewChat={onNewChat}
        onSettingsClick={onSettingsClick}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
        chatsLoading={chatsLoading}
      />

      {/* Center Panel (Chat) - flexes to fill remaining space */}
      <motion.main
        className="flex-1 flex flex-col h-full overflow-hidden relative"
        layout
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          // Adjust margins based on panel states (for smooth transitions)
          marginLeft: isLeftPanelOpen ? 0 : 0,
        }}
      >
        {children}
      </motion.main>

      {/* Right Panel */}
      <RightPanel
        viewMode={viewMode}
        analysisContent={analysisContent}
        solutionContent={solutionContent}
        onClose={onCloseRightPanel}
      />
    </div>
  );
}

export default ThreePanelLayout;
