'use client';

import React, { useState, useEffect } from 'react';
import { Send, Paperclip, MoreVertical, Loader2 } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';

interface ChatMessage {
  sender: 'user' | 'meo';
  text: string;
}

interface MessagingPanelProps {
  patientSessionId?: string | null;
  patientName?: string | null;
  className?: string;
}

export function MessagingPanel({ patientSessionId, patientName, className }: MessagingPanelProps) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Load patient's chat history when selected
  useEffect(() => {
    if (!patientSessionId) {
      setMessages([]);
      return;
    }
    const token = getIdToken();
    if (!token) return;

    setLoading(true);
    fetch(`/api/history/${patientSessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ChatMessage[]) => setMessages(data))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [patientSessionId]);

  if (!patientSessionId) {
    return (
      <div className={`rounded-xl border p-6 ${className || ''}`} style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }}>
        <h3 className="font-semibold mb-2" style={{ color: theme.colors.foreground }}>Patient Conversation</h3>
        <p className="text-sm" style={{ color: theme.colors.muted }}>Select a patient to view their conversation history</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${className || ''}`} style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }}>
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.colors.cardBorder }}>
        <div>
          <h3 className="font-semibold" style={{ color: theme.colors.foreground }}>Patient Conversation</h3>
          <p className="text-xs mt-0.5" style={{ color: theme.colors.muted }}>{patientName || patientSessionId}</p>
        </div>
        <button className="p-2 rounded-lg transition-colors" style={{ color: theme.colors.muted }}>
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto" style={{ backgroundColor: theme.colors.background }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.colors.primary }} />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: theme.colors.muted }}>No conversation history</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'meo' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.sender === 'meo' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                style={{
                  backgroundColor: msg.sender === 'meo' ? theme.colors.primary : theme.colors.card,
                  color: msg.sender === 'meo' ? theme.colors.primaryForeground : theme.colors.foreground,
                }}
              >
                {msg.sender === 'user' && (
                  <p className="text-xs font-medium mb-1" style={{ color: theme.colors.primary }}>
                    {patientName || 'Patient'}
                  </p>
                )}
                {msg.sender === 'meo' && (
                  <p className="text-xs font-medium mb-1 opacity-70">MeO</p>
                )}
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MessagingPanel;
