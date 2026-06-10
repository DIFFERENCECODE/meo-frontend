'use client';

import React, { useState, useCallback } from 'react';
import { X, PanelRightClose, PanelRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import { cn } from '@/lib/utils';

import { PatientList } from '@/components/practitioner/PatientList';
import { TestResults } from '@/components/practitioner/TestResults';
import { Insights } from '@/components/practitioner/Insights';
import { Interventions } from '@/components/practitioner/Interventions';
import { MessagingPanel } from '@/components/practitioner/MessagingPanel';

interface RightPanelProps {
  viewMode?: 'response' | 'analysis' | 'solution';
  analysisContent?: React.ReactNode;
  solutionContent?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function RightPanel({
  viewMode = 'response',
  analysisContent,
  solutionContent,
  onClose,
  className,
}: RightPanelProps) {
  const { isRightPanelOpen, toggleRightPanel, setRightPanelOpen, mode, theme } = useTheme();

  // Closing must reset both isRightPanelOpen AND notify the parent to clear
  // viewMode — otherwise shouldShow stays true via the analysis/solution
  // branch and the panel can't be dismissed.
  const handleClose = useCallback(() => {
    setRightPanelOpen(false);
    onClose?.();
  }, [setRightPanelOpen, onClose]);

  // Practitioner state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [clinicianData, setClinicianData] = useState<any>(null);
  const [clinicianLoading, setClinicianLoading] = useState(false);

  const handleSelectPatient = useCallback(async (sessionId: string) => {
    setSelectedPatientId(sessionId);
    setClinicianLoading(true);
    const token = getIdToken();
    if (!token) {
      setClinicianLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/clinician?session_id=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setClinicianData(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch clinician data', e);
    } finally {
      setClinicianLoading(false);
    }
  }, []);

  // Build test results from clinician metabolic data
  const testResults = clinicianData?.metabolic_data?.bio_age_data?.records?.map((r: any) => ({
    name: r.analyte || 'Bio Age',
    value: r.value,
    unit: r.unit || '',
    status: r.recordType === 'TARGET' ? 'normal' : 'high',
    range: undefined,
  })) || [];

  // Build insights from clinician data
  const insights = [];
  if (clinicianData) {
    if (clinicianData.metabolic_goals?.length > 0) {
      insights.push({
        type: 'info' as const,
        title: 'Patient Goals',
        description: clinicianData.metabolic_goals.join(', '),
        priority: 'medium' as const,
        actionable: false,
      });
    }
    if (clinicianData.turn_count > 0) {
      insights.push({
        type: 'success' as const,
        title: 'Engagement',
        description: `Patient has completed ${clinicianData.turn_count} conversation turns.`,
        priority: 'low' as const,
        actionable: false,
      });
    }
    if (clinicianData.grafana_error) {
      insights.push({
        type: 'warning' as const,
        title: 'Data Unavailable',
        description: `Could not fetch metabolic data: ${clinicianData.grafana_error}`,
        priority: 'high' as const,
        actionable: true,
      });
    }
  }

  // Analysis/solution from chat take priority over practitioner workspace
  const showAnalysis = viewMode === 'analysis';
  const showSolution = viewMode === 'solution';
  const isPractitionerMode = mode === 'practitioner' && !showAnalysis && !showSolution;
  const shouldShow = isRightPanelOpen || showAnalysis || showSolution;

  // ThreePanelLayout controls whether this component is in the DOM.
  // It renders as a plain in-flow panel — no fixed positioning or
  // self-managed width. The Group/Panel in ThreePanelLayout handles sizing.
  return (
    <>
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'h-full flex flex-col overflow-hidden border-l',
          className
        )}
        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }}
      >
              <div
                className="flex items-center justify-between p-4 border-b"
                style={{
                  borderColor: theme.colors.cardBorder,
                  paddingTop: 'max(1rem, env(safe-area-inset-top))',
                }}
              >
                <div>
                  <h2 className="font-bold text-lg" style={{ color: theme.colors.foreground }}>
                    {isPractitionerMode ? 'Practitioner Workspace' : showAnalysis ? 'Metabolic Analysis' : showSolution ? 'Recommended Support' : analysisContent ? 'My Dashboard' : 'Details'}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: theme.colors.muted }}>
                    {isPractitionerMode
                      ? selectedPatientId
                        ? `Viewing: ${clinicianData?.patient_name || selectedPatientId}`
                        : 'Select a patient'
                      : showAnalysis
                      ? 'Based on your latest data'
                      : showSolution
                      ? 'Matched to your profile'
                      : ''}
                  </p>
                </div>
                <button onClick={handleClose} className="p-2 rounded-lg transition-colors" style={{ color: theme.colors.muted }} aria-label="Close panel">
                  {isPractitionerMode ? <PanelRightClose className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {showAnalysis ? (
                  // Analysis Content — highest priority
                  <div className="space-y-6">{analysisContent}</div>
                ) : showSolution ? (
                  // Solution Content
                  <div className="space-y-4">{solutionContent}</div>
                ) : isPractitionerMode ? (
                  <div className="space-y-6">
                    <PatientList onSelectPatient={handleSelectPatient} selectedPatientId={selectedPatientId} />
                    {clinicianLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: theme.colors.primary }} />
                      </div>
                    ) : selectedPatientId ? (
                      <>
                        <TestResults results={testResults} lastUpdated={clinicianData ? 'Now' : undefined} />
                        <Insights insights={insights} />
                        <Interventions interventions={
                          clinicianData?.metabolic_goals?.map((goal: string) => ({
                            type: 'lifestyle' as const,
                            title: goal,
                            description: `Patient goal: ${goal}`,
                            status: 'active' as const,
                            progress: undefined,
                          })) || []
                        } />
                        <MessagingPanel
                          patientSessionId={selectedPatientId}
                          patientName={clinicianData?.patient_name}
                        />
                      </>
                    ) : (
                      <p className="text-sm text-center py-8" style={{ color: theme.colors.muted }}>
                        Select a patient to view details
                      </p>
                    )}
                  </div>
                ) : analysisContent ? (
                  // Default view: always show the analysis dashboard when
                  // the panel is open and no special mode is active.
                  <div className="space-y-6">{analysisContent}</div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-4 rounded-full mb-4" style={{ backgroundColor: theme.colors.accent }}>
                      <PanelRight className="h-8 w-8" style={{ color: theme.colors.primary }} />
                    </div>
                    <p style={{ color: theme.colors.muted }}>Additional content will appear here</p>
                  </div>
                )}
              </div>
      </motion.aside>
    </>
  );
}

export default RightPanel;
