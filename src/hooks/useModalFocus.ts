'use client';

import { useEffect } from 'react';

/** Contain focus and disable the background while a mobile navigation drawer is open. */
export function useModalFocus(element: HTMLElement | null, active: boolean) {
  useEffect(() => {
    if (!element || !active) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const blocked: Array<[HTMLElement, boolean]> = [];
    // A drawer can sit inside several app wrappers. Inert their other branches,
    // but retain the dismissing scrim as a pointer target.
    let branch: HTMLElement = element;
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === branch || sibling.hasAttribute('data-menu-backdrop')) continue;
        blocked.push([sibling, sibling.inert]);
        sibling.inert = true;
      }
      branch = branch.parentElement;
    }
    const controls = () => Array.from(element.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    )).filter((control) => control.getClientRects().length > 0 && !control.closest('[inert]'));
    const focusFirst = () => (controls()[0] ?? element).focus({ preventScroll: true });
    focusFirst();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { event.preventDefault(); element.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !element.contains(event.target)) focusFirst();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocus);
      for (const [node, wasInert] of blocked) node.inert = wasInert;
      // The mobile trigger unmounts while open; find its replacement on close.
      requestAnimationFrame(() => {
        const target = previousFocus?.isConnected && previousFocus !== document.body
          ? previousFocus
          : Array.from(document.querySelectorAll<HTMLElement>('[data-menu-trigger]')).find((node) => node.getClientRects().length > 0);
        target?.focus({ preventScroll: true });
      });
    };
  }, [element, active]);
}
