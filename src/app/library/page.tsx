'use client';

import React, { useRef, useState } from 'react';
import { useSectionAssistant } from '@/components/assistant/SectionAssistant';
import { BookOpen, FileText, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ScreenHeader, ScreenBody, Chip } from '@/components/layout/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The library, as a screen rather than a slide-over.
 *
 * The frame makes it a destination with a reading pane beside it, and that is
 * the right shape: this is the corpus MeO answers from, so being able to see
 * what is in it — and only what is in it — is the point. Two resources, named,
 * with the prompts that actually retrieve well against them.
 *
 * The catalogue is deliberately short and says so. A library that implies more
 * than has been ingested invites questions the retrieval cannot answer, and a
 * confident answer from an empty corpus is the failure mode this product can
 * least afford.
 */
interface Resource {
  id: string;
  title: string;
  author: string;
  type: string;
  description: string;
  viewUrl: string | null;
  prompts: string[];
}

const RESOURCES: Resource[] = [
  {
    id: 'thin-guide-to-fat',
    title: 'The Thin Guide to Fat',
    author: 'Marina Young',
    type: 'book',
    description:
      'Challenges the myth that weight equals health. Explains visceral fat, the TOFI phenomenon, and why the Biological Age Score reveals what BMI cannot.',
    viewUrl: '/docs/TheThinGuideToFat_MarinaYoung_book.pdf#toolbar=0&navpanes=0',
    prompts: [
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
    prompts: [
      'What is the Biological Age Score?',
      'How do I measure my BAS at home?',
      'What does a high Deep Fat Score mean?',
      'What equipment do I need for the BAS test?',
    ],
  },
];

function LibraryInner() {
  const { colors } = useTheme();
  const { ask, busy } = useSectionAssistant();
  const readingPane = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<Resource | null>(null);


  return (
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title="Library"
        subtitle="Everything MeO reads from — ask it anything in here"
        right={<Chip>{RESOURCES.length} resources</Chip>}
      />

      <ScreenBody gap={12}>
        <div className="flex flex-col xl:flex-row" style={{ gap: 18, alignItems: 'flex-start', minHeight: 0 }}>
          <div className="w-full flex-1 min-w-0 flex flex-col" style={{ gap: 12 }}>
            {RESOURCES.map((r) => {
              const Icon = r.type === 'book' ? BookOpen : FileText;
              const active = open?.id === r.id;
              return (
                <section
                  key={r.id}
                  className="flex flex-col"
                  style={{
                    background: colors.card,
                    border: `1px solid ${active ? 'rgba(var(--mc-accent-rgb),0.45)' : colors.cardBorder}`,
                    borderRadius: 16, padding: '18px 22px', gap: 11,
                  }}
                >
                  <div className="flex items-start" style={{ gap: 14 }}>
                    <div
                      className="flex items-center justify-center"
                      style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, background: 'rgba(var(--mc-accent-rgb),0.15)' }}
                    >
                      <Icon className="h-5 w-5" style={{ color: colors.primary }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.foreground }}>{r.title}</div>
                      <div style={{ fontSize: 14.5, color: colors.mutedDim, marginTop: 2 }}>
                        {r.author} · {r.type}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOpen(r);
                        readingPane.current?.focus({ preventScroll: true });
                        readingPane.current?.scrollIntoView({ block: 'start' });
                      }}
                      aria-label={`Open ${r.title}`}
                      aria-controls="library-reading-pane"
                      style={{
                        fontSize: 14, fontWeight: 700, borderRadius: 999, padding: '5px 12px',
                        whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit',
                        color: r.viewUrl ? colors.primary : colors.muted,
                        background: r.viewUrl ? 'rgba(var(--mc-accent-rgb),0.12)' : 'rgba(var(--mc-fg-rgb),0.07)',
                        border: `1px solid ${r.viewUrl ? 'rgba(var(--mc-accent-rgb),0.3)' : 'rgba(var(--mc-fg-rgb),0.14)'}`,
                      }}
                    >
                      Open
                    </button>
                  </div>

                  <p style={{ fontSize: 15, lineHeight: 1.55, color: colors.muted }}>{r.description}</p>

                  <div className="t-label" style={{ color: colors.mutedDim }}>Ask MeO</div>
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    {r.prompts.map((q) => (
                      <button
                        key={q}
                        onClick={() => ask(q)}
                        disabled={busy}
                        style={{
                          fontSize: 14, fontWeight: 600, color: colors.muted,
                          background: 'rgba(var(--mc-fg-rgb),0.07)', border: '1px solid rgba(var(--mc-fg-rgb),0.14)',
                          borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit',
                          textAlign: 'left',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* The frame's honest footer: the corpus is small, and saying so
                stops anyone expecting an answer it cannot ground. */}
            <section
              className="flex items-start"
              style={{ background: 'rgba(var(--mc-fg-rgb),0.03)', border: `1px dashed ${colors.cardBorder}`, borderRadius: 16, padding: '16px 20px', gap: 12 }}
            >
              <Plus className="h-4 w-4 mt-0.5" style={{ color: colors.mutedDim, flex: 'none' }} />
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: colors.foreground }}>
                  More resources will be added here
                </div>
                <div style={{ fontSize: 14.5, color: colors.mutedDim, marginTop: 2 }}>
                  Protocol guides, practitioner notes and Meterbolic research land here.
                </div>
              </div>
            </section>
          </div>

          {/* Reading pane. */}
          <aside id="library-reading-pane" ref={readingPane} tabIndex={-1} aria-label="Reading pane" className="w-full xl:w-[372px] scroll-mt-4" style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="t-label" style={{ color: colors.mutedDim }}>Reading</div>
            {open?.viewUrl ? (
              <iframe
                src={open.viewUrl}
                title={open.title}
                style={{ width: '100%', height: 520, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, background: 'rgba(0,0,0,0.2)' }}
              />
            ) : (
              <div
                style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 20px' }}
              >
                <p style={{ fontSize: 15, color: colors.muted, lineHeight: 1.6 }}>
                  {open
                    ? 'This guide is available through MeO. Choose one of its suggested questions to explore it.'
                    : 'Open a resource to read it here. Ask MeO about anything in the library and the answer cites back to it.'}
                </p>
              </div>
            )}
          </aside>
        </div>
      </ScreenBody>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <AppShell askPlaceholder="Ask about anything in the library…">
      <LibraryInner />
    </AppShell>
  );
}
