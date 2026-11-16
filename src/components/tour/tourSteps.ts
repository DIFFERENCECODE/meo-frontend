import type { Step } from 'react-joyride';

/**
 * Tours, written the way a person would explain the screen to a friend: one
 * idea per step, plain words, no feature names they haven't met yet.
 *
 * MEO_TOUR_STEPS is the chat's tour. SCREEN_TOURS are the situational ones:
 * each screen explains itself the first time a person opens it, and Settings
 * > Take the tour replays the one for the screen they are on. Steps whose
 * element isn't on screen are dropped at run time, so a tour never points at
 * nothing.
 */

const s = (target: string, title: string, content: string, placement: Step['placement'] = 'bottom'): Step => ({
  target: `[data-tour="${target}"]`, title, content, placement, skipBeacon: true,
});

export const MEO_TOUR_STEPS: Step[] = [
  s('new-chat', 'Start a conversation', 'Ask MeO about your readings, your plan or anything metabolic. It knows your record.', 'right'),
  s('plan-nav', 'Your plan', 'What your practitioner asked you to do, in their words, with how it is going.', 'right'),
  s('library-nav', 'Library', 'Short guides on metabolic health, written to be read in a few minutes.', 'right'),
  s('marketplace-nav', 'Marketplace', 'Test kits and practitioners you can book.', 'right'),
];

export const SCREEN_TOURS: Record<string, Step[]> = {
  '/': [
    s('bas', 'Your Biological Age Score', 'One number for your metabolic health, in years. Below your real age is good. It moves with each reading.'),
    s('what-changed', 'What changed', 'How each marker moved since your last reading. The bar shows which moved most.'),
    s('panel-bar', 'This reading in full', 'Tap here to see every value from this reading, and anything worth checking.', 'top'),
    s('ask-bar', 'Ask about what you see', 'Ask MeO anything about this screen. The paperclip adds results you already have, from a PDF or a photo.', 'top'),
  ],
  '/trends': [
    s('trend-tabs', 'Pick a marker', 'Choose what to look at. Each one has its own chart.'),
    s('trend-chart', 'Your trend', 'Each point is one reading, compared with your own last one, not with other people.'),
    s('panel-bar', 'Everything at a glance', 'Tap to see all your markers and their latest values.', 'top'),
  ],
  '/plan': [
    s('plan-author', 'Written by your practitioner', 'These are their words. MeO never writes or changes your plan.'),
    s('plan-lines', 'How it is going', 'MeO checks each line against what you log. "5 of 8" means 5 of the 8 times expected so far.'),
    s('ask-bar', 'Not sure about a line?', 'Ask MeO why it matters or how to fit it into your week. Changes go back to your practitioner.', 'top'),
  ],
  '/timeline': [
    s('timeline-list', 'Everything, in order', 'Every reading and measurement on your record, newest first. Nothing here is guessed.'),
    s('panel-bar', 'Where it came from', 'Tap to see which of your data came from the meter, the clinic or what you typed in.', 'top'),
  ],
};
