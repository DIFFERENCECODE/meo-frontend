'use client';

import React from 'react';
import { motion } from 'motion/react';
import { User, Stethoscope } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { Mode } from '@/theme/vendorThemes';

interface ModeToggleProps {
  className?: string;
}

const modeOptions: { id: Mode; label: string; icon: typeof User }[] = [
  { id: 'patient', label: 'Patient', icon: User },
  { id: 'practitioner', label: 'Practitioner', icon: Stethoscope },
];

export function ModeToggle({ className }: ModeToggleProps) {
  const { mode, setMode, theme } = useTheme();

  return (
    <div
      className={`flex rounded-xl p-1 ${className || ''}`}
      style={{ backgroundColor: theme.colors.accent }}
    >
      {modeOptions.map((option) => {
        const isActive = mode === option.id;
        const IconComponent = option.icon;
        
        return (
          <button
            key={option.id}
            onClick={() => setMode(option.id)}
            className="relative flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: isActive ? theme.colors.primaryForeground : theme.colors.muted,
            }}
          >
            {isActive && (
              <motion.div
                layoutId="modeToggle"
                className="absolute inset-0 rounded-lg"
                style={{ backgroundColor: theme.colors.primary }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <IconComponent className="w-4 h-4" />
              <span className="hidden sm:inline">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ModeToggle;
