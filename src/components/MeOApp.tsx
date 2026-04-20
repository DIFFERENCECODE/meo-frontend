'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { ChatPanel, Message } from '@/components/layout/ChatPanel';
import type { ChatListItem } from '@/components/layout/LeftPanel';
import { AnalysisContent } from '@/components/analysis/AnalysisContent';
import { SolutionContent } from '@/components/solution/SolutionContent';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getLoginUrl, getLogoutUrl, exchangeCodeForTokens, storeIdToken, getIdToken, clearIdToken, getSubFromIdToken, storeRefreshToken, getValidIdToken } from '@/app/lib/auth';
import LandingPage from '@/components/LandingPage';

// Types re-exported from chat panel
export type { Message };

// Inner component that uses the theme context
function MeOAppInner() {
  const { theme, mode, setRightPanelOpen, setVendor, setUserRole } = useTheme();

  // Chat state
  const [isActive, setIsActive] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'response' | 'analysis' | 'solution'>('response');
  // Auth: initialize from localStorage synchronously to prevent flash
  const [idToken, setIdToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('meo_id_token');
  });
  const [isExchanging, setIsExchanging] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  // Sidebar: list of user's chats and current conversation
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatsLoading, setChatsLoading] = useState(false);
  
  // Graph data state — populated from chat's retrieved_sources for the
  // Kraft curve. Bio Age metrics are no longer derived here: the Analysis
  // panel's ScoreGauges component fetches /api/scores/* directly.
  const [graphData, setGraphData] = useState<any[]>([]);
  // Vendor cards from RAG — populated when backend returns solution mode
  const [vendorCards, setVendorCards] = useState<any[]>([]);

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
    if (idToken) {
      setAuthChecked(true);
      return;
    }
    if (typeof window === 'undefined') {
      setAuthChecked(true);
      return;
    }
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) {
      setAuthChecked(true);
      return;
    }

    setIsExchanging(true);
    (async () => {
      try {
        const tokens = await exchangeCodeForTokens(code);
        storeIdToken(tokens.id_token);
        if (tokens.refresh_token) storeRefreshToken(tokens.refresh_token);
        setIdToken(tokens.id_token);
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.toString());
      } catch (err) {
        console.error('Failed to exchange Cognito code for tokens', err);
      } finally {
        setIsExchanging(false);
        setAuthChecked(true);
      }
    })();
  }, []);

  // Background token refresh — fires every 5 minutes while signed in.
  // Cognito ID tokens expire after 1 hour; refreshing every 5 min keeps the
  // session alive forever as long as the refresh_token is valid (~30 days).
  useEffect(() => {
    if (!idToken) return;
    const intervalId = setInterval(async () => {
      try {
        const fresh = await getValidIdToken();
        if (fresh && fresh !== idToken) {
          setIdToken(fresh);
        }
      } catch {}
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(intervalId);
  }, [idToken]);

  // When signed in, load profile and sync vendor from backend
  useEffect(() => {
    if (!idToken) return;
    (async () => {
      const token = (await getValidIdToken()) || idToken;
      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.vendor_id && (data.vendor_id === 'meterbolic' || data.vendor_id === 'eos')) {
          setVendor(data.vendor_id);
        }
        if (data?.role) {
          setUserRole(data.role);
        }
      } catch {}
    })();
  }, [idToken]);

  // When signed in, load chats and ensure we have a current chat
  useEffect(() => {
    if (!idToken) return;
    setChatsLoading(true);
    (async () => {
      const token = (await getValidIdToken()) || idToken;
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
        const token = (await getValidIdToken()) || idToken;
        const res = await fetch(`/api/history/${currentChatId}`, {
          headers: { Authorization: `Bearer ${token}` },
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
      // Always get a fresh token before making API calls
      const freshToken = idToken ? (await getValidIdToken()) || idToken : null;
      if (freshToken && freshToken !== idToken) {
        setIdToken(freshToken);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
      }

      let sessionId: string;
      if (freshToken) {
        if (currentChatId) {
          sessionId = currentChatId;
        } else {
          // Chats still loading or none yet: create a chat now so this message has a thread
          const createRes = await fetch('/api/chats', {
            method: 'POST',
            headers: { Authorization: `Bearer ${freshToken}` },
          });
          if (!createRes.ok) {
            sessionId = getSubFromIdToken(freshToken) || 'demo_session';
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

      // Carry the agent's trace (tool calls, retrievals, analysis steps)
      // through to the assistant bubble so ThinkingTrace can render it
      // as a collapsible "Thinking..." section above the markdown body.
      const steps = Array.isArray(data.steps) ? data.steps : undefined;

      setMessages((prev) => [...prev, { role: 'assistant', content: botResponse, steps }]);

      // Set view mode based on backend or frontend detection
      const finalMode = data.mode || intendedMode;
      if (finalMode !== 'response') {
        setViewMode(finalMode);
        // Auto-open right panel for analysis/solution (always — overrides practitioner)
        setRightPanelOpen(true);
      }

      // Process graph data for analysis mode
      if (finalMode === 'analysis') {
        const retrievedSources = data.retrieved_sources || [];
        const graphDataParsed = extractGraphData(retrievedSources);

        if (graphDataParsed) {
          if (graphDataParsed.kraft_curve_data?.length > 0) {
            const transformed = transformKraftForChart(graphDataParsed.kraft_curve_data);
            setGraphData(transformed);
          }
          // Fallback: if the chat returned raw measurements but no Kraft
          // curve, derive chart points from glucose/insulin entries.
          if (graphDataParsed.measurements?.length > 0 &&
              (!graphDataParsed.kraft_curve_data?.length)) {
            const glucoseEntries = graphDataParsed.measurements
              .filter((m: any) => m.name === 'Glucose' && m.unit === 'mMol')
              .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
            const insulinEntries = graphDataParsed.measurements
              .filter((m: any) => m.name === 'Insulin' && m.unit === '\u00b5IU/ml')
              .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

            if (glucoseEntries.length > 0 || insulinEntries.length > 0) {
              const chartData = glucoseEntries.slice(0, 20).map((g: any, i: number) => ({
                time: new Date(g.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                glucose: g.value,
                insulin: insulinEntries[i]?.value ?? 0,
              }));
              if (chartData.length > 0) setGraphData(chartData);
            }
          }
        }
      }
      // Extract vendor cards for solution mode
      if (finalMode === 'solution') {
        const retrievedSources = data.retrieved_sources || [];
        const vendors = retrievedSources
          .filter((s: any) => s.type === 'vendor_card')
          .map((s: any, i: number) => ({
            id: String(i + 1),
            name: s.title || 'Unknown',
            category: s.category || 'General',
            description: s.gap_solved || s.content || '',
            price: s.price || '',
            location: s.location || '',
            tags: s.category ? [s.category] : [],
            available: true,
            url: s.url || null,
            score: s.score || null,
          }));
        if (vendors.length > 0) {
          setVendorCards(vendors);
        }
      }
      // Refresh chats so sidebar shows updated title (e.g. first message)
      if (freshToken && res.ok) {
        try {
          const chatsRes = await fetch('/api/chats', { headers: { Authorization: `Bearer ${freshToken}` } });
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
      const token = (await getValidIdToken()) || idToken;
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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

  // Show loading screen while checking auth (prevents flash of landing page on refresh)
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.colors.background }}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full animate-spin" style={{ background: theme.colors.primary }}>
            <span className="text-2xl font-bold" style={{ color: theme.colors.primaryForeground }}>M</span>
          </div>
          <p className="text-sm animate-pulse" style={{ color: theme.colors.muted }}>Loading...</p>
        </div>
      </div>
    );
  }

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
      analysisContent={<ErrorBoundary name="Analysis"><AnalysisContent graphData={graphData} /></ErrorBoundary>}
      solutionContent={<ErrorBoundary name="Solutions"><SolutionContent vendors={vendorCards} /></ErrorBoundary>}
      onCloseRightPanel={() => setViewMode('response')}
      onNewChat={handleNewChat}
      chats={chatsLoading ? [] : chats}
      currentChatId={currentChatId}
      onSelectChat={handleSelectChat}
    >
      <div className="flex justify-end mt-4 mb-4 pr-20 gap-2">
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
