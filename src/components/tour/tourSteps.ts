import type { Step } from 'react-joyride';

export const MEO_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="chat-input"]',
    title: 'Ask MeO anything',
    content: 'Type a question about your metabolic health — diet, fasting, your BAS score, or the Kraft test. MeO will guide you.',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '[data-tour="new-chat"]',
    title: 'Start a new conversation',
    content: 'Begin a fresh chat at any time. Your previous conversations are saved in the list above.',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="marketplace-nav"]',
    title: 'Marketplace',
    content: 'Browse metabolic health products, test kits, and services curated for your journey.',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="library-nav"]',
    title: 'Library',
    content: 'Access clinical guides, protocol documents, and resources on metabolic health.',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="personalize-nav"]',
    title: 'Enter your data',
    content: 'After a Kraft test or BAS measurement, enter your results here. MeO will store them and discuss what they mean.',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="activity-nav"]',
    title: 'Your metabolic scores',
    content: 'Track your Biological Age Score, Deep Fat Score, and other metabolic markers over time.',
    placement: 'right',
    skipBeacon: true,
  },
];
