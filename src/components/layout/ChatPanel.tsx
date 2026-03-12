'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, SlidersHorizontal, FlaskConical, ChevronDown, Mic } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Types
export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// Blood Droplet SVG Component
function BloodDroplet({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" style={style}>
      <path d="M12 2C12 2 5 10 5 15C5 19.4183 8.13401 23 12 23C15.866 23 19 19.4183 19 15C19 10 12 2 12 2Z" />
    </svg>
  );
}

// Eos Logo - Dawn-inspired rising sun
function EosSunLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <linearGradient id="dawnGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* Semi-circle sun */}
      <path 
        d="M4 18 C4 12 8 6 12 6 C16 6 20 12 20 18" 
        stroke="url(#dawnGradient)" 
        strokeWidth="2" 
        fill="none"
      />
      {/* Sun rays */}
      <line x1="12" y1="2" x2="12" y2="4" stroke="url(#dawnGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="5" x2="6.5" y2="6.5" stroke="url(#dawnGradient)" strokeWidth="2" strokeLinecap="round" />
      <line x1="19" y1="5" x2="17.5" y2="6.5" stroke="url(#dawnGradient)" strokeWidth="2" strokeLinecap="round" />
      {/* Horizon line */}
      <line x1="2" y1="18" x2="22" y2="18" stroke="url(#dawnGradient)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Logo({ 
  size = 'large', 
  onClick,
  vendor = 'meterbolic'
}: { 
  size?: 'large' | 'small'; 
  onClick?: () => void;
  vendor?: 'meterbolic' | 'eos';
}) {
  const { theme, colors } = useTheme();
  
  const content = (
    <>
      <span 
        className={cn(
          "font-bold",
          size === 'large' ? "text-5xl" : "text-xl"
        )}
        style={{ color: colors.foreground }}
      >
        {vendor === 'eos' ? 'MeO for Eos' : 'Me'}
      </span>
      {vendor === 'meterbolic' && (
        <BloodDroplet 
          className={cn(
            size === 'large' ? "w-10 h-10 mt-1" : "w-5 h-5"
          )}
          style={{ color: colors.primary }}
        />
      )}
      {vendor === 'eos' && (
        <EosSunLogo 
          className={cn(
            size === 'large' ? "w-10 h-10 ml-2" : "w-5 h-5 ml-1"
          )}
        />
      )}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="flex items-center gap-0 hover:opacity-80 transition-opacity">
        {content}
      </button>
    );
  }

  return <div className="flex items-center gap-0">{content}</div>;
}

interface ChatPanelProps {
  messages: Message[];
  input: string;
  loading: boolean;
  isActive: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (e?: React.FormEvent, prefill?: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export function ChatPanel({
  messages,
  input,
  loading,
  isActive,
  onInputChange,
  onSendMessage,
  onRefresh,
  className,
}: ChatPanelProps) {
  const { theme, colors, vendor, isLeftPanelOpen, isRightPanelOpen } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(e);
    }
  };

  const handleActionClick = (text: string) => {
    onSendMessage(undefined, text);
  };

  const handleToolClick = (tool: string) => {
    setIsToolsOpen(false);
    // Handle tool selection
    if (tool === 'protocol') {
      handleActionClick('Enter Protocol Mode');
    }
  };

  // Example queries for metabolic health
  const exampleQueries = [
    "Why do I feel tired after eating?",
    "What does my glucose pattern mean?",
    "How can I improve my metabolic score?",
  ];

  // Initial state - centered search view
  if (!isActive) {
    return (
      <div
        className={cn('flex-1 flex items-center justify-center p-4', className)}
        style={{
          background: `linear-gradient(180deg, ${colors.backgroundGradientStart} 0%, ${colors.backgroundGradientMid} 40%, ${colors.backgroundGradientEnd} 100%)`,
        }}
      >
        <div className="w-full max-w-2xl mx-auto">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Logo size="large" onClick={onRefresh} vendor={vendor} />
            </div>
            <p style={{ color: colors.muted }} className="text-lg">
              {theme.tagline}
            </p>
          </div>

          {/* Search Input with Tools - Gemini style */}
          <div className="space-y-4">
            <div 
              className="relative rounded-2xl border shadow-lg"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              }}
            >
              {/* Input area */}
              <form onSubmit={onSendMessage}>
                <input
                  type="text"
                  placeholder="Ask a question about metabolic health..."
                  className="w-full h-14 text-base px-5 bg-transparent focus:outline-none"
                  style={{ color: colors.foreground }}
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </form>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1">
                  {/* Plus button */}
                  <button
                    className="p-2 rounded-full transition-colors hover:bg-white/10"
                    style={{ color: colors.muted }}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  
                  {/* Tools dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsToolsOpen(!isToolsOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                      style={{ color: colors.muted }}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="text-sm">Tools</span>
                    </button>
                    
                    <AnimatePresence>
                      {isToolsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 mt-2 w-64 rounded-xl border shadow-2xl overflow-hidden z-50"
                          style={{
                            backgroundColor: colors.cardHover,
                            borderColor: colors.cardBorder,
                          }}
                        >
                          <div className="p-2">
                            <p 
                              className="px-3 py-2 text-xs font-medium uppercase tracking-wider"
                              style={{ color: colors.muted }}
                            >
                              Tools
                            </p>
                            <button
                              onClick={() => handleToolClick('protocol')}
                              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-white/10"
                              style={{ color: colors.foreground }}
                            >
                              <div 
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: colors.primary + '20' }}
                              >
                                <FlaskConical className="h-5 w-5" style={{ color: colors.primary }} />
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-sm">Protocol Mode</p>
                                <p className="text-xs" style={{ color: colors.muted }}>
                                  Run a guided test protocol
                                </p>
                              </div>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Mic button */}
                  <button
                    className="p-2 rounded-full transition-colors hover:bg-white/10"
                    style={{ color: colors.muted }}
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Example Queries - Replace action chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {exampleQueries.map((query, i) => (
                <button
                  key={i}
                  onClick={() => handleActionClick(query)}
                  className="px-4 py-2.5 rounded-full border transition-all text-sm hover:bg-white/5"
                  style={{
                    borderColor: colors.cardBorder,
                    color: colors.foreground,
                  }}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active state - chat interface
  return (
    <div
      className={cn('flex-1 flex flex-col h-full overflow-hidden', className)}
      style={{
        background: `linear-gradient(180deg, ${colors.backgroundGradientStart} 0%, ${colors.backgroundGradientMid} 40%, ${colors.backgroundGradientEnd} 100%)`,
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: colors.cardBorder }}
      >
        <Logo size="small" onClick={onRefresh} vendor={vendor} />
        <div
          className="px-3 py-1.5 rounded-full text-xs font-medium border"
          style={{
            backgroundColor: `${colors.primary}20`,
            borderColor: `${colors.primary}40`,
            color: colors.primary,
          }}
        >
          Limited Preview
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={cn('w-full', msg.role === 'user' ? 'flex justify-end' : '')}>
              {msg.role === 'user' ? (
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3"
                  style={{ backgroundColor: colors.card }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: colors.foreground }}>
                    {msg.content}
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  <div
                    className="prose prose-sm max-w-none leading-relaxed"
                    style={{ color: `${colors.foreground}e6` }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      backgroundColor: colors.primary,
                      animationDelay: `${delay}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer Input */}
      <div className="p-4 border-t" style={{ borderColor: colors.cardBorder }}>
        <div className="max-w-3xl mx-auto">
          <form onSubmit={onSendMessage} className="relative">
            <textarea
              ref={textareaRef}
              placeholder="Ask a follow-up..."
              className="w-full py-3 pl-4 pr-12 rounded-xl backdrop-blur border focus:outline-none focus:ring-2 resize-none overflow-hidden min-h-[48px] max-h-[200px]"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                color: colors.foreground,
              }}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              type="submit"
              className="absolute right-2 bottom-2 h-10 w-10 flex items-center justify-center rounded-lg transition-colors"
              style={{
                backgroundColor: colors.primary,
                color: colors.primaryForeground,
              }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
