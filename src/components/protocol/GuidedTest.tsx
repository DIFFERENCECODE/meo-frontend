'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Droplets, FlaskConical, Ruler, Scale, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { ScreenHeader, ScreenBody, Chip } from '@/components/layout/ScreenHeader';
import { ProtocolPanel } from '@/components/layout/ProtocolPanel';
import { useProtocolSession } from '@/hooks/useProtocolSession';

/**
 * The guided BAS test, as a screen rather than an overlay on a conversation.
 *
 * Two states: a kit-and-fast check before anything is committed, then the
 * existing ProtocolPanel driving the server-side state machine. The panel is
 * unchanged — this component only changes *where* it is mounted and *what it
 * exits to*. Exiting used to land you in a chat transcript; it now lands you
 * back on your record, which is where the result of the test actually shows up.
 *
 * Kraft is deliberately absent. At-home testing is BAS plus lipids; a clinic
 * KRAFT still exists as a record on the timeline, but it is not something a
 * patient can be walked through from their kitchen, and offering it here would
 * be offering something we cannot safely deliver.
 */

const KIT = [
  { Icon: Droplets, label: 'Glucose meter', detail: 'Strips in date, lancet ready' },
  { Icon: FlaskConical, label: 'Lipid strip', detail: 'Triglycerides and HDL' },
  { Icon: Ruler, label: 'Tape measure', detail: 'Waist, in centimetres' },
  { Icon: Scale, label: 'Scales', detail: 'Weight, in kilograms' },
];

export function GuidedTest() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, phase, note, start, submit, exit } = useProtocolSession();

  const leave = () => {
    exit();
    // A finished test goes to its result, not back to the record. The record
    // shows where you are overall; this screen answers the question the patient
    // just spent ten minutes earning the answer to.
    router.push(state === 'bas_complete' ? '/reading' : '/');
  };

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden">
      <AnimatePresence mode="wait">
        {state ? (
          <ProtocolPanel
            key="panel"
            protocolState={state}
            onSubmit={submit}
            onExit={leave}
          />
        ) : (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full min-w-0 overflow-y-auto"
          >
            <ScreenHeader
              title="Guided BAS test"
              subtitle="The only at-home test — BAS + lipid panel"
              right={<Chip>About 10 minutes</Chip>}
            />
            <ScreenBody>

            {/* The fasting gate is stated before the kit, not after, because it
                is the one thing that cannot be fixed once the test has begun. */}
            <div
              className="flex gap-3 rounded-[10px] p-4 mb-6"
              style={{
                backgroundColor: 'rgba(var(--mc-accent-rgb),0.07)',
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <Clock className="h-5 w-5 shrink-0 mt-0.5" style={{ color: colors.primary }} />
              <div>
                <p className="t-lead font-medium">Fast for 8 to 12 hours first</p>
                <p className="t-body2 mt-1" style={{ color: colors.muted }}>
                  Water is fine. Anything else moves glucose and triglycerides
                  enough that the reading won&apos;t compare to your last one.
                </p>
              </div>
            </div>

            <h2 className="t-lead font-medium mb-3">What you&apos;ll need</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {KIT.map(({ Icon, label, detail }) => (
                <div
                  key={label}
                  className="flex gap-3 rounded-[10px] p-4"
                  style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <Icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: colors.primary }} />
                  <div>
                    <p className="t-lead font-medium">{label}</p>
                    <p className="t-body2 mt-0.5" style={{ color: colors.muted }}>{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {phase === 'error' && (
              <div className="flex items-center gap-2 mb-4 t-lead" style={{ color: 'var(--mc-orange)' }}>
                <AlertTriangle className="h-4 w-4" />
                <span>Couldn&apos;t start the test. Try again in a moment.</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={start}
                disabled={phase === 'starting'}
                className="px-6 py-3 rounded-[10px] t-lead font-semibold transition-opacity disabled:opacity-60"
                style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
              >
                {phase === 'starting' ? 'Starting…' : "I've fasted — begin"}
              </button>
              <button
                onClick={leave}
                className="px-4 py-3 rounded-[10px] t-lead transition-colors hover:bg-transparent/5"
                style={{ color: colors.muted }}
              >
                Not now
              </button>
            </div>

            {note && (
              <p className="t-body2" style={{ color: colors.muted }}>{note}</p>
            )}
            </ScreenBody>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GuidedTest;
