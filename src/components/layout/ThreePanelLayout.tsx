'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  onClosePanel?: () => void;
  className?: string;
}

export function ThreePanelLayout({
  children,
  viewMode = 'response',
  analysisContent,
  solutionContent,
  onNewChat,
  onSettingsClick,
  onClosePanel,
  className,
}: ThreePanelLayoutProps) {
  const { 
    isLeftPanelOpen, 
    isRightPanelOpen, 
    mode,
    theme 
  } = useTheme();

  // Right panel width state for resizing
  const [rightPanelWidth, setRightPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if right panel should be visible
  // Panel shows only for analysis/solution modes or when practitioner explicitly opens it
  const isPractitionerMode = mode === 'practitioner';
  const showRightPanel = 
    (viewMode === 'analysis' && !isPractitionerMode) || 
    (viewMode === 'solution' && !isPractitionerMode) ||
    (isRightPanelOpen && isPractitionerMode);

  // Handle mouse move for resizing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = containerRect.right - e.clientX;
    setRightPanelWidth(Math.max(300, Math.min(700, newWidth)));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
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

      {/* Right Panel with Resizable Divider */}
      <RightPanel
        viewMode={viewMode}
        analysisContent={analysisContent}
        solutionContent={solutionContent}
        onClose={onClosePanel}
        width={rightPanelWidth}
        onResizeStart={() => setIsResizing(true)}
        isResizing={isResizing}
      />
    </div>
  );
}

export default ThreePanelLayout;
