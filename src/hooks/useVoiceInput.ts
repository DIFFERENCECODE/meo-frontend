'use client';

/**
 * useVoiceInput — thin React hook over the Web Speech API
 * (SpeechRecognition). Browser-only, no backend dependency.
 *
 * Chromium-based browsers (Chrome, Edge, iOS Safari 14.5+) expose
 * SpeechRecognition under either the standard name or the webkit
 * prefix. Firefox does NOT implement it, and Safari's mobile support
 * can be patchy. `isSupported` tells the caller whether to render the
 * mic button at all.
 *
 * The hook appends interim + final transcripts to whatever the user
 * has already typed via the `onResult` callback, so dictation feels
 * like continuous input instead of overwriting the textarea.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionResultLike = {
  transcript: string;
  isFinal: boolean;
};

interface UseVoiceInputOptions {
  /** Fired with each interim or final transcript chunk. */
  onResult: (transcript: string, isFinal: boolean) => void;
  /** Fired if the browser raises a recognition error. */
  onError?: (message: string) => void;
  /** Default: user's browser locale. Override for multilingual flows. */
  lang?: string;
  /** When true, keep listening between utterances. Default: false. */
  continuous?: boolean;
}

export function useVoiceInput({ onResult, onError, lang, continuous = false }: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const cachedLang = useRef<string | undefined>(lang);

  // Whether the browser has SpeechRecognition at all.
  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const impl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!impl);
  }, []);

  useEffect(() => {
    cachedLang.current = lang;
  }, [lang]);

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const impl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!impl) {
      onError?.('Voice input is not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }
    // HTTPS gate — SpeechRecognition silently refuses on http://.
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      onError?.('Voice input requires a secure connection (HTTPS).');
      return;
    }

    // Explicit microphone permission prompt via getUserMedia — this
    // gives a clearer error path than SpeechRecognition's silent
    // `not-allowed` response. The user sees the browser's mic-permission
    // dialog here; if they deny, we surface a specific message rather
    // than a confusing silent failure. The stream is immediately
    // released — SpeechRecognition opens its own audio capture.
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e: any) {
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        onError?.('Microphone permission denied. Enable it in your browser site settings.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        onError?.('No microphone found on this device.');
      } else {
        onError?.(`Microphone error: ${e?.message || name || 'unknown'}`);
      }
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const rec = new impl();
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.lang = cachedLang.current || navigator.language || 'en-US';

    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const first: SpeechRecognitionResultLike = { transcript: r[0].transcript, isFinal: r.isFinal };
        onResult(first.transcript, first.isFinal);
      }
    };

    rec.onerror = (event: any) => {
      const err = event.error;
      // Translate common error codes into something actionable.
      const map: Record<string, string> = {
        'not-allowed': 'Microphone permission denied.',
        'service-not-allowed': 'Voice service not allowed on this page.',
        'network': 'Voice input needs an internet connection — Chrome uses Google Cloud Speech.',
        'audio-capture': 'No microphone detected.',
        'language-not-supported': `Language ${rec.lang} not supported by this browser.`,
        // 'no-speech' and 'aborted' are routine; surface them silently.
      };
      if (err && err !== 'no-speech' && err !== 'aborted') {
        onError?.(map[err] || `Voice error: ${err}`);
      }
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (e: any) {
      onError?.(e?.message || 'Failed to start voice input');
      setListening(false);
    }
  }, [continuous, onError, onResult]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Cleanup on unmount — don't leave the mic hot.
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  return { listening, start, stop, toggle, isSupported };
}

export default useVoiceInput;
