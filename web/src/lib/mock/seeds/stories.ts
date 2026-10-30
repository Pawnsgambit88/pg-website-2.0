import type { StoryDetailDto } from '@/lib/api/types/story'
import { deepFreeze } from '@/lib/mock/seeds/freeze'
import { mockImage } from '@/lib/mock/seeds/media'
import { mockSlug } from '@/lib/mock/seeds/slug'

// Story seeds: closed block model, plain text, fictional content.

export const MOCK_STORIES: readonly StoryDetailDto[] = deepFreeze([
  {
    slug: mockSlug('the-best-clubs-are-not-about-chess'),
    kind: 'club_notes',
    eyebrow: 'Club notes',
    title: 'The best chess clubs are not really about chess',
    dek: 'What happens between the games is often the reason people come back for another one.',
    publishedOn: '2026-10-05',
    readingMinutes: 4,
    featured: true,
    cover: mockImage('3x2', 'Players chatting between games at a cafe table'),
    version: 1,
    updatedAt: '2026-10-05T12:00:00+05:30',
    body: [
      { type: 'paragraph', text: 'Ask a regular why they keep coming back and the answer is rarely an opening.' },
      { type: 'heading', level: 2, text: 'The room matters' },
      {
        type: 'paragraph',
        text: 'A familiar face at the door, a board already set up, an invitation to play one more.',
      },
      { type: 'quote', text: 'I came for one game and stayed for four.', attribution: 'A Saturday regular' },
      { type: 'list', ordered: false, items: ['Say hello first', 'Offer a second game', 'Learn one name each night'] },
    ],
  },
  {
    slug: mockSlug('monsoon-open-in-photographs'),
    kind: 'event_notes',
    eyebrow: 'Event notes',
    title: 'Nine rounds, one room, plenty to argue about afterwards',
    dek: 'The Monsoon Open in photographs, final standings and the games that had a crowd around them.',
    publishedOn: '2026-09-16',
    readingMinutes: 6,
    featured: false,
    cover: mockImage('16x9', 'The Monsoon Open playing hall'),
    version: 1,
    updatedAt: '2026-09-16T12:00:00+05:30',
    body: [
      { type: 'paragraph', text: 'Thirty-two players filled the hall for a long day of rapid chess.' },
      {
        type: 'image',
        media: mockImage('3x2', 'Two players deep in thought over a board'),
        caption: 'Round six, board one.',
      },
      { type: 'paragraph', text: 'The final round decided the title, and the room stayed to watch.' },
      { type: 'link', label: 'See the event archive', href: '/events/monsoon-open' },
    ],
  },
  {
    slug: mockSlug('why-repeat-opponents-matter'),
    kind: 'rivalries',
    eyebrow: 'Rivalries',
    title: 'Somebody you want to play again is a good reason to return',
    dek: 'Why repeat opponents matter more than another anonymous leaderboard.',
    publishedOn: '2026-08-28',
    readingMinutes: 3,
    featured: false,
    cover: null,
    version: 1,
    updatedAt: '2026-08-28T12:00:00+05:30',
    body: [
      { type: 'paragraph', text: 'A rating tells you how strong someone is. A rematch tells you who they are.' },
      { type: 'paragraph', text: 'The friendliest rivalries start with a draw nobody was happy about.' },
    ],
  },
] satisfies StoryDetailDto[])
