import type { Step } from 'react-joyride';

export const MEO_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="marketplace-nav"]',
    title: 'Marketplace',
    content: 'Browse metabolic health products, test kits, and services curated for your journey.',
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
    target: '[data-tour="vendor-nav"]',
    title: 'Your vendor',
    content: 'This shows the clinical partner you are working with. Your experience is personalised based on their protocols.',
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
];
