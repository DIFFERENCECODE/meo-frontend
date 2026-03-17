'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '@/theme/ThemeProvider';
import { Vendor } from '@/theme/vendorThemes';

interface VendorToggleProps {
  className?: string;
}

// Meterbolic droplet icon
function MeterbolicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C12 2 5 10 5 15C5 19.4183 8.13401 23 12 23C15.866 23 19 19.4183 19 15C19 10 12 2 12 2Z" />
    </svg>
  );
}

// Eos sun icon
function EosIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="2" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const vendorOptions: { id: Vendor; label: string; icon: typeof MeterbolicIcon }[] = [
  { id: 'meterbolic', label: 'Meterbolic', icon: MeterbolicIcon },
  { id: 'eos', label: 'Eos', icon: EosIcon },
];

export function VendorToggle({ className }: VendorToggleProps) {
  const { vendor, setVendor, theme } = useTheme();

  return (
    <div
      className={`flex rounded-xl p-1 ${className || ''}`}
      style={{ backgroundColor: theme.colors.accent }}
    >
      {vendorOptions.map((option) => {
        const isActive = vendor === option.id;
        const IconComponent = option.icon;
        
        return (
          <button
            key={option.id}
            onClick={() => setVendor(option.id)}
            className="relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: isActive ? theme.colors.primaryForeground : theme.colors.muted,
            }}
          >
            {isActive && (
              <motion.div
                layoutId="vendorToggle"
                className="absolute inset-0 rounded-lg"
                style={{ backgroundColor: theme.colors.primary }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <IconComponent className="w-4 h-4" />
              <span>{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default VendorToggle;
