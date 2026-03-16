'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { ChatPanel, Message } from '@/components/layout/ChatPanel';
import type { ChatListItem } from '@/components/layout/LeftPanel';
import { AnalysisContent } from '@/components/analysis/AnalysisContent';
import { SolutionContent } from '@/components/solution/SolutionContent';
import { getLoginUrl, getLogoutUrl, exchangeCodeForTokens, storeIdToken, getIdToken, clearIdToken, getSubFromIdToken } from '@/app/lib/auth';
import LandingPage from '@/components/LandingPage';

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
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  // Sidebar: list of user's chats and current conversation
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatsLoading, setChatsLoading] = useState(false);
  
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

  const handleLogin = () => {
    const url = getLoginUrl();
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  };

  const handleLogout = () => {
    clearIdToken();
    setIdToken(null);
    window.location.href = getLogoutUrl();
  };

  // On mount, capture ?code=... from Cognito redirect and exchange for tokens.
  useEffect(() => {
    const existing = getIdToken();
    if (existing) {
      setIdToken(existing);
      return;
    }
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return;

    setIsExchanging(true);
    (async () => {
      try {
        const tokens = await exchangeCodeForTokens(code);
        storeIdToken(tokens.id_token);
        setIdToken(tokens.id_token);
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.toString());
      } catch (err) {
        console.error('Failed to exchange Cognito code for tokens', err);
      } finally {
        setIsExchanging(false);
      }
    })();
  }, []);

  // When signed in, load chats and ensure we have a current chat
  useEffect(() => {
    if (!idToken) return;
    setChatsLoading(true);
    const token = idToken;
    (async () => {
      try {
        const res = await fetch('/api/chats', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          setChatsLoading(false);
          return;
        }
        const list: ChatListItem[] = await res.json();
        setChats(list);
        if (list.length > 0 && !currentChatId) {
          setCurrentChatId(list[0].id);
        } else if (list.length === 0) {
          const createRes = await fetch('/api/chats', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (createRes.ok) {
            const created = await createRes.json();
            setCurrentChatId(created.id);
            setChats([{ id: created.id, title: created.title, created_at: created.created_at, updated_at: created.updated_at }]);
          }
        }
      } catch (err) {
        console.error('Failed to load chats', err);
      } finally {
        setChatsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when idToken changes; avoid overwriting currentChatId on re-run
  }, [idToken]);

  // When currentChatId changes, load history for that chat
  useEffect(() => {
    if (!idToken || !currentChatId) {
      if (!currentChatId && idToken) setMessages([]);
      return;
    }
    // Clear messages immediately so UI shows we're switching (then load below)
    setMessages([]);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/history/${currentChatId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (cancelled) return;
        if (!res.ok) {
          setMessages([]);
          return;
        }
        const history: { sender: string; text: string }[] = await res.json();
        if (cancelled) return;
        const mapped = history.map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text,
        }));
        setMessages(mapped);
        // Show conversation view (not welcome) when we have history
        if (mapped.length > 0) setIsActive(true);
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [idToken, currentChatId]);

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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      let sessionId: string;
      if (idToken) {
        if (currentChatId) {
          sessionId = currentChatId;
        } else {
          // Chats still loading or none yet: create a chat now so this message has a thread
          const createRes = await fetch('/api/chats', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (!createRes.ok) {
            sessionId = getSubFromIdToken(idToken) || 'demo_session';
          } else {
            const created = await createRes.json();
            setCurrentChatId(created.id);
            setChats((prev) => [{ id: created.id, title: created.title, created_at: created.created_at, updated_at: created.updated_at }, ...prev]);
            sessionId = created.id;
          }
        }
      } else {
        sessionId = 'demo_session';
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: messageText, session_id: sessionId }),
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
      // Refresh chats so sidebar shows updated title (e.g. first message)
      if (idToken && res.ok) {
        try {
          const chatsRes = await fetch('/api/chats', { headers: { Authorization: `Bearer ${idToken}` } });
          if (chatsRes.ok) {
            const list: ChatListItem[] = await chatsRes.json();
            setChats(list);
          }
        } catch {
          // ignore
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
  }, [input, viewMode, mode, setRightPanelOpen, idToken, currentChatId]);

  // Handle new chat: create new conversation and switch to it
  const handleNewChat = useCallback(async () => {
    if (!idToken) {
      setMessages([]);
      setIsActive(false);
      setViewMode('response');
      setInput('');
      return;
    }
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const created = await res.json();
        setCurrentChatId(created.id);
        setChats((prev) => [{ id: created.id, title: created.title, created_at: created.created_at, updated_at: created.updated_at }, ...prev]);
        setMessages([]);
        setIsActive(false);
        setViewMode('response');
        setInput('');
      }
    } catch (err) {
      console.error('Failed to create new chat', err);
    }
  }, [idToken]);

  // When user selects a chat in the sidebar, switch to it (history loads in useEffect)
  const handleSelectChat = useCallback((id: string) => {
    setCurrentChatId(id);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  // Not signed in: show landing page (or "Signing you in..." when exchanging code).
  if (!idToken) {
    return (
      <LandingPage
        onSignIn={handleLogin}
        isExchanging={isExchanging}
      />
    );
  }

  // Signed in: show full app.
  return (
    <ThreePanelLayout
      viewMode={viewMode}
      analysisContent={<AnalysisContent graphData={graphData} bioAgeMetrics={bioAgeMetrics} />}
      solutionContent={<SolutionContent />}
      onNewChat={handleNewChat}
      chats={chatsLoading ? [] : chats}
      currentChatId={currentChatId}
      onSelectChat={handleSelectChat}
    >
      <div className="flex justify-end mt-4 mb-4 pr-6 gap-2">
        <button
          onClick={handleLogout}
          className="rounded-full border border-emerald-500 px-6 py-2 text-sm font-semibold text-emerald-500 hover:bg-emerald-500/10 shadow-md"
        >
          Log out
        </button>
      </div>
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

// Main component (ThemeProvider is in root layout)
export default function MeOApp() {
  return <MeOAppInner />;
}
