import type { TestimonialDto } from '@/lib/api/types/testimonial'
import { deepFreeze } from '@/lib/mock/seeds/freeze'
import { mockImage } from '@/lib/mock/seeds/media'

// Testimonial seeds: fictional people, published only (quote + portrait + consent are implied by the DTO).

export const MOCK_TESTIMONIALS: readonly TestimonialDto[] = deepFreeze([
  {
    id: '6f0b1c1a-1f0e-4f5e-9a3c-000000000001',
    quote: 'I walked in alone and was playing within five minutes. Nobody made it awkward.',
    name: 'Nikhil Varma',
    descriptor: 'First-time visitor',
    portrait: mockImage('1x1', 'Portrait of Nikhil Varma'),
  },
  {
    id: '6f0b1c1a-1f0e-4f5e-9a3c-000000000002',
    quote: 'The pairings are thoughtful. I get games that are hard but never hopeless.',
    name: 'Meera Joshi',
    descriptor: 'Weekend regular',
    portrait: mockImage('1x1', 'Portrait of Meera Joshi'),
  },
  {
    id: '6f0b1c1a-1f0e-4f5e-9a3c-000000000003',
    quote: 'Strong chess, warm room. It is the one place I bring friends who do not play.',
    name: 'Karan Iyer',
    descriptor: 'Blitz regular',
    portrait: mockImage('1x1', 'Portrait of Karan Iyer'),
  },
] satisfies TestimonialDto[])
