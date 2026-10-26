'use client';

import React, { useCallback } from 'react';
import { Joyride, type EventData, type Controls, STATUS } from 'react-joyride';
import { useTheme } from '@/theme/ThemeProvider';
import type { Step } from 'react-joyride';
import { MEO_TOUR_STEPS } from './tourSteps';

interface ProductTourProps {
  run: boolean;
  onFinish: () => void;
  /** Defaults to the chat tour; screen tours pass their own. */
  steps?: Step[];
}

export function ProductTour({ run, onFinish, steps = MEO_TOUR_STEPS }: ProductTourProps) {
  const { colors } = useTheme();

  const handleEvent = useCallback((data: EventData, _controls: Controls) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish();
    }
  }, [onFinish]);

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        primaryColor: colors.primary,
        backgroundColor: colors.card,
        textColor: colors.foreground,
        arrowColor: colors.card,
        overlayColor: 'rgba(0, 0, 0, 0.55)',
        zIndex: 10000,
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
      }}
      styles={{
        tooltip: {
          borderRadius: 12,
          fontSize: 16,
          padding: '16px 20px',
        },
        tooltipTitle: {
          fontSize: 17,
          fontWeight: 600,
          marginBottom: 6,
          color: colors.foreground,
        },
        tooltipContent: {
          color: colors.muted,
          lineHeight: 1.6,
        },
        buttonPrimary: {
          backgroundColor: colors.primary,
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 500,
          padding: '8px 16px',
        },
        buttonBack: {
          color: colors.muted,
          fontSize: 15,
        },
        buttonSkip: {
          color: colors.muted,
          fontSize: 14,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}
