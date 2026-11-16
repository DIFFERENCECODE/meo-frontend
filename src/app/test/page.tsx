'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { GuidedTest } from '@/components/protocol/GuidedTest';

/**
 * The guided test gets a path of its own rather than a flag on the record
 * (`/?test=bas`). A test is a place you go and come back from, so the back
 * button, the sidebar's active state and the browser history should all treat
 * it as somewhere — and none of those work properly off a query parameter.
 * The result still lands on the record; that connection is in the exit, not
 * in the URL.
 *
 * No right panel: a second column competes with the step in front of you.
 * The ask bar stays — mid-test is exactly when "is 5.8 high?" gets asked.
 */
export default function TestPage() {
  return (
    <AppShell askPlaceholder="Ask MeO about this step…">
      <GuidedTest />
    </AppShell>
  );
}
