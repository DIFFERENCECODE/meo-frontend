'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { ChatPanel, Message } from '@/components/layout/ChatPanel';
import type { ChatListItem } from '@/components/layout/LeftPanel';
import { useLanguage, useTranslation } from '@/i18n/LanguageContext';
import { AnalysisContent } from '@/components/analysis/AnalysisContent';
import { SolutionContent } from '@/components/solution/SolutionContent';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getLoginUrl, getLogoutUrl, exchangeCodeForTokens, storeIdToken, getIdToken, clearIdToken, getSubFromIdToken, storeRefreshToken, getValidIdToken, apiFetch } from '@/app/lib/auth';
import LandingPage from '@/components/LandingPage';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { ProtocolPanel, BAS_STATES, KRAFT_STATES, KRAFT_LEGACY_STATES } from '@/components/layout/ProtocolPanel';

const ALL_PROTOCOL_STATES = [...BAS_STATES, ...KRAFT_STATES, ...KRAFT_LEGACY_STATES] as readonly string[];
import { AnimatePresence } from 'motion/react';
import { ProductTour } from '@/components/tour/ProductTour';
import { useTour } from '@/hooks/useTour';

function normalizeProtocolState(state: string | null | undefined): string | null {
  if (!state) return null;
  const normalized = state.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

// Types re-exported from chat panel
export type { Message };

// Inner component that uses the theme context
function MeOAppInner() {
  const { theme, colors, mode, setRightPanelOpen, setVendor, setUserRole } = useTheme();
  const { run: tourRun, markSeen: markTourSeen, resetTour } = useTour();
  const { isLeftPanelOpen, toggleLeftPanel } = useTheme();
  const router = useRouter();
  // Tracks chats we just created in handleSendMessage — skip history load
  // for these so the optimistic user message doesn't get cleared.
  const skipHistoryLoadRef = useRef<string | null>(null);

  // Chat state
  const [isActive, setIsActive] = useState(false);
  const [input, setInput] = useState('');
  // Global chat language — backed by LanguageContext so the same
  // selection drives the sidebar's picker, the chat input's picker,
  // the voice-input locale, and the user_language field we send to
  // chatbot-rag. No more multiple sources of truth.
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
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
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  // Sidebar: list of user's chats and current conversation
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatsLoading, setChatsLoading] = useState(false);

  // Library panel open state — shared between LeftPanel (button) and ChatPanel (drawer)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Protocol mode — set from backend's done event protocol_state field
  const [protocolState, setProtocolState] = useState<string | null>(null);
  const isProtocolActive = protocolState !== null && ALL_PROTOCOL_STATES.includes(protocolState);

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

  const handleAuthenticated = (token: string, refreshToken: string) => {
    storeIdToken(token);
    if (refreshToken) storeRefreshToken(refreshToken);
    setIdToken(token);
    setAuthChecked(true);
  };

  const handleLogout = () => {
    clearIdToken();
    setIdToken(null);
    window.location.replace(window.location.origin);
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
      } catch { }
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(intervalId);
  }, [idToken]);

  // When signed in, load profile and sync vendor/role from backend.
  useEffect(() => {
    if (!idToken) { setProfileLoaded(true); return; }
    (async () => {
      try {
        const res = await apiFetch('/api/profile');
        if (!res.ok) { setProfileLoaded(true); return; }
        const data = await res.json();
        if (data?.vendor_id && (data.vendor_id === 'meterbolic' || data.vendor_id === 'eos')) {
          setVendor(data.vendor_id);
        }
        if (data?.role) {
          setUserRole(data.role);
          setProfileRole(data.role);
        }
      } catch { }
      setProfileLoaded(true);
    })();
  }, [idToken]);

  // When signed in, load chats and ensure we have a current chat
  useEffect(() => {
    if (!idToken) return;
    setChatsLoading(true);
    (async () => {
      try {
        const res = await apiFetch('/api/chats');
        if (!res.ok) {
          setChatsLoading(false);
          return;
        }
        const list: ChatListItem[] = await res.json();
        setChats(list);
        if (list.length > 0 && !currentChatId) {
          setCurrentChatId(list[0].id);
        } else if (list.length === 0) {
          const createRes = await apiFetch('/api/chats', { method: 'POST' });
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

  // Ensure left panel is open before the product tour starts so
  // [data-tour="marketplace-nav"] in the expanded panel is in DOM.
  useEffect(() => {
    if (tourRun && !isLeftPanelOpen) toggleLeftPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourRun]);

  // When currentChatId changes, load history for that chat
  useEffect(() => {
    if (!idToken || !currentChatId) {
      if (!currentChatId && idToken) setMessages([]);
      return;
    }
    // Skip history load for chats we just created inside handleSendMessage.
    // The optimistic user message is already in state; loading history would
    // clear it since the chat has no messages yet.
    if (skipHistoryLoadRef.current === currentChatId) {
      skipHistoryLoadRef.current = null;
      return;
    }
    // Clear messages immediately so UI shows we're switching (then load below)
    setMessages([]);
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/history/${currentChatId}`);
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

    const shouldStartKraftProtocol =
      /\b(start|begin|start the|begin the)\s+kraft\b/.test(lowerMessage) ||
      /\bkraft\s+test\b/.test(lowerMessage) ||
      /\brun\s+the\s+kraft\s+test\b/.test(lowerMessage);

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
            // Mark this chat so the history useEffect doesn't clear our
            // optimistic user message (the chat has no history yet).
            skipHistoryLoadRef.current = created.id;
            setCurrentChatId(created.id);
            setChats((prev) => [{ id: created.id, title: created.title, created_at: created.created_at, updated_at: created.updated_at }, ...prev]);
            sessionId = created.id;
          }
        }
      } else {
        sessionId = 'demo_session';
      }
      // Streaming chat — reasoning deltas go into a live "generation"
      // step in the assistant's ThinkingTrace; content deltas append to
      // the assistant bubble as they arrive. We append an empty
      // assistant message up-front and mutate it as chunks stream in.
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { ...headers, Accept: 'text/event-stream' },
        body: JSON.stringify({ message: messageText, session_id: sessionId, user_language: language }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`stream error: ${res.status}`);
      }

      // Seed the assistant message with a live "Thinking..." step so
      // the user sees activity immediately, before the first token
      // arrives. The step's details field is populated by reasoning
      // deltas; once content deltas begin we know generation proper
      // has started.
      const liveGenStep: NonNullable<Message['steps']>[number] = {
        kind: 'generation',
        title: t('chat.thinking_live'),
        details: '',
      };
      const assistantMsgIndex = messages.length + 1;  // after the user msg added above
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', steps: [liveGenStep] },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let mode: string | null = null;
      let finalSteps: Message['steps'] | undefined;
      let botResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // Split on SSE event boundaries (blank line). Keep the trailing
        // partial event in `buf` for the next read.
        const events = buf.split('\n\n');
        buf = events.pop() || '';
        for (const raw of events) {
          const line = raw.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          let payload: any;
          try {
            payload = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (payload.phase === 'reasoning' && typeof payload.delta === 'string') {
            setMessages((prev) => {
              const next = [...prev];
              const idx = next.length - 1;
              const m = next[idx];
              const existing = m.steps?.[0] ?? liveGenStep;
              const updatedStep = { ...existing, details: (existing.details || '') + payload.delta };
              next[idx] = { ...m, steps: [updatedStep] };
              return next;
            });
          } else if (payload.phase === 'content' && typeof payload.delta === 'string') {
            botResponse += payload.delta;
            setMessages((prev) => {
              const next = [...prev];
              const idx = next.length - 1;
              const m = next[idx];
              // Flip the live step's title from "Thinking…" to the
              // finalised label the first time a content token lands.
              const steps = m.steps ?? [];
              const s0 = steps[0];
              const finalisedSteps =
                s0 && (s0.title === 'Thinking…' || s0.title === t('chat.thinking_live'))
                  ? [{ ...s0, title: t('chat.reasoning_complete') }, ...steps.slice(1)]
                  : steps;
              next[idx] = { ...m, content: (m.content || '') + payload.delta, steps: finalisedSteps };
              return next;
            });
          } else if (payload.phase === 'done') {
            mode = payload.mode || null;
            finalSteps = Array.isArray(payload.steps) ? payload.steps : undefined;
            if (payload.user_role) setUserRole(payload.user_role);
            if (payload.is_new_user !== undefined) setIsNewUser(Boolean(payload.is_new_user));
            if (payload.protocol_state && ALL_PROTOCOL_STATES.includes(payload.protocol_state)) {
              // Terminal states (complete screens) must only open the panel the first
              // time they fire. If the user has already dismissed the panel (prev === null)
              // and the backend re-fires the same terminal state on a follow-up message,
              // we must NOT re-open the panel.
              const TERMINAL = new Set(['bas_complete', 'complete', 'kraft_complete']);
              setProtocolState((prev) =>
                TERMINAL.has(payload.protocol_state) && prev === null ? null : payload.protocol_state
              );
            } else if (payload.protocol_state === 'idle') {
              setProtocolState(null);
            } else if (shouldStartKraftProtocol) {
              setProtocolState('fasting');
            }
          } else if (payload.phase === 'error') {
            console.error('[stream] upstream error', payload.message);
          }
        }
      }

      // Replace our ad-hoc step list with the authoritative one the
      // server emits in the `done` event. This is what future renders
      // of the conversation (after a page reload) will also see.
      if (finalSteps) {
        setMessages((prev) => {
          const next = [...prev];
          const idx = next.length - 1;
          next[idx] = { ...next[idx], steps: finalSteps };
          return next;
        });
      }

      const data: any = { response: botResponse, mode, retrieved_sources: [] };
      // Placeholder keeping the downstream analysis/solution code below
      // unchanged — graph data isn't streamed today; a follow-up can
      // include it in the `done` event if we want inline charts.
      void assistantMsgIndex;

      // Set view mode based on backend or frontend detection.
      // NOTE: we deliberately do NOT auto-open the right panel any more.
      // The supervisor classifies most measurement-adjacent questions as
      // CLINICAL_QUERY → mode "analysis", which popped the drawer open
      // on every turn and felt noisy. Users can click the right-panel
      // toggle when they want the charts; viewMode still drives what
      // renders INSIDE the panel when they open it.
      const finalMode = data.mode || intendedMode;
      if (finalMode !== 'response') {
        setViewMode(finalMode);
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

  // After /personalise submits data, it redirects to /?newChat=1.
  // This effect fires once profile is loaded, creates a fresh chat,
  // cleans the URL, and shows a toast so the user knows to ask MeO about their data.
  useEffect(() => {
    if (!profileLoaded || !idToken) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('newChat') !== '1') return;
    window.history.replaceState({}, '', '/');
    handleNewChat().then(() => {
      toast.success('Your data is in — ask MeO what it means.', { duration: 5000 });
    });
  }, [profileLoaded, idToken]);

  // Show loading screen while checking auth (prevents flash of landing page on refresh)
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full animate-spin" style={{ background: colors.primary }}>
            <span className="text-2xl font-bold" style={{ color: colors.primaryForeground }}>M</span>
          </div>
          <p className="text-sm animate-pulse" style={{ color: colors.muted }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Not signed in: show landing page (or "Signing you in..." when exchanging code).
  if (!idToken) {
    return (
      <LandingPage
        onAuthenticated={handleAuthenticated}
        isExchanging={isExchanging}
      />
    );
  }

  // Wait for profile to load before routing by role
  if (!profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full animate-spin" style={{ background: colors.primary }}>
          <span className="text-2xl font-bold" style={{ color: colors.primaryForeground }}>M</span>
        </div>
      </div>
    );
  }

  // Clinician application pending payment
  if (profileRole === 'clinician_pending') {
    const handleSubscribeNow = async () => {
      try {
        const res = await apiFetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: 'clinician' }),
        });
        if (!res.ok) throw new Error('checkout failed');
        const { url } = await res.json();
        if (url) window.location.href = url;
      } catch {
        // fall through — user will try again
      }
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: colors.background }}>
        <div className="max-w-sm w-full text-center space-y-5 rounded-2xl p-8"
          style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: `${colors.primary}18` }}>
            <span className="text-3xl">🩺</span>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: colors.foreground }}>One step left</h2>
            <p className="text-sm mt-2" style={{ color: colors.muted }}>
              Your application has been received. Complete your £99/month subscription to unlock the Clinician Portal instantly.
            </p>
          </div>
          <button
            onClick={handleSubscribeNow}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: colors.primary, color: colors.primaryForeground }}
          >
            Subscribe & Activate — £99/month
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${colors.cardBorder}`, color: colors.muted }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Approved clinician → redirect to clinician portal
  if (profileRole === 'clinician') {
    router.replace('/clinician');
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full animate-spin" style={{ background: colors.primary }}>
          <span className="text-2xl font-bold" style={{ color: colors.primaryForeground }}>M</span>
        </div>
      </div>
    );
  }

  // Redirect to onboarding if not yet completed (patients only)
  if (typeof window !== 'undefined' && !localStorage.getItem('meo_onboarding_v1')) {
    router.push('/onboarding');
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full animate-spin" style={{ background: colors.primary }}>
          <span className="text-2xl font-bold" style={{ color: colors.primaryForeground }}>M</span>
        </div>
      </div>
    );
  }

  // Signed in: show full app.
  return (
    <>
      <ProductTour run={tourRun} onFinish={markTourSeen} />
      <ThreePanelLayout
        viewMode={viewMode}
        analysisContent={<ErrorBoundary name="Analysis"><AnalysisContent graphData={graphData} /></ErrorBoundary>}
        solutionContent={<ErrorBoundary name="Solutions"><SolutionContent vendors={vendorCards} /></ErrorBoundary>}
        onCloseRightPanel={() => setViewMode('response')}
        onLibraryOpen={() => setIsLibraryOpen(true)}
        onStartTour={resetTour}
        onNewChat={handleNewChat}
        chats={chats}
        chatsLoading={chatsLoading}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={async (id) => {
          // Optimistic remove from the sidebar; if the DELETE fails
          // we pull a fresh list from the backend and surface a toast.
          const deletedTitle = chats.find((c) => c.id === id)?.title;
          setChats((prev) => prev.filter((c) => c.id !== id));
          if (currentChatId === id) {
            setCurrentChatId(null);
            setMessages([]);
            setIsActive(false);
          }
          try {
            const res = await apiFetch(`/api/chats/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`status ${res.status}`);
            toast.success(
              deletedTitle
                ? t('chat.delete_success', { title: deletedTitle })
                : t('chat.delete_default_success'),
            );
          } catch (err) {
            console.error('Failed to delete chat', err);
            toast.error(t('chat.delete_failure'));
            const resync = await apiFetch('/api/chats');
            if (resync.ok) setChats(await resync.json());
          }
        }}
      >
        <div className="relative flex-1 flex flex-col h-full overflow-hidden">
          <ChatPanel
            messages={messages}
            input={input}
            loading={loading}
            isActive={isActive}
            onInputChange={setInput}
            onSendMessage={handleSendMessage}
            onRefresh={handleRefresh}
            language={language}
            onLanguageChange={setLanguage}
            isNewUser={isNewUser}
            isLibraryOpen={isLibraryOpen}
            onLibraryOpen={() => setIsLibraryOpen(true)}
            onLibraryClose={() => setIsLibraryOpen(false)}
          />
          <AnimatePresence>
            {isProtocolActive && protocolState && (
              <ProtocolPanel
                protocolState={protocolState}
                onSubmit={(msg) => handleSendMessage(undefined, msg)}
                onExit={() => setProtocolState(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </ThreePanelLayout>
    </>
  );
}

// Main component (ThemeProvider is in root layout)
export default function MeOApp() {
  return <MeOAppInner />;
}
