'use client';

import React from 'react';
import { X, BookOpen, FileText, Eye, MessageSquare, ChevronRight } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

// ── Library catalogue ─────────────────────────────────────────────────────────
// Add new entries here as more resources are ingested into the knowledge base.
const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'thin-guide-to-fat',
    title: 'The Thin Guide to Fat',
    author: 'Marina Young',
    type: 'book',
    description:
      'Challenges the myth that weight equals health. Explains visceral fat, the TOFI phenomenon, and why the Biological Age Score reveals what BMI cannot.',
    viewUrl: '/docs/TheThinGuideToFat_MarinaYoung_book.pdf#toolbar=0&navpanes=0',
    suggestedPrompts: [
      'What is the Thin Guide to Fat about?',
      'What is visceral fat and why does it matter?',
      'What is TOFI — Thin Outside Fat Inside?',
      'How does the BAS relate to visceral fat?',
    ],
  },
  {
    id: 'bas-guide',
    title: 'Biological Age Score Guide',
    author: 'Meterbolic',
    type: 'guide',
    description:
      'Step-by-step instructions for measuring your BAS at home: fasting blood glucose, lipid panel, and anthropometrics — with interpretation of your result.',
    viewUrl: null,
    suggestedPrompts: [
      'What is the Biological Age Score?',
      'How do I measure my Biological Age Score at home?',
      'What does a high Deep Fat Score mean?',
      'What equipment do I need for the BAS test?',
    ],
  },
];

type LibraryItem = {
  id: string;
  title: string;
  author: string;
  type: 'book' | 'guide';
  description: string;
  viewUrl: string | null;
  suggestedPrompts: string[];
};

interface LibraryPanelProps {
  onClose: () => void;
  onAskMeO: (prompt: string) => void;
}

export default function LibraryPanel({ onClose, onAskMeO }: LibraryPanelProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = React.useState<string | null>(null);

  return (
    <div
      className="flex flex-col h-full relative"
      style={{ backgroundColor: colors.background, color: colors.foreground }}
    >
      {/* Inline PDF viewer — overlays the panel when a PDF is selected */}
      {viewingPdf && (
        <div
          className="absolute inset-0 z-50 flex flex-col"
          style={{ backgroundColor: colors.background }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: colors.cardBorder }}
          >
            <span className="text-sm font-medium" style={{ color: colors.foreground }}>
              The Thin Guide to Fat
            </span>
            <button
              onClick={() => setViewingPdf(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: colors.muted }}
              aria-label="Close viewer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <iframe
            src={viewingPdf}
            className="flex-1 w-full border-0"
            title="PDF Viewer"
          />
        </div>
      )}
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
        style={{ borderColor: colors.cardBorder }}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" style={{ color: colors.primary }} />
          <span className="font-semibold text-base">MeO Library</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: colors.muted }}
          aria-label="Close library"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {LIBRARY_ITEMS.map((item) => {
          const isExpanded = expanded === item.id;
          return (
            <div
              key={item.id}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: colors.cardBorder, backgroundColor: colors.card }}
            >
              {/* Item header row */}
              <button
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : item.id)}
                aria-expanded={isExpanded}
              >
                {/* Icon */}
                <div
                  className="p-2 rounded-lg flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${colors.primary}18` }}
                >
                  {item.type === 'book' ? (
                    <BookOpen className="h-4 w-4" style={{ color: colors.primary }} />
                  ) : (
                    <FileText className="h-4 w-4" style={{ color: colors.primary }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm leading-tight">{item.title}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full border capitalize"
                      style={{
                        borderColor: `${colors.primary}40`,
                        color: colors.primary,
                        backgroundColor: `${colors.primary}10`,
                      }}
                    >
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
                    {item.author}
                  </p>
                  {!isExpanded && (
                    <p className="text-xs mt-1.5 line-clamp-2" style={{ color: `${colors.foreground}99` }}>
                      {item.description}
                    </p>
                  )}
                </div>

                <ChevronRight
                  className={`h-4 w-4 flex-shrink-0 transition-transform mt-1 ${isExpanded ? 'rotate-90' : ''}`}
                  style={{ color: colors.muted }}
                />
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <p className="text-sm leading-relaxed" style={{ color: `${colors.foreground}cc` }}>
                    {item.description}
                  </p>

                  {/* Ask MeO prompts */}
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: colors.muted }}>
                      Ask MeO about this
                    </p>
                    <div className="space-y-1.5">
                      {item.suggestedPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => {
                            onAskMeO(prompt);
                            onClose();
                          }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all hover:bg-white/5 group"
                          style={{
                            borderColor: colors.cardBorder,
                            color: colors.foreground,
                          }}
                        >
                          <MessageSquare
                            className="h-3 w-3 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                            style={{ color: colors.primary }}
                          />
                          <span className="leading-snug">{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* View PDF button (opens inline viewer — no download) */}
                  {item.viewUrl && (
                    <button
                      onClick={() => setViewingPdf(item.viewUrl)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors w-full justify-center"
                      style={{
                        backgroundColor: `${colors.primary}20`,
                        color: colors.primary,
                        border: `1px solid ${colors.primary}40`,
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View PDF
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div
        className="px-5 py-3 text-xs border-t flex-shrink-0"
        style={{ borderColor: colors.cardBorder, color: colors.muted }}
      >
        MeO can answer questions about all resources in this library.
      </div>
    </div>
  );
}
