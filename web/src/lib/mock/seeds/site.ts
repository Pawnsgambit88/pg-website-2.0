import type { PublicSettingsDto, SiteSection, SiteSectionDto } from '@/lib/api/types/site-content'
import { deepFreeze } from '@/lib/mock/seeds/freeze'
import { homeImage, mockCollection } from '@/lib/mock/seeds/media'

// Site content seeds (home, community, nav, footer, meta) and public settings. The home section is the reference copy
// from Frontend reference/screens/01-home.html (HOME-01); the other sections are representative copy only.

const UPDATED = '2026-10-15T12:00:00+05:30'
const none = mockCollection([])

// Home images (HOME-01): one distinct local file per slot, scene-describing alt text and an explicit focal point.
const heroMedia = mockCollection([
  homeImage('hero', 'People enjoying a chess game together in a warm cafe, two players smiling across the board', {
    x: 0.55,
    y: 0.4,
  }),
])
const firstVisitMedia = mockCollection([
  homeImage('firstVisit', 'A relaxed chess game over coffee, a newcomer and a regular sharing a small table', {
    x: 0.5,
    y: 0.45,
  }),
])
const standsMedia = mockCollection([
  homeImage('stands', 'A group gathered around chess boards, watching a game and talking between moves', {
    x: 0.5,
    y: 0.35,
  }),
])
const storyMedia = mockCollection([
  homeImage('story', 'A warm cafe filled with people playing chess at long wooden tables', { x: 0.4, y: 0.5 }),
])
const finalCtaMedia = mockCollection([
  homeImage('finalCta', 'A lively evening of social chess in a cafe, every table busy under warm lights', {
    x: 0.5,
    y: 0.6,
  }),
])

export const MOCK_SITE: Readonly<Record<SiteSection, SiteSectionDto>> = deepFreeze({
  home: {
    key: 'home',
    version: 1,
    updatedAt: UPDATED,
    content: {
      hero: {
        eyebrow: 'Social chess, done properly.',
        headlineLine1: 'Good games.',
        headlineAccent: 'Better company.',
        lead: 'Come for the chess. Stay for the people.',
        body: 'We’ll know your name, find you a good game, introduce you around, and make your first visit feel easy.',
        proofPoints: ['Beginners welcome', 'Come solo', 'No membership needed'],
        primaryCta: { label: 'Find my next game', href: '/play' },
        secondaryCta: { label: 'Meet the community', href: '/community' },
        media: heroMedia,
      },
      upcoming: {
        eyebrow: 'Next at PG',
        title: 'Upcoming games',
        intro: 'Pick the kind of chess you feel like playing. We’ll take it from there.',
        cta: { label: 'See all events', href: '/play' },
      },
      firstVisit: {
        eyebrow: 'First time?',
        headline: 'You bring the curiosity. We’ll take care of the rest.',
        body: 'Walk in alone if you like. We’ll welcome you by name, introduce you around, find you a good first game, and make sure you’re never left wondering what to do next.',
        cta: { label: 'I’m new to PG', href: '/welcome' },
        promises: [
          { title: 'A real welcome', body: 'Someone from PG knows you’re new and makes the first hello easy.' },
          {
            title: 'A thoughtful pairing',
            body: 'We match for the game you want, not just a number beside your name.',
          },
          { title: 'An easy introduction', body: 'No hovering around. No breaking into closed circles.' },
          { title: 'Another game, if you want it', body: 'We keep the night moving without making it feel managed.' },
        ],
        media: firstVisitMedia,
      },
      stands: {
        eyebrow: 'What PG stands for',
        headline: 'A chess club people actually come back to.',
        body: 'Ratings matter across the board. People matter off it. PG is built for strong games, easy conversation and the kind of familiarity that makes a city feel smaller.',
        principles: [
          { title: 'Come alone.', body: 'You won’t stay anonymous for long.' },
          { title: 'Play seriously.', body: 'Take yourself lightly.' },
          { title: 'Make room.', body: 'The next regular may be walking in for the first time.' },
        ],
        media: standsMedia,
      },
      moreThanAGame: {
        eyebrow: 'More than a game',
        headline: 'A place to think, meet and come back to.',
        body: 'PG creates regular places for chess to happen in real life: cafés, cultural spaces and partner venues where the game is taken seriously and people are treated generously.',
        media: storyMedia,
        cta: { label: 'Our story', href: '/community' },
      },
      finalCta: {
        eyebrow: 'Your next game',
        headline: 'Come for a game. Stay for the people.',
        body: 'Tell us how you like to play. We’ll help you find the next table worth sitting at.',
        media: finalCtaMedia,
        cta: { label: 'Find a game', href: '/play' },
      },
    },
  },
  community: {
    key: 'community',
    version: 1,
    updatedAt: UPDATED,
    content: {
      hero: {
        eyebrow: 'Community',
        headline: 'A club built around the people who show up.',
        lead: 'Regulars, first-timers and everyone in between share the same tables.',
        media: none,
      },
      principles: [
        { title: 'Welcome first', body: 'Every newcomer gets a host and a first game.' },
        { title: 'Fair play', body: 'Strong games, generous manners.' },
      ],
      hospitality: {
        eyebrow: 'Hospitality',
        headline: 'We look after the room.',
        body: 'Good coffee, clear communication and a host who knows your name.',
        cta: { label: 'Contact us', href: '/contact' },
      },
    },
  },
  nav: {
    key: 'nav',
    version: 1,
    updatedAt: UPDATED,
    content: {
      primary: [
        { label: 'Play', href: '/play' },
        { label: 'Community', href: '/community' },
        { label: 'Stories', href: '/stories' },
        { label: 'Past events', href: '/past-events' },
      ],
      authCta: { label: 'Log in', href: '/login' },
    },
  },
  footer: {
    key: 'footer',
    version: 1,
    updatedAt: UPDATED,
    content: {
      tagline: 'Good games. Better company.',
      links: [
        { label: 'Community', href: '/community' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Refund policy', href: '/refund-policy' },
      ],
      social: [{ label: 'Instagram', href: 'https://www.instagram.com/example' }],
      legalNote: null,
    },
  },
  meta: {
    key: 'meta',
    version: 1,
    updatedAt: UPDATED,
    content: {
      siteName: "Pawn's Gambit",
      titleTemplate: "%s | Pawn's Gambit",
      description: 'Social chess in Hyderabad. Good games, better company, beginners welcome.',
      defaultCity: 'Hyderabad',
    },
  },
} satisfies Record<SiteSection, SiteSectionDto>)

export const MOCK_SETTINGS: PublicSettingsDto = deepFreeze({
  supportEmail: 'desk@example.com',
  deskContactHref: 'https://wa.me/910000000000',
  social: [{ label: 'Instagram', href: 'https://www.instagram.com/example' }],
  defaultCity: 'Hyderabad',
})
