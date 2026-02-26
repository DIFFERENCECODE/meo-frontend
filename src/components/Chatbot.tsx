'use client';

import { useState, useEffect, FormEvent, useRef, KeyboardEvent } from 'react';
import styles from './Chatbot.module.css';
import { postChatMessage } from '../app/lib/api';
import { Message, Source } from '../app/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from 'react-oidc-context';

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

const SUGGESTIONS = [
  { prompt: 'What is metabolic health?', subtitle: 'Get a clear explanation of the basics' },
  { prompt: 'How can I improve my insulin sensitivity?', subtitle: 'Evidence-based diet & lifestyle tips' },
  { prompt: 'What are my key metabolic markers?', subtitle: 'Understand what to track and why' },
  { prompt: 'Create a metabolic health protocol for me', subtitle: 'Get a personalized action plan' },
];

function truncateTitle(text: string, max = 36): string {
  const clean = text.trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

export default function Chatbot() {
  const auth = useAuth();
  const userEmail = auth.user?.profile?.email as string | undefined;
  const userLabel = userEmail ?? 'MeO User';
  const userInitial = userLabel.charAt(0).toUpperCase();

  const signOut = () => {
    const clientId = '4qsgmdorsa5dj0b974quqg47ep';
    const cognitoDomain = 'https://eu-north-19zg2hxlti.auth.eu-north-1.amazoncognito.com';
    // Use exact origin (no trailing slash) — must match Cognito "Allowed sign-out URLs" exactly
    const logoutUri = window.location.origin.replace(/\/$/, '');
    auth.removeUser(); // clear local OIDC state
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Derive a stable session_id from the logged-in user's email, falling back to a UUID
    const stored = localStorage.getItem('meo-session-id');
    const id = userEmail
      ? `user-${userEmail.replace(/[^a-z0-9]/gi, '_')}`
      : stored || crypto.randomUUID();
    setSessionId(id);
    localStorage.setItem('meo-session-id', id);

    // Load previous chat history from the database
    fetch(`/api/history/${encodeURIComponent(id)}`)
      .then(res => res.ok ? res.json() : [])
      .then((history: { sender: string; text: string }[]) => {
        if (history.length > 0) {
          const restoredConv = {
            id: id,
            title: truncateTitle(history.find(m => m.sender === 'user')?.text ?? 'Previous conversation'),
            messages: history.map(m => ({
              text: m.text,
              sender: m.sender === 'user' ? 'user' as const : 'meo' as const,
            })),
          };
          setConversations([restoredConv]);
          setActiveConvId(id);
        }
      })
      .catch(() => { }); // silently ignore if history load fails

    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [userEmail]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, isLoading]);

  const activeConversation = conversations.find(c => c.id === activeConvId) ?? null;
  const activeMessages = activeConversation?.messages ?? [];

  const createNewChat = () => {
    setActiveConvId(null);
    setInput('');
    if (isMobile) setSidebarOpen(false);
  };

  const selectConversation = (id: string) => {
    setActiveConvId(id);
    if (isMobile) setSidebarOpen(false);
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let convId = activeConvId;
    const userMsg: Message = { text: text.trim(), sender: 'user' };

    if (!convId) {
      convId = crypto.randomUUID();
      const newConv: Conversation = {
        id: convId,
        title: truncateTitle(text),
        messages: [userMsg],
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(convId);
    } else {
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, userMsg] } : c)
      );
    }

    setIsLoading(true);
    try {
      const data = await postChatMessage(text.trim(), sessionId);
      const meoMsg: Message = {
        text: data.response || 'No response received.',
        sender: 'meo',
        sources: data.retrieved_sources || [],
        mode: data.mode,
      };
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, meoMsg] } : c)
      );
    } catch {
      const errMsg: Message = {
        text: 'Sorry, I am having trouble connecting. Please try again.',
        sender: 'meo',
      };
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, errMsg] } : c)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const renderSource = (source: Source, idx: number) => (
    <li key={idx} className={styles.sourceItem}>
      <span className={styles.sourceItemTitle}>{source.title}</span>
      {source.category && <span className={styles.sourceItemMeta}> · {source.category}</span>}
      {source.price && <span className={styles.sourceItemMeta}> · {source.price}</span>}
      {source.url && (
        <a href={source.url} className={styles.sourceItemLink} target="_blank" rel="noopener noreferrer">
          {' '}↗
        </a>
      )}
    </li>
  );

  const renderMessage = (msg: Message, i: number) => (
    <div key={i} className={`${styles.messageRow} ${msg.sender === 'user' ? styles.user : styles.meo}`}>
      <div className={`${styles.messageAvatar} ${msg.sender === 'user' ? styles.userAvatar : styles.meoAvatar}`}>
        {msg.sender === 'user' ? 'Y' : 'M'}
      </div>
      <div className={styles.messageBubble}>
        {msg.sender === 'meo' ? (
          <div className={styles.markdownProse}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.text}
            </ReactMarkdown>
          </div>
        ) : (
          msg.text
        )}
        {msg.sender === 'meo' && msg.sources && msg.sources.length > 0 && (
          <div className={styles.sourcesContainer}>
            <div className={styles.sourcesTitle}>Sources</div>
            <ul className={styles.sourcesList}>
              {msg.sources.map((s, i) => renderSource(s, i))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  // Hamburger icon
  const HamburgerIcon = () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  return (
    <div className={styles.appShell}>

      {/* Mobile overlay: clicking it closes the sidebar */}
      {isMobile && sidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ======= SIDEBAR ======= */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.collapsed}`}>
        <div className={styles.sidebarHeader}>
          {/* Menu icon inside sidebar header (closes it on click) */}
          <button className={styles.menuToggleBtn} onClick={toggleSidebar} title="Close sidebar">
            <HamburgerIcon />
          </button>
          <button className={styles.newChatBtn} onClick={createNewChat}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>
        </div>

        <div className={styles.sidebarSection}>
          {conversations.length === 0 ? (
            <p className={styles.sidebarSectionTitle}>No chats yet</p>
          ) : (
            <>
              <p className={styles.sidebarSectionTitle}>Today</p>
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  className={`${styles.historyItem} ${conv.id === activeConvId ? styles.active : ''}`}
                  onClick={() => selectConversation(conv.id)}
                  title={conv.title}
                >
                  <svg className={styles.historyIcon} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className={styles.historyItemText}>{conv.title}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className={styles.sidebarFooter}>
          <button className={styles.userProfileBtn}>
            <div className={styles.avatar}>{userInitial}</div>
            <span className={styles.historyItemText} title={userLabel}>{userLabel}</span>
          </button>
          <button
            className={styles.signOutBtn}
            onClick={signOut}
            title="Sign out"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ======= MAIN AREA ======= */}
      <main className={styles.mainArea}>

        {/* Top Bar */}
        <div className={styles.topBar}>
          {/* Hamburger always visible — opens sidebar */}
          {!sidebarOpen && (
            <button className={styles.menuToggleBtn} onClick={toggleSidebar} title="Open sidebar">
              <HamburgerIcon />
            </button>
          )}
          <button className={styles.modelSelector}>
            MeO
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Welcome or Chat */}
        {activeMessages.length === 0 ? (
          <div className={styles.welcomeScreen}>
            <div className={styles.welcomeLogo}>M</div>
            <h1 className={styles.welcomeTitle}>How can I help you today?</h1>
            <p className={styles.welcomeSubtitle}>
              Your metabolic health AI assistant — ask me anything about nutrition, energy, and metabolic optimization.
            </p>
            <div className={styles.suggestionGrid}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className={styles.suggestionCard} onClick={() => sendMessage(s.prompt)}>
                  <strong>{s.prompt}</strong>
                  {s.subtitle}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.chatArea}>
            {activeMessages.map((msg, i) => renderMessage(msg, i))}
            {isLoading && (
              <div className={styles.typingRow}>
                <div className={`${styles.messageAvatar} ${styles.meoAvatar}`}>M</div>
                <div className={styles.typingDots}>
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Input */}
        <div className={styles.inputArea}>
          <form onSubmit={handleSubmit}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={textareaRef}
                className={styles.chatInput}
                placeholder="Ask anything about metabolic health..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onInput={handleTextareaInput}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isLoading}
              />
              <button type="submit" className={styles.sendBtn} disabled={!input.trim() || isLoading} title="Send">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <p className={styles.inputFootnote}>
              MeO can make mistakes. Always verify important health information with a professional.
            </p>
          </form>
        </div>

      </main>
    </div>
  );
}