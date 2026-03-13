'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { cn } from '@/lib/utils';

interface ThreePanelLayoutProps {
  children: React.ReactNode; // The chat panel content
  viewMode?: 'response' | 'analysis' | 'solution';
  analysisContent?: React.ReactNode;
  solutionContent?: React.ReactNode;
  onNewChat?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export function ThreePanelLayout({
  children,
  viewMode = 'response',
  analysisContent,
  solutionContent,
  onNewChat,
  onSettingsClick,
  className,
}: ThreePanelLayoutProps) {
  const { 
    isLeftPanelOpen, 
    isRightPanelOpen, 
    mode,
    theme 
  } = useTheme();

  // Determine if right panel should be visible
  const isPractitionerMode = mode === 'practitioner';
  const showRightPanel = isRightPanelOpen || 
    (viewMode === 'analysis' && !isPractitionerMode) || 
    (viewMode === 'solution' && !isPractitionerMode) ||
    isPractitionerMode;

  return (
    <div 
      className={cn('h-screen w-screen flex overflow-hidden', className)}
      style={{ 
        background: `linear-gradient(180deg, ${theme.colors.backgroundGradientStart} 0%, ${theme.colors.backgroundGradientMid} 40%, ${theme.colors.backgroundGradientEnd} 100%)` 
      }}
    >
      {/* Left Panel */}
      <LeftPanel 
        onNewChat={onNewChat} 
        onSettingsClick={onSettingsClick} 
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
      />
    </div>
  );
}

export default ThreePanelLayout;
