import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

// Deliberate-violation fixtures (TASK-008). Each snippet is linted through the real eslint.config.mjs as if it lived at
// `file`. `bad` must report `rule`; `good` (the compliant spelling) must report nothing at all.

const eslint = new ESLint({ cwd: process.cwd() })

async function lint(code: string, file: string) {
  const [result] = await eslint.lintText(code, { filePath: `${process.cwd()}/${file}` })
  return (result?.messages ?? []).map((m) => `${m.ruleId ?? 'parse'}: ${m.message}`)
}

interface Fixture {
  name: string
  file: string
  rule: string | RegExp
  bad: string
  good: string
}

const C = 'src/components/ui/Sample.tsx'
const P = 'src/app/(public)/page.tsx'

const fixtures: Fixture[] = [
  // ---- M2: barrels ----
  {
    name: 'barrel: import of a directory index',
    file: C,
    rule: 'no-restricted-imports',
    bad: "import { Button } from '@/components/ui/index'\nexport const A = () => <Button />\n",
    good: "import { Button } from '@/components/ui/Button'\nexport const A = () => <Button />\n",
  },
  {
    name: 'barrel: relative parent import',
    file: 'src/features/auth/LoginForm.tsx',
    rule: 'no-restricted-imports',
    bad: "import { x } from '..'\nexport const A = () => <p>{x}</p>\n",
    good: "import { x } from '../x'\nexport const A = () => <p>{x}</p>\n",
  },
  {
    name: 'barrel: third-party barrel root (lodash)',
    file: 'src/lib/format/sample.ts',
    rule: 'no-restricted-imports',
    bad: "import { debounce } from 'lodash'\nexport const d = debounce\n",
    good: 'export const d = (n: number) => n\n',
  },
  {
    name: 'barrel: unified radix-ui package',
    file: C,
    rule: 'no-restricted-imports',
    bad: "import { Dialog } from 'radix-ui'\nexport const A = () => <Dialog.Root />\n",
    good: "import * as Dialog from '@radix-ui/react-dialog'\nexport const A = () => <Dialog.Root />\n",
  },
  {
    name: 'barrel: icon package',
    file: C,
    rule: 'no-restricted-imports',
    bad: "import { Check } from 'lucide-react'\nexport const A = () => <Check />\n",
    good: "import { Check } from '@/components/ui/icons/Check'\nexport const A = () => <Check />\n",
  },
  {
    name: 'own barrel: export * from',
    file: 'src/lib/format/money.ts',
    rule: 'no-restricted-syntax',
    bad: "export * from './date'\n",
    good: 'export const money = (paise: number) => paise / 100\n',
  },
  {
    name: 'own barrel: export { x } from',
    file: 'src/lib/format/money.ts',
    rule: 'no-restricted-syntax',
    bad: "export { formatDate } from './date'\n",
    good: "import { formatDate } from './date'\nexport const f = formatDate\n",
  },
  // ---- M1 ----
  {
    name: 'M1: cross-folder relative import',
    file: C,
    rule: 'no-restricted-imports',
    bad: "import { env } from '../../lib/env/env.public'\nexport const A = () => <p>{String(env)}</p>\n",
    good: "import { env } from '@/lib/env/env.public'\nexport const A = () => <p>{String(env)}</p>\n",
  },
  // ---- M7 ----
  {
    name: 'M7: component imports the mock',
    file: C,
    rule: 'no-restricted-imports',
    bad: "import { createMockApi } from '@/lib/mock/adapter'\nexport const A = () => <p>{String(createMockApi)}</p>\n",
    good: "import { useApi } from '@/lib/api/adapters/index.browser'\nexport const A = () => <p>{String(useApi)}</p>\n",
  },
  {
    name: 'M7: component calls fetch',
    file: C,
    rule: 'no-restricted-globals',
    bad: "export async function load() { return fetch('/api/x') }\n",
    good: "import { useApi } from '@/lib/api/adapters/index.browser'\nexport function useLoad() { return useApi() }\n",
  },
  {
    name: 'storage: localStorage outside lib/storage',
    file: 'src/lib/hooks/useThing.ts',
    rule: 'no-restricted-globals',
    bad: "export const read = () => localStorage.getItem('x')\n",
    good: "import { readVersioned } from '@/lib/storage/versioned'\nexport const read = () => readVersioned('x')\n",
  },
  // ---- M12 ----
  {
    name: 'M12: non-literal dynamic import',
    file: 'src/lib/hooks/useThing.ts',
    rule: 'no-restricted-syntax',
    bad: 'export const load = (name: string) => import(name)\n',
    good: "export const load = () => import('@/lib/format/money')\n",
  },
  // ---- nested components ----
  {
    name: 'nested component definition',
    file: C,
    rule: 'react/no-unstable-nested-components',
    bad: 'export function Outer() {\n  const Inner = () => <span>x</span>\n  return <div><Inner /></div>\n}\n',
    good: "import { Inner } from '@/components/ui/Inner'\nexport function Outer() {\n  return <div><Inner /></div>\n}\n",
  },
  // ---- hooks ----
  {
    name: 'react-hooks/exhaustive-deps is an error',
    file: C,
    rule: 'react-hooks/exhaustive-deps',
    bad: "'use client'\nimport { useEffect } from 'react'\nexport function A({ id }: { id: string }) {\n  useEffect(() => { document.title = id }, [])\n  return <p>{id}</p>\n}\n",
    good: "'use client'\nimport { useEffect } from 'react'\nexport function A({ id }: { id: string }) {\n  useEffect(() => { document.title = id }, [id])\n  return <p>{id}</p>\n}\n",
  },
  // ---- tokens ----
  {
    name: 'tokens: raw hex colour in a class',
    file: C,
    rule: 'no-restricted-syntax',
    bad: 'export const A = () => <p className="bg-[#ff0000] p-4">x</p>\n', // token-check-ignore: deliberate violation fixture
    good: 'export const A = () => <p className="bg-copper p-4">x</p>\n',
  },
  {
    name: 'tokens: arbitrary spacing value',
    file: C,
    rule: 'no-restricted-syntax',
    bad: 'export const A = () => <p className="flex p-[13px]">x</p>\n', // token-check-ignore: deliberate violation fixture
    good: 'export const A = () => <p className="flex pb-[var(--sticky-h)]">x</p>\n',
  },
  {
    name: 'tokens: arbitrary value behind a variant, in a template literal',
    file: C,
    rule: 'no-restricted-syntax',
    bad: "export const A = ({ on }: { on: boolean }) => <p className={`md:mt-[7px] ${on ? 'a' : 'b'}`}>x</p>\n", // token-check-ignore: deliberate violation fixture
    good: "export const A = ({ on }: { on: boolean }) => <p className={`md:mt-2 ${on ? 'a' : 'b'}`}>x</p>\n",
  },
  {
    name: 'tokens: raw colour in an inline style',
    file: C,
    rule: 'no-restricted-syntax',
    bad: "export const A = () => <p style={{ color: '#123456' }}>x</p>\n", // token-check-ignore: deliberate violation fixture
    good: "export const A = () => <p style={{ objectPosition: '50% 20%' }}>x</p>\n",
  },
  {
    name: 'mobile: 100vh',
    file: C,
    rule: 'no-restricted-syntax',
    bad: 'export const A = () => <p className="h-screen">x</p>\n',
    good: 'export const A = () => <p className="min-h-dvh">x</p>\n',
  },
  // ---- M6: server/client boundary ----
  {
    name: "boundary: 'use client' imports server-only",
    file: 'src/features/auth/LoginForm.tsx',
    rule: 'no-restricted-syntax',
    bad: "'use client'\nimport 'server-only'\nexport const A = () => <p>x</p>\n",
    good: "'use client'\nexport const A = () => <p>x</p>\n",
  },
  {
    name: "boundary: 'use client' imports lib/data/public",
    file: 'src/features/auth/LoginForm.tsx',
    rule: 'no-restricted-syntax',
    bad: "'use client'\nimport { getEventBySlug } from '@/lib/data/public/getEventBySlug'\nexport const A = () => <p>{String(getEventBySlug)}</p>\n",
    good: "'use client'\nimport type { Props } from '@/lib/data/public/getEventBySlug'\nexport const A = (p: Props) => <p>{String(p)}</p>\n",
  },
  {
    name: "boundary: 'use client' imports env.server and *.server modules",
    file: 'src/components/ui/Sample.tsx',
    rule: 'no-restricted-syntax',
    bad: "'use client'\nimport { envServer } from '@/lib/env/env.server'\nexport const A = () => <p>{String(envServer)}</p>\n",
    good: "'use client'\nimport { envPublic } from '@/lib/env/env.public'\nexport const A = () => <p>{String(envPublic)}</p>\n",
  },
  {
    name: 'boundary: Server Component page imports a browser-only module',
    file: P,
    rule: 'no-restricted-syntax',
    bad: "import { useMediaQuery } from '@/lib/hooks/useMediaQuery'\nexport default function Page() { return <p>{String(useMediaQuery)}</p> }\n",
    good: "import { formatDate } from '@/lib/format/date'\nexport default function Page() { return <p>{String(formatDate)}</p> }\n",
  },
  {
    name: 'boundary: Server Component page uses state without use client',
    file: P,
    rule: 'no-restricted-syntax',
    bad: "import { useState } from 'react'\nexport default function Page() { const [n] = useState(0); return <p>{n}</p> }\n",
    good: "'use client'\nimport { useState } from 'react'\nexport function Counter() { const [n] = useState(0); return <p>{n}</p> }\n",
  },
  // ---- security sinks (M10, F-14) ----
  {
    name: 'M10: dangerouslySetInnerHTML',
    file: C,
    rule: 'react/no-danger',
    bad: 'export const A = ({ h }: { h: string }) => <div dangerouslySetInnerHTML={{ __html: h }} />\n',
    good: 'export const A = ({ h }: { h: string }) => <div>{h}</div>\n',
  },
  {
    name: 'F-14: innerHTML assignment',
    file: 'src/lib/hooks/useThing.ts',
    rule: 'no-restricted-syntax',
    bad: 'export const f = (el: HTMLElement, h: string) => { el.innerHTML = h }\n',
    good: 'export const f = (el: HTMLElement, h: string) => { el.textContent = h }\n',
  },
  {
    name: 'F-14: eval',
    file: 'src/lib/hooks/useThing.ts',
    rule: 'no-eval',
    bad: 'export const f = (s: string) => eval(s)\n',
    good: 'export const f = (s: string) => JSON.parse(s)\n',
  },
  {
    name: 'F-14: external link without rel',
    file: C,
    rule: 'react/jsx-no-target-blank',
    bad: 'export const A = () => <a href="https://example.com" target="_blank">x</a>\n',
    good: 'export const A = () => <a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>\n',
  },
  // ---- browser floor (5.2) ----
  {
    name: 'floor: Promise.withResolvers',
    file: 'src/lib/hooks/useThing.ts',
    rule: 'no-restricted-syntax',
    bad: 'export const d = Promise.withResolvers<number>()\n',
    good: 'export const d = new Promise<number>((resolve) => resolve(1))\n',
  },
  // ---- M8 ----
  {
    name: 'M8: default export outside Next special files',
    file: C,
    rule: 'import/no-default-export',
    bad: 'export default function Sample() { return <p>x</p> }\n',
    good: 'export function Sample() { return <p>x</p> }\n',
  },
  {
    name: 'M8: two components in one file',
    file: C,
    rule: 'react/no-multi-comp',
    bad: 'export function A() { return <p>a</p> }\nexport function B() { return <p>b</p> }\n',
    good: 'export function A() { return <p>a</p> }\n',
  },
  // ---- a11y ----
  {
    name: 'a11y: img without alt',
    file: C,
    rule: 'jsx-a11y/alt-text',
    bad: 'import Image from \'next/image\'\nexport const A = () => <Image src="/x.png" width={1} height={1} />\n',
    good: 'import Image from \'next/image\'\nexport const A = () => <Image src="/x.png" width={1} height={1} alt="Board" />\n',
  },
  {
    name: 'a11y: click handler on a div (full recommended set)',
    file: C,
    rule: /^jsx-a11y\/(click-events-have-key-events|no-static-element-interactions)$/,
    bad: 'export const A = ({ go }: { go: () => void }) => <div onClick={go}>x</div>\n',
    good: 'export const A = ({ go }: { go: () => void }) => <button type="button" onClick={go}>x</button>\n',
  },
  {
    name: 'a11y: anchor without content',
    file: C,
    rule: 'jsx-a11y/anchor-has-content',
    bad: 'export const A = () => <a href="/x" />\n',
    good: 'export const A = () => <a href="/x">Events</a>\n',
  },
]

const matches = (messages: string[], rule: string | RegExp) =>
  messages.some((m) => (typeof rule === 'string' ? m.startsWith(`${rule}:`) : rule.test(m.split(':')[0] ?? '')))

describe('lint rules fail on bad code and pass on good code', () => {
  for (const f of fixtures) {
    it(f.name, async () => {
      const bad = await lint(f.bad, f.file)
      expect(matches(bad, f.rule), `expected ${String(f.rule)} in:\n${bad.join('\n')}`).toBe(true)
      const good = await lint(f.good, f.file)
      expect(good, `compliant code must lint clean:\n${good.join('\n')}`).toEqual([])
    })
  }

  it('own barrel: an index.ts module is rejected, a named module is not', async () => {
    const bad = await lint('export const x = 1\n', 'src/components/ui/index.ts')
    expect(matches(bad, 'no-restricted-syntax')).toBe(true)
    expect(await lint('export const x = 1\n', 'src/components/ui/thing.ts')).toEqual([])
  })

  it('exempts what the architecture exempts', async () => {
    // Next special files may default-export; lib/seo/JsonLd.tsx is the single dangerouslySetInnerHTML site (M10);
    // lib/api may call fetch (M7 applies to components and features).
    expect(await lint('export default function Page() { return <p>x</p> }\n', P)).toEqual([])
    const jsonLd =
      'export function JsonLd({ h }: { h: string }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: h }} /> }\n'
    const noDanger = (await lint(jsonLd, 'src/lib/seo/JsonLd.tsx')).filter((m) => m.startsWith('react/no-danger'))
    expect(noDanger).toEqual([])
    expect(await lint("export const get = () => fetch('/api/x')\n", 'src/lib/api/server/fetch.ts')).toEqual([])
  })
})
