'use client';

/**
 * LanguageContext — single source of truth for the user's selected
 * chat language across the whole app.
 *
 * Before this, only ChatPanel knew the language (it was a prop from
 * MeOApp). That buried the toggle inside the input bar, and users
 * reported they couldn't find where to change it. Now LanguagePicker
 * reads/writes the context with no props, so we can mount the picker
 * anywhere — sidebar footer, settings page, command palette — and
 * they all stay in sync.
 *
 * Persists to localStorage under `meo_chat_lang`.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, interpolate } from './translations';

export type SupportedLang = 'en' | 'ar' | 'hi' | 'nl';

const STORAGE_KEY = 'meo_chat_lang';
const DEFAULT_LANG: SupportedLang = 'en';

interface LanguageContextValue {
  language: SupportedLang;
  setLanguage: (lang: SupportedLang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, _setLanguage] = useState<SupportedLang>(DEFAULT_LANG);

  // Hydrate from localStorage after mount (SSR-safe).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as SupportedLang | null;
    if (saved && ['en', 'ar', 'hi', 'nl'].includes(saved)) _setLanguage(saved);

    // Also listen for cross-tab changes — picking a language in one
    // tab should update every other open tab without a reload.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && ['en', 'ar', 'hi', 'nl'].includes(e.newValue)) {
        _setLanguage(e.newValue as SupportedLang);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Update <html lang> and dir on every change so browser spellcheck,
  // screen readers, and CSS :dir() selectors all stay in sync.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const setLanguage = useCallback((lang: SupportedLang) => {
    _setLanguage(lang);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(STORAGE_KEY, lang); } catch {}
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useTranslation — get the translator function for the current language.
 *
 *   const { t } = useTranslation();
 *   <span>{t('sidebar.new_chat')}</span>
 *   <span>{t('chat.thought_for', { seconds: 6.4, count: 5 })}</span>
 *
 * Missing keys fall back to: (1) the English entry for that key,
 * (2) the key itself as a last-resort string, so the UI never
 * crashes or shows empty on a typo.
 */
export function useTranslation(): { t: (key: string, vars?: Record<string, string | number>) => string; language: SupportedLang } {
  const { language } = useLanguage();
  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      const localeDict = translations[language] || translations.en;
      const template = localeDict[key] ?? translations.en[key] ?? key;
      return interpolate(template, vars);
    };
  }, [language]);
  return { t, language };
}


export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Graceful fallback so components can render outside the provider
    // (e.g. in Storybook) without throwing. Defaults to English and
    // writes to localStorage directly.
    return {
      language: DEFAULT_LANG,
      setLanguage: (lang) => {
        if (typeof window !== 'undefined') {
          try { window.localStorage.setItem(STORAGE_KEY, lang); } catch {}
        }
      },
    };
  }
  return ctx;
}
