'use client';

/**
 * LanguagePicker — compact dropdown for choosing the chat language.
 *
 * Controls both the voice-input locale (Web Speech API) and the
 * `user_language` field we send with every chat request. The backend
 * prompt uses that field to instruct the LLM to reply in the matching
 * language so the whole loop (user → voice → LLM → reply) stays in
 * one language.
 *
 * BCP-47 codes (en / ar / hi / nl) are what SpeechRecognition expects.
 * The `nativeLabel` is what we show in the dropdown so an Arabic
 * speaker sees "العربية" instead of "Arabic".
 */
import React, { useState } from 'react';
import { ChevronDown, Languages } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage, type SupportedLang as CtxLang } from '@/i18n/LanguageContext';

export type SupportedLang = CtxLang;

export const LANGUAGES: Array<{
  code: SupportedLang;
  /** BCP-47 tag passed to SpeechRecognition.lang */
  bcp47: string;
  nativeLabel: string;
  englishLabel: string;
}> = [
  { code: 'en', bcp47: 'en-US', nativeLabel: 'English',  englishLabel: 'English' },
  { code: 'ar', bcp47: 'ar-SA', nativeLabel: 'العربية', englishLabel: 'Arabic'  },
  { code: 'hi', bcp47: 'hi-IN', nativeLabel: 'हिन्दी',    englishLabel: 'Hindi'   },
  { code: 'nl', bcp47: 'nl-NL', nativeLabel: 'Nederlands', englishLabel: 'Dutch' },
];

export function getLangMeta(code: SupportedLang) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

interface Props {
  /** Optional — when omitted, picker reads from the global LanguageContext
   *  so you can mount it anywhere (sidebar footer, settings page, etc.)
   *  without threading props through the tree. */
  value?: SupportedLang;
  onChange?: (code: SupportedLang) => void;
  /** Visually compact variant for tight toolbars. */
  compact?: boolean;
  /** When true, show the full native label even in the compact variant.
   *  Used in the sidebar so "English" / "العربية" / etc. is visible. */
  showLabelWhenCompact?: boolean;
}

export function LanguagePicker({ value, onChange, compact = false, showLabelWhenCompact = false }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const ctx = useLanguage();
  const activeValue = value ?? ctx.language;
  const handleChange = onChange ?? ctx.setLanguage;
  const current = getLangMeta(activeValue);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'flex items-center gap-1 p-2 rounded-full transition-colors hover:bg-white/10'
            : 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10'
        }
        style={{ color: colors.muted }}
        aria-label={`Chat language: ${current.englishLabel}`}
      >
        <Languages className="h-4 w-4" />
        {(!compact || showLabelWhenCompact) && <span className="text-sm">{current.nativeLabel}</span>}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {open && (
        <>
          {/* Click-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full mb-2 left-0 w-44 rounded-xl border shadow-xl overflow-hidden z-50"
            style={{ backgroundColor: colors.cardHover, borderColor: colors.cardBorder }}
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  handleChange(lang.code);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-white/5"
                style={{
                  color: colors.foreground,
                  backgroundColor: lang.code === activeValue ? colors.accent : undefined,
                }}
              >
                <div>
                  <div className="text-sm font-medium">{lang.nativeLabel}</div>
                  <div className="text-xs" style={{ color: colors.muted }}>
                    {lang.englishLabel}
                  </div>
                </div>
                {lang.code === activeValue && (
                  <span className="text-xs" style={{ color: colors.primary }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LanguagePicker;
