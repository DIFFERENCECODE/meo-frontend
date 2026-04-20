'use client';

/**
 * Skeleton — theme-aware shimmer placeholder.
 *
 * Tailwind's `animate-pulse` plus a subtle diagonal gradient that tracks
 * the active theme's card colours. Kept dumb — consumers compose the
 * *shape* of the skeleton (which rows / avatars / bars to show) so the
 * loading state mirrors the eventual content layout. Generic
 * "spinner-in-a-box" placeholders are what make "data breaking" visible;
 * shape-matched skeletons make it feel intentional.
 *
 * Usage:
 *   <Skeleton className="h-4 w-40" />       // one text line
 *   <SkeletonAvatar />                       // round avatar placeholder
 *   <SkeletonRows count={5} />               // multi-line list stub
 */
import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tailwind size / border classes (h-4 w-40, h-10 w-10 rounded-full, etc). */
  className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const { colors } = useTheme();
  return (
    <div
      className={cn('animate-pulse rounded-md', className)}
      style={{
        backgroundColor: `${colors.cardBorder}60`,
        backgroundImage: `linear-gradient(100deg, ${colors.cardBorder}30 0%, ${colors.cardBorder}80 50%, ${colors.cardBorder}30 100%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s linear infinite, pulse 2s ease-in-out infinite',
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonAvatar({ size = 'h-8 w-8' }: { size?: string }) {
  return <Skeleton className={`${size} rounded-full`} />;
}

/**
 * SkeletonRows — stack of lines, used for chat history, knowledge docs,
 * and other list-of-text loading states. Each row gets a slightly
 * randomised width so it doesn't look like a grid of rectangles.
 */
export function SkeletonRows({
  count = 3,
  widths,
  className,
}: {
  count?: number;
  widths?: string[]; // e.g. ['w-40', 'w-56', 'w-32']
  className?: string;
}) {
  const defaults = ['w-5/6', 'w-3/4', 'w-4/6', 'w-5/6', 'w-2/3', 'w-3/5'];
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${widths?.[i] ?? defaults[i % defaults.length]}`} />
      ))}
    </div>
  );
}

/**
 * SkeletonChatRow — matches the visible shape of a row in the sidebar
 * chat list (title + date). Use `count` rows in the sidebar while the
 * /api/chats call is in flight so the panel doesn't collapse to nothing.
 */
export function SkeletonChatRow() {
  return (
    <div className="w-full px-3 py-2">
      <Skeleton className="h-3.5 w-3/4 mb-1.5" />
      <Skeleton className="h-2.5 w-1/3" />
    </div>
  );
}

/**
 * SkeletonMessage — matches a single assistant message bubble shape
 * (avatar + two paragraphs). Shown while chat history loads so the
 * main area doesn't blink from "old messages" to empty to new messages.
 */
export function SkeletonMessage() {
  return (
    <div className="w-full flex gap-3">
      <SkeletonAvatar />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-3 w-1/2" />
        <SkeletonRows count={3} />
      </div>
    </div>
  );
}
