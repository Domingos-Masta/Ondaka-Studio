import type { ProjectTemplate } from './template.model';

export const BUILTIN_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'builtin-youtube-video',
    name: 'YouTube Video',
    category: 'youtube-video',
    orientation: 'landscape',
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    scenes: [
      { title: 'Hook', role: 'hook', targetDurationSec: 15, description: 'Open with a strong hook that tells viewers why they should keep watching.' },
      { title: 'Intro', role: 'intro', targetDurationSec: 30, description: 'Introduce yourself and outline what the video will cover.' },
      { title: 'Main Point 1', role: 'point', targetDurationSec: 120, description: 'First key point — explain it clearly with examples.' },
      { title: 'Main Point 2', role: 'point', targetDurationSec: 120, description: 'Second key point — build on the previous idea.' },
      { title: 'Main Point 3', role: 'point', targetDurationSec: 120, description: 'Third key point — complete your argument or story.' },
      { title: 'Recap', role: 'transition', targetDurationSec: 20, description: 'Summarize the main points before the close.' },
      { title: 'Call to Action', role: 'cta', targetDurationSec: 30, description: 'Ask viewers to like, comment, subscribe and watch the next video.' },
      { title: 'Outro', role: 'outro', targetDurationSec: 20, description: 'Sign off and thank viewers for watching.' },
    ],
  },
  {
    id: 'builtin-instagram-reels',
    name: 'Instagram Reels',
    category: 'instagram-reels',
    orientation: 'portrait',
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    scenes: [
      { title: 'Hook', role: 'hook', targetDurationSec: 3, description: 'Grab attention instantly — the first second decides if people stay.' },
      { title: 'Main Point', role: 'point', targetDurationSec: 30, description: 'Deliver the core message fast, with visual punch.' },
      { title: 'Call to Action', role: 'cta', targetDurationSec: 10, description: 'Tell viewers what to do next: follow, save, share.' },
      { title: 'Outro', role: 'outro', targetDurationSec: 5, description: 'Quick sign-off or a loop-friendly ending.' },
    ],
  },
  {
    id: 'builtin-tiktok-video',
    name: 'TikTok Video',
    category: 'tiktok-video',
    orientation: 'portrait',
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    scenes: [
      { title: 'Hook', role: 'hook', targetDurationSec: 3, description: 'Hook the viewer in the very first second.' },
      { title: 'Setup', role: 'setup', targetDurationSec: 10, description: 'Give the context or the "wait for it" setup.' },
      { title: 'Payoff', role: 'point', targetDurationSec: 20, description: 'The main reveal, tip, or punchline.' },
      { title: 'Call to Action', role: 'cta', targetDurationSec: 8, description: 'Ask for a follow, like, or comment.' },
    ],
  },
  {
    id: 'builtin-youtube-short',
    name: 'YouTube Short',
    category: 'youtube-short',
    orientation: 'portrait',
    builtin: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    scenes: [
      { title: 'Hook', role: 'hook', targetDurationSec: 5, description: 'Strong opening line to stop the scroll.' },
      { title: 'Main Point', role: 'point', targetDurationSec: 30, description: 'Deliver the single idea clearly and fast.' },
      { title: 'Wrap', role: 'point', targetDurationSec: 15, description: 'Add a second beat or example.' },
      { title: 'Call to Action', role: 'cta', targetDurationSec: 10, description: 'Prompt a subscribe or watch the longer video.' },
    ],
  },
];
