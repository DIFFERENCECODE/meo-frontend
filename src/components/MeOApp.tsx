'use client';

import React, { useState, useCallback } from 'react';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { ChatPanel, Message } from '@/components/layout/ChatPanel';
import { AnalysisContent } from '@/components/analysis/AnalysisContent';
import { SolutionContent } from '@/components/solution/SolutionContent';

// Types re-exported from chat panel
export type { Message };

interface BioAgeMetrics {
  baseline: number;
  target: number;
  improvement: number;
  baselineDate: string | null;
  targetDate: string | null;
}

// Inner component that uses the theme context
function MeOAppInner() {
  const { mode, setRightPanelOpen } = useTheme();
  
  // Chat state
  const [isActive, setIsActive] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'response' | 'analysis' | 'solution'>('response');
  
  // Graph/Analysis data state (preserved from original Chatbot)
  const [graphData, setGraphData] = useState<any[]>([]);
  const [bioAgeMetrics, setBioAgeMetrics] = useState({
    baseline: 41.9,
    target: 41.5,
    improvement: 0.4,
    baselineDate: null as string | null,
    targetDate: null as string | null,
  });

  // Helper functions from original Chatbot
  const extractGraphData = (sources: any[]) => {
    const graphSource = sources.find((s: any) => s.type === 'graph_data');
    if (!graphSource || !graphSource.gap_solved) return null;
    try {
      return JSON.parse(graphSource.gap_solved);
    } catch {
      return null;
    }
  };

  const getBioAgeMetrics = (data: any): BioAgeMetrics => {
    const baseline = data.records.find((r: any) => r.recordType === 'CLINICAL');
    const target = data.records.find((r: any) => r.recordType === 'TARGET');
    return {
      baseline: baseline?.value ?? 41.9,
      target: target?.value ?? 41.5,
      improvement: baseline && target ? baseline.value - target.value : 0,
      baselineDate: baseline ? new Date(baseline.time).toLocaleDateString() : null,
      targetDate: target ? new Date(target.time).toLocaleDateString() : null,
    };
  };

  const transformKraftForChart = (data: any[]) => {
    const timeMap = new Map<number, { time: number; Insulin?: number; Glucose?: number }>();
    data.forEach((point) => {
      if (!timeMap.has(point.time)) {
        timeMap.set(point.time, { time: point.time });
      }
      const entry = timeMap.get(point.time)!;
      if (point.analyte === 'Insulin') {
        entry.Insulin = point.value;
      } else if (point.analyte === 'Glucose') {
        entry.Glucose = point.value;
      }
    });
    const sorted = Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
    return sorted.map((entry, index) => ({
      time: `${(index * 0.5).toFixed(1)}hr`,
      glucose: entry.Glucose ?? 0,
      insulin: entry.Insulin ?? 0,
    }));
  };

  // Handle sending messages
  const handleSendMessage = useCallback(async (e?: React.FormEvent, prefill?: string) => {
    e?.preventDefault();
    const messageText = prefill || input;
    if (!messageText.trim()) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: messageText }]);
    setLoading(true);
    setIsActive(true);

    // Determine intended mode from query
    const lowerMessage = messageText.toLowerCase();
    let intendedMode: 'response' | 'analysis' | 'solution' = viewMode;
    if (lowerMessage.includes('kraft') || lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
      intendedMode = 'analysis';
    } else if (lowerMessage.includes('specialist') || lowerMessage.includes('find')) {
      intendedMode = 'solution';
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, session_id: 'demo_session' }),
      });

      const data = await res.json();
      const botResponse = data.response;

      setMessages((prev) => [...prev, { role: 'assistant', content: botResponse }]);

      // Set view mode based on backend or frontend detection
      const finalMode = data.mode || intendedMode;
      if (finalMode !== 'response') {
        setViewMode(finalMode);
        // Auto-open right panel for analysis/solution (unless in practitioner mode)
        if (mode === 'patient') {
          setRightPanelOpen(true);
        }
      }

      // Process graph data for analysis mode
      if (finalMode === 'analysis') {
        const retrievedSources = data.retrieved_sources || [];
        const graphDataParsed = extractGraphData(retrievedSources);

        if (graphDataParsed) {
          if (graphDataParsed.bio_age_data) {
            const metrics = getBioAgeMetrics(graphDataParsed.bio_age_data);
            setBioAgeMetrics(metrics);
          }
          if (graphDataParsed.kraft_curve_data?.length > 0) {
            const transformed = transformKraftForChart(graphDataParsed.kraft_curve_data);
            setGraphData(transformed);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble connecting. Please check your internet connection or try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, viewMode, mode, setRightPanelOpen]);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setIsActive(false);
    setViewMode('response');
    setInput('');
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <ThreePanelLayout
      viewMode={viewMode}
      analysisContent={<AnalysisContent graphData={graphData} bioAgeMetrics={bioAgeMetrics} />}
      solutionContent={<SolutionContent />}
      onNewChat={handleNewChat}
    >
      <ChatPanel
        messages={messages}
        input={input}
        loading={loading}
        isActive={isActive}
        onInputChange={setInput}
        onSendMessage={handleSendMessage}
        onRefresh={handleRefresh}
      />
    </ThreePanelLayout>
  );
}

// Main component with ThemeProvider wrapper
export default function MeOApp() {
  return (
    <ThemeProvider>
      <MeOAppInner />
    </ThemeProvider>
  );
}
