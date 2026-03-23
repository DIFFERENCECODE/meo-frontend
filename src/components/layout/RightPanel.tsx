'use client';

import React from 'react';
import { X, PanelRightClose, PanelRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { cn } from '@/lib/utils';

// Import practitioner workspace components
import { PatientList } from '@/components/practitioner/PatientList';
import { TestResults } from '@/components/practitioner/TestResults';
import { Insights } from '@/components/practitioner/Insights';
import { Interventions } from '@/components/practitioner/Interventions';
import { MessagingPanel } from '@/components/practitioner/MessagingPanel';

interface RightPanelProps {
  // View mode from chat (analysis, solution, etc.)
  viewMode?: 'response' | 'analysis' | 'solution';
  // Custom content for analysis/solution modes
  analysisContent?: React.ReactNode;
  solutionContent?: React.ReactNode;
  // Callback when panel is closed (to reset viewMode)
  onClose?: () => void;
  // Resizable panel props
  width?: number;
  onResizeStart?: () => void;
  isResizing?: boolean;
  className?: string;
}

export function RightPanel({ 
  viewMode = 'response',
  analysisContent,
  solutionContent,
  onClose,
  width = 450,
  onResizeStart,
  isResizing = false,
  className 
}: RightPanelProps) {
  const { isRightPanelOpen, toggleRightPanel, mode, theme } = useTheme();

  // Determine what content to show
  const isPractitionerMode = mode === 'practitioner';
  const showAnalysis = viewMode === 'analysis' && !isPractitionerMode;
  const showSolution = viewMode === 'solution' && !isPractitionerMode;

  // Panel shows only for analysis/solution modes or when practitioner explicitly opens it
  const shouldShow = showAnalysis || showSolution || (isRightPanelOpen && isPractitionerMode);

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {shouldShow && (
          <>
            {/* Mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={toggleRightPanel}
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className={cn(
                'h-screen flex flex-col overflow-hidden z-40 relative',
                'fixed md:relative right-0 top-0',
                'border-l shadow-xl md:shadow-none',
                'w-full',
                className
              )}
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.cardBorder,
                width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${width}px` : '100%',
                minWidth: '300px',
                maxWidth: '700px',
              }}
            >
              {/* Resize Handle */}
              <div
                onMouseDown={onResizeStart}
                className={cn(
                  'hidden md:block absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50',
                  'hover:bg-white/20 transition-colors',
                  isResizing && 'bg-white/30'
                )}
                style={{ 
                  backgroundColor: isResizing ? theme.colors.primary + '40' : 'transparent',
                }}
              >
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: theme.colors.primary }}
                />
              </div>
              {/* Header */}
              <div 
                className="flex items-center justify-between p-4 border-b"
                style={{ borderColor: theme.colors.cardBorder }}
              >
                <div>
                  <h2 
                    className="font-bold text-lg"
                    style={{ color: theme.colors.foreground }}
                  >
                    {isPractitionerMode ? 'Practitioner Workspace' : 
                     showAnalysis ? 'Metabolic Analysis' : 
                     showSolution ? 'Recommended Support' : 'Details'}
                  </h2>
                  <p 
                    className="text-xs mt-0.5"
                    style={{ color: theme.colors.muted }}
                  >
                    {isPractitionerMode ? 'Patient management & insights' : 
                     showAnalysis ? 'Based on your latest data' : 
                     showSolution ? 'Matched to your profile' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    toggleRightPanel();
                    // Reset viewMode to return to chat when closing analysis/solution panel
                    if (!isPractitionerMode && onClose) {
                      onClose();
                    }
                  }}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: theme.colors.muted }}
                  aria-label="Close panel"
                >
                  {isPractitionerMode ? (
                    <PanelRightClose className="h-5 w-5" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {isPractitionerMode ? (
                  // Practitioner Workspace Content
                  <div className="space-y-6">
                    <PatientList />
                    <TestResults />
                    <Insights />
                    <Interventions />
                    <MessagingPanel />
                  </div>
                ) : showAnalysis ? (
                  // Analysis Content
                  <div className="space-y-6">
                    {analysisContent}
                  </div>
                ) : showSolution ? (
                  // Solution Content (Vendor Cards)
                  <div className="space-y-4">
                    {solutionContent}
                  </div>
                ) : (
                  // Default empty state
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div 
                      className="p-4 rounded-full mb-4"
                      style={{ backgroundColor: theme.colors.accent }}
                    >
                      <PanelRight 
                        className="h-8 w-8" 
                        style={{ color: theme.colors.primary }} 
                      />
                    </div>
                    <p style={{ color: theme.colors.muted }}>
                      Additional content will appear here
                    </p>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default RightPanel;
