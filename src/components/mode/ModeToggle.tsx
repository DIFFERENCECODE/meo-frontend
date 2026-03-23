'use client';

import React from 'react';
import { motion } from 'motion/react';
import { User, Stethoscope } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { Mode } from '@/theme/vendorThemes';

interface ModeToggleProps {
  className?: string;
}

const allModes: { id: Mode; label: string; icon: typeof User }[] = [
  { id: 'patient', label: 'Patient', icon: User },
  { id: 'practitioner', label: 'Practitioner', icon: Stethoscope },
];

// Roles that can access practitioner mode
const PRACTITIONER_ROLES = ['clinician', 'admin', 'practitioner'];

export function ModeToggle({ className }: ModeToggleProps) {
  const { mode, setMode, theme, userRole } = useTheme();

  const canAccessPractitioner = PRACTITIONER_ROLES.includes(userRole);
  const modeOptions = canAccessPractitioner ? allModes : allModes.filter((m) => m.id === 'patient');

  // If only one option, don't show the toggle
  if (modeOptions.length <= 1) return null;

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
