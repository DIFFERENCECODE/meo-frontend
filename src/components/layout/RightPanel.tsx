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
  className?: string;
}

export function RightPanel({ 
  viewMode = 'response',
  analysisContent,
  solutionContent,
  className 
}: RightPanelProps) {
  const { isRightPanelOpen, toggleRightPanel, mode, theme } = useTheme();

  // Determine what content to show
  const isPractitionerMode = mode === 'practitioner';
  const showAnalysis = viewMode === 'analysis' && !isPractitionerMode;
  const showSolution = viewMode === 'solution' && !isPractitionerMode;

  // Don't render if conditions don't require the panel
  const shouldShow = isRightPanelOpen || showAnalysis || showSolution;

  return (
    <>
      {/* Toggle button when panel is closed */}
      <AnimatePresence>
        {!isRightPanelOpen && !showAnalysis && !showSolution && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            onClick={toggleRightPanel}
            className="fixed top-4 right-4 z-50 p-3 rounded-xl backdrop-blur border shadow-lg hover:scale-105 transition-transform"
            style={{
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.cardBorder,
            }}
            aria-label="Open right panel"
          >
            <PanelRight className="h-5 w-5" style={{ color: theme.colors.foreground }} />
          </motion.button>
        )}
      </AnimatePresence>

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
                'h-screen flex flex-col overflow-hidden z-40',
                'fixed md:relative right-0 top-0',
                'border-l shadow-xl md:shadow-none',
                'w-full md:w-[450px] lg:w-[500px]',
                className
              )}
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.cardBorder,
              }}
            >
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
                  onClick={toggleRightPanel}
                  className="p-2 rounded-lg transition-colors"
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
