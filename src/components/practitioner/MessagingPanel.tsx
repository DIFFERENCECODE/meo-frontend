'use client';

import React, { useState } from 'react';
import { Send, Paperclip, MoreVertical } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

// Mock messages
const mockMessages = [
  {
    id: '1',
    sender: 'patient',
    name: 'Sarah Johnson',
    message: 'Hi Dr. Smith, I wanted to ask about my recent test results.',
    time: '10:30 AM',
  },
  {
    id: '2',
    sender: 'practitioner',
    name: 'You',
    message:
      "Hello Sarah! Your results look good overall. Your HbA1c has improved to 6.8% from 7.2% last quarter. That's great progress!",
    time: '10:45 AM',
  },
  {
    id: '3',
    sender: 'patient',
    name: 'Sarah Johnson',
    message:
      "That's wonderful news! I've been following the diet plan closely. Should I continue with the same routine?",
    time: '11:00 AM',
  },
];

interface MessagingPanelProps {
  className?: string;
}

export function MessagingPanel({ className }: MessagingPanelProps) {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      // In real app, would send message
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`rounded-xl border overflow-hidden ${className || ''}`}
      style={{
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.cardBorder,
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: theme.colors.cardBorder }}
      >
        <div>
          <h3 className="font-semibold" style={{ color: theme.colors.foreground }}>
            Patient Messaging
          </h3>
          <p className="text-xs mt-0.5" style={{ color: theme.colors.muted }}>
            Sarah Johnson • Last active 5m ago
          </p>
        </div>
        <button
          className="p-2 rounded-lg transition-colors"
          style={{ color: theme.colors.muted }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        className="p-4 space-y-4 max-h-[250px] overflow-y-auto"
        style={{ backgroundColor: theme.colors.background }}
      >
        {mockMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === 'practitioner' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.sender === 'practitioner'
                  ? 'rounded-br-sm'
                  : 'rounded-bl-sm'
              }`}
              style={{
                backgroundColor:
                  msg.sender === 'practitioner'
                    ? theme.colors.primary
                    : theme.colors.card,
                color:
                  msg.sender === 'practitioner'
                    ? theme.colors.primaryForeground
                    : theme.colors.foreground,
              }}
            >
              {msg.sender === 'patient' && (
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: theme.colors.primary }}
                >
                  {msg.name}
                </p>
              )}
              <p className="text-sm leading-relaxed">{msg.message}</p>
              <p
                className="text-[10px] mt-1 text-right opacity-70"
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        className="p-3 border-t"
        style={{ borderColor: theme.colors.cardBorder }}
      >
        <div className="flex items-end gap-2">
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: theme.colors.muted }}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-xl border resize-none text-sm"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.cardBorder,
              color: theme.colors.foreground,
              minHeight: '40px',
              maxHeight: '100px',
            }}
          />
          <button
            onClick={handleSend}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: message.trim()
                ? theme.colors.primary
                : theme.colors.accent,
              color: message.trim()
                ? theme.colors.primaryForeground
                : theme.colors.muted,
            }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MessagingPanel;
