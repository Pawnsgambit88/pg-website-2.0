---
id: OPS-002
type: architecture
feature_id: FEAT-001
version: 1
status: draft
title: "CI hardening spec: dependency gate, pinned actions, account 2FA, environment scoping, npm supply-chain controls (TASK-128, SEC-001 F-19)"
context: "SEC-001 finding F-19 and launch condition 10 require a dependency severity gate, pinned CI actions, least-privilege CI tokens, Vercel environment scoping, 2FA and branch protection, a package age or provenance rule, and a patch SLA. ARCH-001 17.1 states the intent in one table row; nothing exists yet: the repository has no .github directory, no CI, no CODEOWNERS and no CONTRIBUTING.md, and web/ is not scaffolded (TASK-007). TASK-128 asks the architect to specify the rules so that TASK-007, 008, 009, 099, 116 and 121 build CI that matches."
current_state: "No CI of any kind. Legacy Vite app at the repo root is still the only code; web/ does not exist. Hosting is decided (Vercel sin1, Railway Singapore, Supabase Singapore) but no environment variables are scoped yet. The npm audit of the legacy root lockfile (run on a temporary copy, 2026-10-22) already reports one high and two moderate production findings, which shows the gate would have teeth. This document is a specification: it creates no .github files and changes no other file."
proposed_solution: "One required aggregate GitHub Actions check (ci-gate) that depends on small single-purpose jobs: static checks (npm run check), a production-profile build against a contract stub with check:build-output and check:bundle, a mock-profile build with Playwright smoke plus axe, a supply-chain job (audit gate with typed expiring exceptions, lockfile lint, release-age, install-script inventory, licences, signatures), a secret scan and a workflow-lint job. All third-party actions are pinned by full commit SHA, every workflow starts from permissions {} and holds no production secrets; deployment stays with the Vercel Git integration so GitHub never needs a Vercel token. Repository rulesets, CODEOWNERS, Vercel/Railway environment scoping and 2FA on every account are specified as owner-configured controls with a checklist. Mock code is kept out of production by an explicit build chain (no lifecycle hooks), a sentinel scan with a positive control, route-absence checks and a post-deploy smoke."
components:
  - {id: COMP-CI-01, name: "CI workflow suite (.github/workflows)", responsibility: "ci.yml (PR and main), nightly.yml (schedule: full matrix, Lighthouse, full audit), optional post-deploy smoke; permissions {} by default; aggregate ci-gate job", changes: ["New"]}
  - {id: COMP-CI-02, name: "Supply-chain script (web/scripts/ci/supply-chain.mjs)", responsibility: "Zero-dependency Node script with subcommands: workflow-pins, lockfile, release-age, exceptions, audit, licenses, install-scripts", changes: ["New"]}
  - {id: COMP-CI-03, name: "Policy exceptions registry (web/security/policy-exceptions.json)", responsibility: "Typed, owned, expiring exceptions for audit findings, release-age, install scripts and licences; validated in CI", changes: ["New"]}
  - {id: COMP-CI-04, name: "npm configuration (web/.npmrc, package.json engines)", responsibility: "ignore-scripts, allow-git, engine-strict, min-release-age, exact-save policy", changes: ["New"]}
  - {id: COMP-CI-05, name: "Repository protection (rulesets, CODEOWNERS, PR template, SECURITY.md)", responsibility: "Required reviews and checks on main, code-owner review of security-sensitive paths, tag protection", changes: ["New", "Owner-configured"]}
  - {id: COMP-CI-06, name: "Dependabot configuration (.github/dependabot.yml)", responsibility: "Weekly npm and github-actions updates with cooldown and grouping; security updates enabled", changes: ["New"]}
  - {id: COMP-CI-07, name: "Environment and secret scoping (Vercel, Railway, GitHub Environments)", responsibility: "Per-environment variable matrix, Sensitive flags, no production secrets in GitHub or previews", changes: ["New", "Owner-configured"]}
  - {id: COMP-CI-08, name: "Mock-leak assertions (guard-env, check:build-output, post-deploy smoke)", responsibility: "Fail closed when mock code, mock routes or the mock banner reach a production profile", changes: ["Extends TASK-007 and TASK-121"]}
  - {id: COMP-CI-09, name: "Account hygiene register", responsibility: "2FA, token, role and offboarding requirements for GitHub, Vercel, Railway, Supabase, npm, Razorpay, DNS and recovery email", changes: ["New", "Owner-configured"]}
data_changes:
  - {type: other, name: "web/security/policy-exceptions.json", description: "New typed exceptions file; CODEOWNERS-protected"}
  - {type: other, name: "web/.npmrc", description: "ignore-scripts, allow-git, engine-strict, min-release-age"}
  - {type: other, name: "web/budgets.json", description: "Consumed unchanged from TASK-007/099; CI fails on growth over 5 KB without an update in the same PR (ARCH-001 14.3)"}
integrations:
  - {name: "GitHub (Actions, rulesets, Dependabot, secret scanning)", purpose: "CI execution and repository policy", failure_mode: "Actions outage blocks merges; no bypass except documented break-glass"}
  - {name: "Vercel (Git integration, environments)", purpose: "Build and deploy; holds production secrets", failure_mode: "Failed prebuild guard or check:build-output fails the deployment"}
  - {name: "Railway", purpose: "Backend secrets and environments", failure_mode: "Secret mismatch with Vercel breaks revalidation (401), not security"}
  - {name: "npm registry", purpose: "Audit, signatures, release-age lookups", failure_mode: "Registry outage fails the supply-chain job closed (exit code 2, rerun)"}
security:
  authentication: "Human accounts protected by 2FA (phishing-resistant where offered); CI uses the ephemeral GITHUB_TOKEN only; no long-lived deploy tokens in GitHub."
  authorization: "Least-privilege workflow permissions; main changes only by reviewed PR; CODEOWNERS on security-sensitive paths; production secrets reachable only from Vercel production and Railway production."
  threats:
    - "Malicious or compromised npm package (install script, typosquat, hijacked maintainer)"
    - "Compromised or retagged third-party GitHub Action"
    - "Pull request from a fork or a compromised contributor attempting to read secrets or alter workflows"
    - "Production secrets exposed to preview or fork builds"
    - "Mock adapter, mock routes or fixtures shipped to production"
    - "Account takeover of GitHub, Vercel, Railway, Supabase, DNS or recovery email"
    - "Known-vulnerable dependency merged or left unpatched"
  mitigations:
    - "Dependency gate with expiring exceptions, lockfile lint, release-age rule, ignore-scripts with inventory, signature check, licence check"
    - "SHA-pinned first-party actions, permissions {}, persist-credentials false, no pull_request_target, workflow lint"
    - "Rulesets, CODEOWNERS, human-only approvals, no admin bypass"
    - "Environment scoping matrix, Sensitive variables, secret-free Preview scope, Vercel fork protection"
    - "Sentinel scan with positive control, explicit build chain, route-absence checks, post-deploy smoke"
    - "2FA and token policy on every account, quarterly access review"
observability:
  logs: ["Job summaries with audit table, budget deltas, exceptions about to expire", "Scheduled workflow failure emails"]
  metrics: ["Open exceptions and age of the oldest", "Time from advisory to merged fix against SLA", "Dependabot backlog", "PR CI wall time and Actions minutes"]
  alerts: ["Nightly audit failure opens an issue labelled security", "Exception expiring within 7 days", "Failed scheduled run"]
performance:
  expected_load: "Estimated 25 to 35 job-minutes per PR push (unmeasured); nightly run once per day"
  latency_requirements: "Target PR feedback at or under 12 minutes wall time with jobs in parallel (to be measured in TASK-007/009)"
  scalability: "Jobs are independent; Playwright can shard later; npm and Playwright browser caches keyed by lockfile and Playwright version"
migration:
  required: false
  strategy: "Staged adoption tied to the build tasks (section 14): owner console settings before the first web/ merge, then workflow jobs added as TASK-007, 008, 009, 121 and 099 land."
  rollback: "Each job can be removed from ci-gate needs without touching others; repository rules can be relaxed only through a logged owner action; exceptions registry is plain JSON in git."
risks:
  - {id: RISK-CI-01, description: "Owner console settings are not enforceable by code and may silently drift or never be applied", severity: high, mitigation: "Appendix B checklist, TASK-101 verifies each item with screenshots or API output, quarterly re-attestation"}
  - {id: RISK-CI-02, description: "ignore-scripts=true also disables prebuild and postbuild hooks, so the production guards in ARCH-001 6.3 and 18.3 would silently not run", severity: high, mitigation: "Guards are chained explicitly in the build script (section 9); a CI test builds with VERCEL_ENV=production and mocks on and expects failure"}
  - {id: RISK-CI-03, description: "A production-profile build needs a backend at build time (ARCH-001 7.6), so CI needs a contract stub that does not exist yet", severity: medium, mitigation: "Decision OD-CI-01; stub server is a small in-repo deliverable"}
  - {id: RISK-CI-04, description: "Branch protection and several scanning features may be unavailable on a private repository on a free plan", severity: medium, mitigation: "Verify plan and visibility first (U-01); fall back to in-repo equivalents listed per control"}
  - {id: RISK-CI-05, description: "Solo maintainer cannot self-approve under required reviews", severity: medium, mitigation: "Name a second reviewer or accept a documented bypass actor with after-the-fact review (OD-CI-04)"}
  - {id: RISK-CI-06, description: "Strict gates create friction and tempt bypass", severity: medium, mitigation: "Typed exceptions with expiry give a fast legitimate path; admin bypass disabled"}
decisions:
  - {id: DEC-CI-01, decision: "Deploy through the Vercel Git integration; GitHub Actions holds no production secrets and no Vercel token", rationale: "Removes the largest CI secret exposure and the fork/PR secret problem entirely", alternatives: ["Deploy from Actions with Vercel CLI and VERCEL_TOKEN"]}
  - {id: DEC-CI-02, decision: "A single aggregate job ci-gate is the only required status check", rationale: "Avoids stuck pending checks from path filters and renamed jobs", alternatives: ["Require each job by name"]}
  - {id: DEC-CI-03, decision: "Two build profiles in CI: production-profile (mocks off, contract stub) for check:build-output and check:bundle; mock-profile for Playwright", rationale: "Budgets and mock-absence must be measured on what ships; E2E runs on mocks", alternatives: ["One mock build for everything"]}
  - {id: DEC-CI-04, decision: "Supply-chain checks live in one zero-dependency in-repo script with unit-tested fixtures", rationale: "Avoids adding a third-party package to police third-party packages", alternatives: ["audit-ci", "lockfile-lint", "better-npm-audit", "Socket or Snyk app"]}
  - {id: DEC-CI-05, decision: "Dependabot rather than Renovate", rationale: "Native, no extra app or permissions, covers npm and github-actions, supports cooldown and grouping", alternatives: ["Renovate"]}
  - {id: DEC-CI-06, decision: "One typed exceptions registry with mandatory owner, approver and expiry", rationale: "One review surface, one validator, one CODEOWNERS rule", alternatives: ["Per-tool ignore files"]}
  - {id: DEC-CI-07, decision: "Build guards run through an explicit script chain, never through npm lifecycle hooks", rationale: "ignore-scripts=true skips pre and post hooks of project scripts", alternatives: ["Keep prebuild and postbuild and drop ignore-scripts"]}
  - {id: DEC-CI-08, decision: "Keep npm; use its native min-release-age, allow-git, allowScripts and audit-level controls", rationale: "ARCH-001 DEC-002 chose npm; the controls pnpm offered now exist in npm (verified in local npm 12 docs; bundled npm versions to be checked)", alternatives: ["Switch to pnpm"]}
  - {id: DEC-CI-09, decision: "Recommend a separate Vercel project for web/ and leave the legacy project untouched until TASK-107", rationale: "Prevents env, region and domain changes from affecting the live legacy deployment", alternatives: ["Reuse the existing project with a changed root directory"]}
  - {id: DEC-CI-10, decision: "Generate a CycloneDX SBOM per main build; defer build-provenance attestations", rationale: "Vercel builds the deployed artifact, so an Actions-attested artifact is not what ships", alternatives: ["Attest the Actions build artifact"]}
assumptions:
  - "web/ is an independent npm package with its own lockfile (ARCH-001 5.1, 6.1) and CI runs from web/."
  - "Node 24 LTS and npm are used as in ARCH-001 5.1; the bundled npm version differs between local, GitHub runners and Vercel."
  - "No production secret is needed by any CI job; tests use generated dummy secrets."
  - "The repository lives at github.com/Pawnsgambit88/PG_Website; visibility and plan are not known."
  - "Feature availability claims for GitHub, Vercel, Railway and Supabase are from memory and unverified (no web access during this task); section 16 lists each as a verify item."
open_decisions:
  - "OD-CI-01 Contract stub server for production-profile CI builds (recommended) versus relying on Vercel builds only"
  - "OD-CI-02 Minimum release age (proposed 7 days) and security-fix exception floor (proposed 1 day)"
  - "OD-CI-03 Patch SLA values (proposed 2/7/30 days) and framework security release window (proposed 3 days)"
  - "OD-CI-04 Reviewer model for a small team (second reviewer, or bypass actor with post-hoc review)"
  - "OD-CI-05 Exact direct-dependency pinning policy (exact versus ARCH-001 tilde ranges for the four framework packages)"
  - "OD-CI-06 Separate Vercel project for web/ (recommended)"
---

# OPS-002 CI hardening: specification

**ID:** OPS-002 | **Type:** architecture (ops specification) | **Feature:** FEAT-001 | **Task:** TASK-128 | **Version:** 1 | **Status:** draft | **Date:** 2026-10-22

**Schema note.** `schemas/architecture.schema.yaml` constrains `id` to `^ARCH-[0-9]{3,}$`. This document keeps the id `OPS-002` that the task requested, so it does not satisfy that one pattern; every other required field is present. It stays `draft` for that reason and because the owner decisions in section 16 are open. Either relax the pattern for ops documents or allocate an `ARCH-` id before promoting to `ready` (the backend-contract companion reuses `ARCH-001`, which is the other precedent).

## 0. Scope and how to use this document

**What this is.** The design for TASK-128: which CI stages gate a merge, which commands they run, how the dependency gate, pinned actions, environment scoping, supply-chain rules, 2FA and mock-leak assertions work, and which settings only the owner can apply in third-party consoles. It is the input for the implementers of TASK-007 (scaffold, `.npmrc`), TASK-008 (lint), TASK-009 (Playwright), TASK-121 (`check:build-output`), TASK-099 (budgets), TASK-116 (prerender suite), TASK-126 (Firewall and Deployment Protection) and TASK-101 (security sign-off).

**What this is not.** It is not workflow code to run now. Appendix C is a template with placeholders (`<FULL_40_CHAR_COMMIT_SHA>`); no real SHA is stated anywhere in this document, because I could not look any up. It creates no `.github/` file, and it does not edit CONTRIBUTING.md, POLICY.md, ARCH-001 or the plan. Section 17 lists the edits those documents need.

**Reading order.** Section 3 for the summary, section 4 for the gates, Appendix A for the full controls register (81 controls), Appendix B for what the owner must configure by hand, section 16 for open decisions and things to verify.

**Words.** MUST, SHOULD and MAY follow RFC 2119. "Profile" means a build configuration: *production-profile* (mocks off, `VERCEL_ENV=production`, real adapter) or *mock-profile* (`NEXT_PUBLIC_USE_MOCKS=true`, `VERCEL_ENV=preview`).

## 1. Context

- SEC-001 rated F-19 low but made it a **pre-launch condition** (condition 10: dependency gate, pinned actions, 2FA, env scoping). Annex C lists what exists (lockfile, `npm ci`, `ignore-scripts=true`, audit, gitleaks, Dependabot) and what is missing: severity policy with owner and SLA, pinned actions, least-privilege CI tokens, Vercel env scoping, 2FA and branch protection, a package provenance or minimum-age rule, and a rule that security releases of Next, React and Radix are applied within days.
- SEC-001 F-09 (mock mode reaching production) and F-18 (Deployment Protection on previews) overlap with CI and environment scoping, so they are covered here.
- ARCH-001 17.1 ("Dependency risk (F-19)") states the intent in one row; ARCH-001 28.5 currently marks F-19 "Deferred to backend plan", which is superseded for the web repository by this document (section 17 asks for the edit).
- The app is mock-backed until a new backend exists, so the supply chain of the **frontend build** is the main exposed surface right now. The backend (Railway) has its own supply chain and CI, which belongs to the backend plan; section 11 states the boundary.

## 2. Current state (verified 2026-10-22 unless marked)

| Fact | Evidence |
|---|---|
| No `.github/` directory, no workflows, no CODEOWNERS, no CONTRIBUTING.md, no `web/` | Directory listing of the repo root |
| Remote is `https://github.com/Pawnsgambit88/PG_Website.git`; visibility and plan unknown | `git remote -v` |
| Only `.env.example` is tracked; no `.env`, `.env.local` or `backend/.env` path appears in git history | `git ls-files`, `git log --all -- <paths>` (path check only, not a content scan) |
| Legacy root app is Vite with a SPA rewrite in the root `vercel.json`; it is probably the live Vercel project | `vercel.json`, `package.json` |
| Legacy lockfile is `lockfileVersion` 3, 289 packages; `license` is present on 288 and `hasInstallScript` is recorded (one optional package, `fsevents`) | Inspected a temporary copy of `package-lock.json` |
| `npm audit --omit=dev` on that temporary copy reports 3 production findings: 1 high, 2 moderate (react-router chain, fflate chain) | Run on a copy; repository untouched. Registry was reachable. |
| `npm audit --json` shape: `auditReportVersion`, `vulnerabilities{ name -> {severity, via[], range, fixAvailable}}`, `metadata.vulnerabilities`; `via` mixes advisory objects (`source`, `url`, `severity`) with strings for transitive links | Same run. The gate must judge advisory-level severity, not only the package-level roll-up. |
| Local tooling is Node 24.19.0 and npm 12.0.2. Its docs list `min-release-age`, `min-release-age-exclude`, `allow-git`, `audit-level`, `ignore-scripts`, `strict-allow-scripts` and a project `allowScripts` field. | `npm config ls -l`, local npm docs. **Bundled npm on GitHub runners and on Vercel for Node 24 may be older**: see U-02. |
| Working tree shows the legacy `src/` deleted but not committed and `backend/` untracked, while the plan says `src/` stays until TASK-107 | `git status` snapshot; flagged for the owner, outside CI scope |

**Inconsistencies found in the source documents (this spec resolves them as noted):**

| # | Inconsistency | Resolution here |
|---|---|---|
| I-1 | ARCH-001 6.3 says `prebuild` runs `guard-env.ts` and 18.3 runs `check:build-output` as `postbuild`, but TASK-007 sets `.npmrc` `ignore-scripts=true`, and npm skips `pre` and `post` hooks of project scripts when that is set (npm config docs: explicit `npm run x` still runs, hooks do not) | Explicit chain, DEC-CI-07, section 9 |
| I-2 | ARCH-001 6.1 names `.dependency-cruiser.cjs`; TASK-121 names `web/dependency-cruiser.js` | CODEOWNERS uses the glob `/web/*dependency-cruiser*`; implementers should settle one name |
| I-3 | ARCH-001 7.6: a failed prerender fetch fails the build, so a production-profile build cannot run without a backend | Contract stub, OD-CI-01 |
| I-4 | ARCH-001 14.6 runs Lighthouse in mock mode while 14.3 budgets describe shipping bundles; a mock-profile bundle includes mock code | Bundle budget measured on the production-profile build; Lighthouse nightly on mock-profile is informational until TASK-099 decides |
| I-5 | ARCH-001 28.5 says F-19 deferred to the backend plan; SEC-001 condition 10 and TASK-128 say it is a web launch gate | This document owns it for web/ |
| I-6 | SLA of 3 days for framework security releases conflicts with a 7 day minimum release age | Security-fix exception with an advisory id and a 1 day floor (section 6.3) |

## 3. Proposed solution

### 3.1 Principles

1. **Fail closed.** A missing input, an unreachable registry or an expired exception fails the job; it never passes silently.
2. **No production secret in GitHub.** Deployment is the Vercel Git integration; CI uses generated dummy secrets (DEC-CI-01).
3. **Minimise third-party code in the pipeline.** Only first-party `actions/*` and `github/*` actions; supply-chain checks are one zero-dependency script (DEC-CI-04).
4. **Every exception is typed, owned and expires.** There is no permanent ignore.
5. **Say what only the owner can do.** Console settings cannot be enforced from the repo, so each is listed with a verification step (Appendix B).
6. **Boring and native first.** Rulesets, CODEOWNERS, Environments, Dependabot and secret scanning before any extra tool.
7. **Reuse the commands the architecture already defines** (`npm run check`, `check:build-output`, `check:bundle`, `test:e2e`, `export:contract`); add only what the gates need.

### 3.2 Control summary

| Area | What it achieves | Section |
|---|---|---|
| Pipeline and gates | Which commands block a merge, in which job, on which profile | 4 |
| Dependency audit gate | High and critical production findings fail CI; exceptions are typed and expire | 5 |
| npm supply chain | Lockfile lint, release-age, ignore-scripts with inventory, licences, signatures, Dependabot, SBOM | 6 |
| GitHub Actions and repository | SHA pins, least privilege, no `pull_request_target`, rulesets, CODEOWNERS | 7 |
| Secrets and environments | Vercel scoping matrix, server-only versus public, secret handling, forks and previews | 8 |
| Mock leak | Guard, sentinel, route absence, scope audit, post-deploy smoke | 9 |
| Accounts | 2FA, tokens, roles, offboarding on seven systems | 10 |

Totals: **81 controls** (Appendix A): 47 are pure repo automation, 7 need both a file and an owner setting, 25 are owner-only console or process settings, 2 are written policy. Thirty-two controls therefore involve owner action (7 + 25).

## 4. CI pipeline design

### 4.1 Workflows and triggers

| Workflow | Triggers | Purpose |
|---|---|---|
| `ci.yml` | `pull_request` (base `main`), `push` (`main`), `merge_group` (only if the owner enables a merge queue) | Merge gate; ends in the aggregate job `ci-gate` |
| `nightly.yml` | `schedule` (daily, one off-peak slot), `workflow_dispatch` | Full Playwright matrix, Lighthouse, full audit including dev dependencies, exception-expiry report, opens issues on failure |
| `post-deploy-smoke.yml` | `deployment_status` filtered to the production environment, plus `schedule` (hourly) as a backstop | TASK-109 assertions incl. mock-leak checks (section 9). Blocked until cutover; spec only. |
| `dependabot.yml` | n/a (config) | Section 6.5 |

Banned triggers, enforced by the `workflows` check (section 7.1): `pull_request_target`, `workflow_run`, `issue_comment`, `pull_request_review_comment`, `repository_dispatch`. All workflows start with `permissions: {}`. `ci.yml` uses `concurrency` with `cancel-in-progress` for pull requests only, never for `main`.

All commands run from `web/` (`defaults.run.working-directory`). Runners are GitHub-hosted with a pinned image label (`ubuntu-24.04`, never `ubuntu-latest`). Every job sets `timeout-minutes`.

### 4.2 Jobs

| Job | Profile | Commands (in order) | Needs secrets | Token permissions |
|---|---|---|---|---|
| `workflows` | n/a | `node scripts/ci/supply-chain.mjs workflows scripts` (SHA pins, banned triggers, permissions, injection patterns, `npm install` ban, package-script chain); workflow lint tool if adopted | none | `contents: read` |
| `secrets` | n/a | secret scan over the diff and full tree (section 8.7) | none | `contents: read` |
| `static` | n/a | `npm ci`, `npm run check` (= typecheck + lint + check:deps + check:tokens + test, ARCH-001 6.3), `npm run export:contract` then `git diff --exit-code` on the export directory (TASK-022 determinism) | none | `contents: read` |
| `build-prod` | production | start contract stub, `npm ci`, `npm run build` (explicit chain: guard, `next build`, `check:build-output`), `npm run check:build-output` (re-run, explicit), `npm run check:bundle`; upload route-bundle stats (7 days) | none (generated dummy values) | `contents: read` |
| `e2e-smoke` | mock | `npm ci`, `npm run build` (mock profile), install Chromium and WebKit, Playwright PR smoke (section 4.3) | none | `contents: read` |
| `supply-chain` | n/a | `npm ci`, then `supply-chain.mjs` subcommands `lockfile release-age exceptions audit licenses install-scripts`, `npm audit signatures`, SBOM on `main` | none | `contents: read` |
| `ci-gate` | n/a | Fails unless every needed job result is `success` (skipped counts as failure unless the job is expected to skip) | none | `{}` |

`build-prod` and `e2e-smoke` are separate builds on purpose (DEC-CI-03): bundle budgets and the mock-absence assertions are only meaningful on a build that has no mock code, while Playwright needs the mock adapter.

### 4.3 Merge gate matrix (what blocks a merge)

Everything below is reached through the single required check `ci-gate` (DEC-CI-02). "PR" means it runs and blocks on pull requests; every row also runs on `main` pushes.

| # | Gate | Command or tool | Defined by | Blocks PR | Also nightly |
|---|---|---|---|---|---|
| G1 | Typecheck | `npm run typecheck` (inside `check`) | TASK-007 | yes | |
| G2 | Lint incl. a11y, boundary, RBP bans | `npm run lint` (inside `check`) | TASK-008 | yes | |
| G3 | Architecture lint M3 to M6, M13 | `npm run check:deps` | TASK-121 | yes | |
| G4 | Token lint (no raw hex or arbitrary spacing) | `npm run check:tokens` | TASK-010 | yes | |
| G5 | Unit, component, axe-in-jsdom, contract-against-mock | `npm test` (inside `check`) | TASK-008, 092 | yes | |
| G6 | Production build succeeds and guard passes | `npm run build` (chain) | TASK-007 | yes | |
| G7 | Build-output assertions | `npm run check:build-output` | TASK-121 | yes | |
| G8 | Bundle budget | `npm run check:bundle` (reads `budgets.json`) | TASK-007, 099 | yes | |
| G9 | Playwright PR smoke, Chromium and WebKit, mobile and desktop viewport: no horizontal scroll, touch targets, **axe serious and above**, no-JS raw-HTML prerender assertions, one CSP header per route, request-log assertions | `npm run test:e2e` (smoke selection) | TASK-009, 116, 120 | yes | full matrix |
| G10 | Contract export is up to date | `npm run export:contract` + `git diff --exit-code` | TASK-022 | yes | |
| G11 | Dependency audit policy | `supply-chain.mjs audit exceptions` | this spec, section 5 | yes | with dev scope |
| G12 | Lockfile integrity and source lint | `supply-chain.mjs lockfile` | section 6 | yes | |
| G13 | Release-age rule for changed packages | `supply-chain.mjs release-age` | section 6.3 | yes | |
| G14 | Install-script inventory | `supply-chain.mjs install-scripts` | section 6.2 | yes | |
| G15 | Licence allow-list | `supply-chain.mjs licenses` | section 6.6 | yes | |
| G16 | Registry signatures | `npm audit signatures` | section 6.7 | yes | |
| G17 | Workflow hygiene (pins, triggers, permissions, injection, `npm install` ban) | `supply-chain.mjs workflows` | section 7.1 | yes | |
| G18 | Package-script chain contains guards | `supply-chain.mjs scripts` | section 9 | yes | |
| G19 | Secret scan | section 8.7 | section 8 | yes | full history weekly |
| G20 | Mock-absence on production profile | inside G7 | section 9 | yes | |

Not blocking a PR (reported, tracked): Lighthouse mobile scores and Core Web Vitals (nightly, ARCH-001 14.6; TASK-099 may promote selected thresholds to blocking), Firefox project, the full six-viewport Playwright matrix, high-severity audit findings in dev-only dependencies (warning with SLA), moderate findings, SBOM, outdated dependencies.

Resolved inconsistency I-4 above: `check:bundle` and Lighthouse on a production-profile build is the meaningful measurement. TASK-099 decides whether Lighthouse targets the production-profile build served against the contract stub or the mock build; this spec recommends the former once TASK-099 has the stub.

### 4.4 Scripts and files to add (names proposed; owners are the downstream tasks)

| Item | Content | Added by |
|---|---|---|
| `web/package.json` `build` | `node scripts/guard-env.ts && next build && node scripts/check-build-output.ts`; no reliance on `prebuild` or `postbuild` (DEC-CI-07) | TASK-007, 121 |
| `web/package.json` misc | `"private": true`; `engines` per ARCH-001 5.1; no `postinstall`, `prepare` or other install-time script of our own | TASK-007 |
| `web/.npmrc` | Section 6.1 | TASK-007 |
| `web/vercel.json` | `regions`, `installCommand: "npm ci"`, `buildCommand: "npm run build"` (code-reviewed instead of console-set) | TASK-007, 115 |
| `web/scripts/ci/supply-chain.mjs` and tests | Zero-dependency Node script; subcommands `workflows scripts lockfile release-age exceptions audit licenses install-scripts`; unit tests with fixtures (section 4.6); exit 0 pass, 1 policy failure, 2 tooling error (also fails CI) | TASK-128 follow-on (owner to be named, section 17) |
| `web/security/policy-exceptions.json` | Section 5.4 | same |
| `web/e2e/` tagging | A `@smoke` tag or Playwright project filter selecting the PR set | TASK-009 |
| `web/scripts/ci/contract-stub.mjs` | Tiny HTTP server serving contract-valid fixtures for the build-time fetches (OD-CI-01) | TASK-111 or 007 |
| `.github/workflows/{ci,nightly,post-deploy-smoke}.yml`, `.github/dependabot.yml`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, `SECURITY.md`, `CONTRIBUTING.md`, `.github/workflows/POLICY.md` | Appendix C and section 17 | TASK-128 follow-on |
| `web/.gitignore` | `.env`, `.env.*`, `!.env.example`, `.next`, `playwright-report`, `test-results` (the repo root `.gitignore` does not ignore a plain `.env`, only `*.local` and `backend/.env`) | TASK-007 |

### 4.5 Contract stub for production-profile builds

ARCH-001 7.6 makes a failed prerender fetch fail the build, and a production profile has `NEXT_PUBLIC_USE_MOCKS` off, so it needs a backend at build time. Options: (a) a stub HTTP server that returns schema-valid responses for the public reads, started in the job and pointed to by `API_INTERNAL_URL`; (b) run the mock adapter in a "production-shaped" profile; (c) skip the production-profile build in CI and rely on Vercel. Recommendation (a), generated from the `export:contract` examples so it cannot drift (OD-CI-01). (b) defeats the purpose of the mock-absence assertion; (c) moves budgets and mock assertions out of the PR gate and leaves them to a failed deployment after merge.

### 4.6 Verifying the pipeline itself (TASK-128 "CI verification")

The gate is only trustworthy if it is seen to fail. Two layers:

1. **Fixture tests** for `supply-chain.mjs` (run in `static`): an unpinned action; a tag-pinned action with a SHA-looking tag; `pull_request_target`; `${{ github.event.pull_request.title }}` inside `run:`; an `npm install` step; a `secrets.FOO` reference; audit JSON with a high advisory (via nested `via`), with a moderate advisory carrying CVSS 7.5, with an expired exception, with a stale exception; a lockfile with a git dependency, an `http:` resolved URL, a non-registry host, a missing `integrity`, and the same name and version with a changed integrity; a forbidden and a composite SPDX licence; an unlisted install-script package; a `build` script without the guard.
2. **Rollout drills** (section 14, step 7): throwaway PRs that must be red for the stated reason (unpinned action, planted high-severity dependency, secret-shaped string, mock sentinel in production profile, `NEXT_PUBLIC_USE_MOCKS=true` with `VERCEL_ENV=production`, budget breach). Record the run URLs in the TASK-101 evidence.

### 4.7 Time and cost (unmeasured estimates)

Target 12 minutes PR wall time with jobs in parallel; npm download cache and Playwright browser cache keyed by lockfile hash and Playwright version; no `node_modules` cache so `npm ci` always re-verifies integrity. Playwright smoke can be sharded later. Actions minutes on a private repository are a cost to confirm (U-18).

## 5. Dependency audit gate

### 5.1 Policy

| Scope | Critical | High | Moderate | Low and info |
|---|---|---|---|---|
| **Production** dependencies (`npm audit --omit=dev`) | **Block** | **Block** | Warn; fix within SLA | Ignore (listed nightly) |
| **Dev** dependencies (full tree minus production-only) | **Block** | Warn; fix within SLA; nightly issue | Ignore | Ignore |

Notes:

- **Effective severity** is the highest of the advisory's own severity and the CVSS v3 band (score 9.0 or above critical, 7.0 or above high) when a score is present. Reason: the legacy lockfile audit (section 2) contains an advisory labelled moderate with CVSS 7.5 (fflate), so trusting the label alone under-reports. The script reads advisory objects from `via[]` recursively, not the package-level roll-up that `npm audit --audit-level` uses.
- This is deliberately slightly softer than TASK-128's literal text ("dependencies with severity >= high") for dev-only packages and matches ARCH-001 17.1 ("high/critical in production"). Rationale: dev-only high advisories are frequently ReDoS or CLI issues not reachable in CI; a hard block would train people to bypass. A critical dev advisory still blocks. If the owner prefers the literal reading, set the dev high row to Block; the exception process in 5.4 absorbs the noise (OD-CI-08).
- **Fix available** changes eligibility for exceptions, not the gate: if `fixAvailable` is true and not a semver-major, the fix is the default and an exception may last at most 3 days (it exists only for release-age conflicts, section 6.3).
- The gate runs against `package-lock.json` (no `node_modules` needed for the audit), on every PR and `main` push (so a newly published advisory turns the next PR red) and nightly (so a quiet repository still gets an issue within a day).
- An unreachable registry or an unparseable response is a **failure** (exit 2), never a pass. The job may be re-run.
- The legacy root app (`src/`, root `package.json`) is out of scope; it is deleted at TASK-107. Its audit (1 high, 2 moderate in production) is an owner awareness item, see section 16.

### 5.2 Patch SLA (proposed values; put into CONTRIBUTING.md; OD-CI-03)

Clock starts at advisory publication or first detection (Dependabot alert or nightly run), whichever is earlier.

| Class | Acknowledge | Fix merged | Fix in production |
|---|---|---|---|
| Critical or known-exploited, production dependency | 1 business day | 2 days | same day as merge |
| High, production dependency | 2 days | 7 days | with next deploy, at most 2 days after merge |
| Security release of **Next.js, React, React DOM, any `@radix-ui/*`** (any severity; SEC-001 F-19) | 1 day | 3 days | same day as merge |
| Moderate, production dependency | 7 days | 30 days | with next deploy |
| High, dev dependency | 7 days | 30 days | n/a |
| A GitHub Action in use is reported compromised | immediate | 1 day (pin to the last known-good SHA or remove) | n/a |

SLA breaches are labelled `sla-breach` on the tracking issue and counted in the TASK-101 evidence. With a single maintainer, the acknowledgement owner and a named backup must be in CONTRIBUTING.md (U-16).

### 5.3 Where it is enforced

`supply-chain.mjs audit` runs `npm audit --json --omit=dev` and `npm audit --json` (the second run is filtered to the dev-only set), parses the output regardless of the npm exit code (verified: npm exits 1 with valid JSON when findings exist), applies 5.1, subtracts valid exceptions (5.4), prints a Markdown table to the job summary (package, path, advisory id, effective severity, fix available, exception id or none) and exits 1 when any blocking finding remains. `.npmrc` also sets `audit-level=high` so a bare `npm audit` agrees with the script on the headline.

### 5.4 Exceptions registry and expiry process

File: `web/security/policy-exceptions.json`, validated by `supply-chain.mjs exceptions` and read by the other subcommands. One format for all exception types (DEC-CI-06).

```json
{
  "schema": 1,
  "exceptions": [
    {
      "id": "EXC-0001",
      "type": "audit",
      "advisory": "GHSA-xxxx-xxxx-xxxx",
      "package": "example-package",
      "range": "<1.2.3",
      "scope": "prod",
      "reason": "Why the finding is not exploitable or not yet fixable",
      "mitigation": "What limits the risk meanwhile",
      "owner": "github-handle",
      "approvedBy": "github-handle",
      "created": "2026-01-01",
      "expires": "2026-01-15",
      "tracking": "https://github.com/<owner>/<repo>/issues/<n>"
    }
  ]
}
```

(The values above are placeholders, not real findings.) Types: `audit`, `release-age`, `install-script`, `license`.

| Rule | Value |
|---|---|
| Required fields | `id`, `type`, `package`, `reason`, `owner`, `approvedBy`, `created`, `expires`, `tracking`; `advisory` and `range` for `audit` and `release-age` |
| Maximum lifetime | `audit` critical 7 days; `audit` high 14 days; `audit` dev-scope 30 days; `release-age` 7 days; `install-script` 90 days (re-review); `license` 180 days |
| Renewal | Once, with a new written reason. A second renewal needs an ADR in `docs/decisions/` signed by the owner. |
| Approver | `approvedBy` must differ from the PR author and from `owner` where two people exist; otherwise the PR must carry the security-reviewer sign-off (OD-CI-04) |
| Review path | The file is CODEOWNERS-protected (section 7.3); a PR touching it is reviewed by the code owner |
| Expired entry | Job fails (exit 1) until the finding is fixed or the entry is renewed under the rules above |
| Expiring within 7 days | Warning in the job summary; nightly opens or updates an issue labelled `security` |
| Stale entry (the advisory is no longer reported) | Warning on PR, failure in nightly, so the file does not accumulate dead entries |
| Shape | Wildcards in `package` are not allowed for `audit`; `range` must be an explicit semver range |

**Requesting an exception.** Open a PR that adds the entry and links the tracking issue; fill the "security exception" section of the PR template; the code owner reviews. Merge does not authorise shipping a known critical flaw in a reachable path: in that case disable or remove the feature instead (break-glass, section 12).

**Dependabot security updates** (owner setting) open fix PRs for advisories automatically; the exception process exists for what Dependabot cannot fix.

## 6. npm supply-chain controls

Control ids in brackets (`[N-xx]`) match Appendix A.

### 6.1 `web/.npmrc` (committed; TASK-007 creates it, this section defines the content)

```ini
# Install-time script policy: no dependency script runs unless explicitly rebuilt (6.2)
ignore-scripts=true
# No dependency may resolve from a git repository
allow-git=none
# Refuse installs on an unsupported Node
engine-strict=true
# Only versions published at least this many days ago are resolved (6.3)
min-release-age=7
# A bare `npm audit` agrees with the CI headline policy (section 5)
audit-level=high
# Deterministic, reviewable ranges for new direct dependencies (6.4)
save-exact=true
# Fail on unknown keys in this file so a typo cannot silently disable a control (verify U-02)
strict-npmrc=true
```

Notes: each key exists in the npm 12.0.2 documentation read locally (`ignore-scripts`, `allow-git`, `engine-strict`, `min-release-age`, `audit-level`, `save-exact` is long-standing, `strict-npmrc` was present in `npm config ls -l`). npm on GitHub runners and on Vercel may be older and may ignore or warn on newer keys (U-02). Therefore the script re-checks the critical ones independently: `supply-chain.mjs lockfile` asserts the `.npmrc` keys exist, `release-age` queries the registry itself, and `install-scripts` reads `hasInstallScript` from the lockfile. No `registry=` override, no `_authToken`, no `//registry...:_auth` lines are allowed in the committed file (checked by the `lockfile` subcommand).

### 6.2 Install scripts: `ignore-scripts=true` and its exceptions

- **[N-04]** `ignore-scripts=true` is global in `.npmrc`. It also disables `preinstall`/`install`/`postinstall` of dependencies in `npm ci` and the `pre*`/`post*` hooks around project scripts (npm config docs; this is inconsistency I-1). Consequence handled in section 9: the build chain is explicit.
- **[N-05]** Inventory: `supply-chain.mjs install-scripts` lists every lockfile entry with `hasInstallScript: true` and compares it with the `install-script` entries in `policy-exceptions.json`. An unlisted entry fails the job. Verified on the legacy lockfile: the only entry is `fsevents` (optional, macOS). The real list for `web/` is produced by TASK-007 (candidates to check, **from memory, not verified**: packages that download or compile binaries, mock-service-worker's postinstall, `core-js` banners; Next, Tailwind v4, Playwright and `sharp` recent versions are believed to ship binaries as optional dependencies without install scripts, verify).
- An approved script is run by an explicit step (`npm rebuild <name> --ignore-scripts=false`) named in its exception entry, in the Vercel `installCommand` and in CI, so the policy works on any npm version. npm 12's `allowScripts` field and `strict-allow-scripts` could replace this once every environment runs a version that supports it (U-02).
- **Never** `npm install` in CI or on Vercel, never `--ignore-scripts=false` globally, never `--dangerously-allow-all-scripts`. Playwright browsers are installed by an explicit `npx playwright install --with-deps` step, not a postinstall.
- Our own `package.json` has no `preinstall`, `install`, `postinstall` or `prepare` script (checked by the `scripts` subcommand).

### 6.3 Minimum release age

Rule: **a package version first added or upgraded in a PR must have been published at least 7 days earlier** (OD-CI-02), unless it is a security fix that carries an `exceptions` entry of type `release-age` with an advisory id (floor 1 day; maximum lifetime 7 days). Covers direct and transitive changes.

- **[N-07]** Preventive: `min-release-age=7` in `.npmrc` makes npm resolve only old-enough versions when it builds or updates the tree. Verified in local docs; verify it applies to `npm ci` and `npm install <pkg>` on the npm version that developers use.
- **[N-08]** Detective: `supply-chain.mjs release-age` diffs the PR lockfile against the base lockfile (`origin/<base>` for PRs, `github.event.before` on push), takes every `name@version` that is new or changed, fetches `https://registry.npmjs.org/<name>` and reads `time[<version>]`. A missing timestamp, a failed fetch or a version younger than the window fails the job. Scoped packages and the registry host are fixed in the script (no environment-controlled registry).
- Why 7 days: most malicious versions are reported and removed within days; a one-week delay removes the cheapest class of attack for little cost. The SLA for framework security releases (3 days) is met through the exception path with an advisory id, which resolves inconsistency I-6.
- Dependabot `cooldown` (6.5) gives the same delay at PR creation, so reviewers rarely see an ineligible version.

### 6.4 Pinning policy

| Layer | Rule | Control |
|---|---|---|
| Transitive and direct versions | Exact versions are fixed by `package-lock.json` (lockfile v3), committed; `npm ci` only | [N-01] [N-02] |
| New direct dependencies | Added with `save-exact=true` (exact version in `package.json`) | [N-09] |
| Framework packages (`next`, `react`, `react-dom`, `tailwindcss`, `@tanstack/react-query`) | ARCH-001 5.1 uses `~` ranges so a minor bump is deliberate. Because `npm ci` honours the lockfile, a range cannot move without a lockfile change, which CI reviews. **Recommendation:** accept ARCH-001's `~` for these five, exact for everything else (OD-CI-05). | [N-09] |
| GitHub Actions | Full commit SHA with a version comment (section 7.1) | [A-01] |
| Node and npm | `.nvmrc` 24; `engines`; `engine-strict=true`; CI `actions/setup-node` with `node-version-file` | [N-15] |
| Playwright browsers | Version follows `@playwright/test` pin | [N-09] |

Lockfile rules enforced by `supply-chain.mjs lockfile` **[N-02]**:

1. `lockfileVersion` equals 3.
2. Every package entry has `resolved` on `https://registry.npmjs.org/` and a `sha512` `integrity` value; `link: true` and `file:`, `git+`, `github:`, `http:` or tarball-URL sources are failures.
3. No `resolved` host other than the registry host; no `.npmrc` `registry` override.
4. `package.json` has no dependency specifier that is a URL, git ref, file path or `latest`/`*`.
5. `package.json` is `"private": true` **[N-16]** (accidental `npm publish` fails).

**[N-03]** Lockfile change review: if the same `name@version` appears in base and head with a different `integrity`, fail (a registry-side tamper or republished version). A PR that changes the lockfile without changing `package.json` is allowed only when the PR is authored by the Dependabot bot or carries the label `lockfile-refresh`; otherwise the job warns and the code owner is requested through CODEOWNERS (`package-lock.json` is a protected path).

### 6.5 Dependabot (DEC-CI-05)

**[N-10]** `.github/dependabot.yml`: two ecosystems, both weekly, grouped to limit noise, `open-pull-requests-limit` small, `cooldown` for new releases, reviewers set to the code owner.

| Ecosystem | Directory | Schedule | Grouping and rules |
|---|---|---|---|
| `npm` | `/web` | Weekly (Monday, `Asia/Kolkata`) | Group `patch` and `minor` for development tooling only; **never group** `next`, `react`, `react-dom`, `@radix-ui/*` (each gets its own PR so the SLA clock and review are clear); `cooldown` default 7 days (security updates bypass cooldown by design); labels `dependencies`, `security` |
| `github-actions` | `/` | Weekly | One group for all actions; Dependabot rewrites SHA pins and keeps the version comment (verify U-05); label `ci` |

Owner settings (not files): Dependabot alerts, Dependabot security updates, and Dependabot version updates are enabled in Settings, Code security (verify availability on the plan, U-01). The legacy root `package.json` is excluded from version updates (it will be deleted); security alerts for it still appear and are an awareness item.

Renovate is a valid alternative (more grouping and scheduling control) but needs a hosted app or self-hosting with repository write access; not chosen (section 15).

### 6.6 Licence check

**[N-12]** `supply-chain.mjs licenses` reads `license` from each lockfile entry (present for 288 of 289 entries in the legacy lockfile, so the field is reliable for most packages; the missing one is an exception candidate) and evaluates the SPDX expression:

| Class | Licences | Result |
|---|---|---|
| Allowed | MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, BlueOak-1.0.0, CC0-1.0, Unlicense, Python-2.0, CC-BY-4.0 (data and docs only), `MIT OR` / `Apache-2.0 OR` style expressions where one allowed option exists | Pass |
| Review | MPL-2.0 (file-level copyleft; present 12 times in the legacy tree, normally harmless as an unmodified dependency), LGPL-*, `SEE LICENSE IN` | Pass only with an `exceptions` entry of type `license` (owner, reason) |
| Denied | GPL-*, AGPL-*, SSPL-*, BUSL-*, CC-BY-NC-*, `UNLICENSED`, missing licence on a **production** dependency | Fail |

This is a compliance control, not a security control, and the allow-list is a starting proposal for the owner's confirmation (U-15). Fonts and images carry their own licences (TASK-005 asset inventory) and are out of scope here.

### 6.7 Registry signatures and provenance

**[N-13]** `npm audit signatures` verifies registry signatures (and provenance attestations where a package publishes them) for the installed tree. Run in the `supply-chain` job after `npm ci`. A package without a signature or attestation is a normal outcome for many packages; only a **failed verification** or an error fails the job. Provenance attestations are **not required** for dependencies because most of the ecosystem does not publish them; reviewers prefer, but are not forced to prefer, versions with provenance when choosing between alternatives. Availability and exact failure semantics of this command on the pinned npm version are U-02.

### 6.8 New-dependency review

**[N-11]** PR template section "New or upgraded runtime dependency" asks: why needed, bundle cost (from `check:bundle` or `ANALYZE`), maintainers and last release, install scripts (none expected), licence, whether a platform or in-repo alternative exists. The CODEOWNERS rule on `package.json` requests the code owner. ARCH-001 17.1 already says: only vetted packages, Radix per-package, no runtime icon, animation or UI kits.

### 6.9 SBOM and provenance of our own build (if practical)

- **[N-14]** Practical now: a CycloneDX SBOM generated on every `main` push by `npm sbom --sbom-format cyclonedx` (built into recent npm; verify on the pinned version, U-02), uploaded as a 90-day workflow artifact. It is evidence for TASK-101 and a way to answer "are we affected" when an advisory lands. Uses no third-party action.
- **Not practical now (DEC-CI-10):** SLSA or `actions/attest-build-provenance` attestations. Vercel builds the artifact that actually runs in production (DEC-CI-01), so an attestation about a GitHub-built artifact would describe something that does not ship. Revisit if deployment ever moves to a prebuilt-artifact flow. `npm publish --provenance` applies only if a package is ever published (none is: `"private": true`).

## 7. GitHub repository and Actions hardening

### 7.1 Workflow rules (checked mechanically by `supply-chain.mjs workflows`, gate G17)

1. **[A-01] Pin every `uses:` to a full 40-character commit SHA** followed by a comment with the human-readable version, for example `uses: actions/checkout@<FULL_40_CHAR_COMMIT_SHA> # vX.Y.Z`. Applies to first-party (`actions/*`, `github/*`) as well as any third-party action: tags are mutable and the incident history of the ecosystem shows that first-party and third-party are equally exposed to a retagged release. Local `./.github/actions/*` composite actions are allowed. `docker://` references must be pinned by digest. The check rejects any `uses:` whose ref is not 40 hex characters. **Do not invent SHAs:** an implementer resolves each SHA from the action's repository release page at implementation time and records the tag in the comment (Appendix C uses placeholders only).
2. **Third-party actions are avoided.** Preferred: shell steps using tools on the runner image, `npm` scripts, or first-party actions. If an owner approves a third-party action, it must be listed in `.github/workflows/POLICY.md` with reason, owner and review date, and it must be pinned by SHA like any other.
3. **[A-02] `permissions: {}` at workflow level**, then the minimum per job (`contents: read` for checkout jobs; `issues: write` only for the nightly job that opens issues; `security-events: write` only if code scanning is added). The `ci-gate` job has `permissions: {}`. No job uses `write-all`, `id-token: write`, `packages`, `deployments` or `pull-requests: write`, with the single exception of an explicit, documented need.
4. **[A-03] Banned triggers:** `pull_request_target`, `workflow_run`, `issue_comment`, `pull_request_review_comment`, `repository_dispatch` and any `workflow_call` from outside the repository. Reason: they run in the base repository context with a privileged token and are the usual route from an untrusted pull request to a secret or a write token. If a future need appears (for example automatic labelling), implement it with `pull_request_target` **only** in a workflow that never checks out, builds or executes PR content, and gets a documented review.
5. **[A-04] `actions/checkout` with `persist-credentials: false`** and `fetch-depth` set deliberately (the `release-age` job needs the base ref). No step writes to the repository or pushes tags.
6. **[A-05] Expression injection:** no `${{ github.event.* }}`, `${{ github.head_ref }}`, branch names, PR titles or commit messages inside `run:` scripts. Untrusted values enter a step only through `env:` and are used as quoted shell variables. The check greps `run:` blocks for `github.event.`, `github.head_ref` and `github.ref_name`.
7. **[A-06] No `secrets.*` references** except `secrets.GITHUB_TOKEN` (implicit). The check fails on any other `secrets.` token. This is how "no production secrets in PR workflows" is made a mechanical rule rather than a promise (section 8).
8. **[A-07] GitHub-hosted runners only;** no `self-hosted` label; runner image pinned to a version label.
9. **[A-21] Caches** only for the npm download cache and the Playwright browser directory, keyed by lockfile hash and Playwright version. `node_modules`, `.next` and any file that is executed later are not cached.
10. **[A-20] Artifacts** hold only test reports, route-bundle stats and the SBOM; 7 to 90 day retention; they never contain `.env*` files or the `.next` server directory; the job summary never prints environment variables.
11. Every job has `timeout-minutes`; the workflow has a `concurrency` group.
12. `npm install`, `npm i`, `npm update`, `yarn`, `pnpm install` and piping curl or wget into a shell in a workflow or package script fail the check **[N-01]**. `npm ci` is the only installer.
13. **[A-14]** Static workflow linting: the in-repo checks above are the baseline. Adding `actionlint` or `zizmor` is recommended and is allowed only as a pinned binary downloaded with a verified checksum (or a SHA-pinned action), never as a piped shell download (OD-CI-07; availability and exact flags not verified here).

### 7.2 Repository settings (owner-applied; verify availability on the repository's plan: U-01)

| # | Setting | Value | Control |
|---|---|---|---|
| 1 | Actions, General, Actions permissions | Allow actions created by GitHub only (plus an explicit allow-list if a third-party action is ever approved); **require actions to be pinned to a full-length commit SHA** if the setting exists (U-04) | [A-08] |
| 2 | Actions, Workflow permissions | Read repository contents and packages permissions only; **do not** allow GitHub Actions to create and approve pull requests | [A-08] |
| 3 | Actions, Fork pull request workflows | Require approval for all outside collaborators; send no secrets or write tokens to workflows from fork PRs | [A-18] |
| 4 | Actions, Runners | No self-hosted runners registered | [A-07] |
| 5 | Secrets and variables (Actions, Dependabot, Codespaces) | No repository secrets at all; no environment secrets; review monthly | [S-08] |
| 6 | Code security | Secret scanning on; **push protection** on; Dependabot alerts, security updates and version updates on; private vulnerability reporting on | [A-16] |
| 7 | Code scanning (CodeQL) | Optional, not required by this spec; if enabled, it is advisory and not part of `ci-gate` | [A-17] |
| 8 | General, Pull requests | Allow squash merging only; automatically delete head branches; require contributors to sign off on web-based commits: optional | [A-09] |
| 9 | Collaborators | Least privilege (Write only for people who merge; Read or Triage otherwise); outside collaborators reviewed quarterly | [A-09] |
| 10 | Webhooks, deploy keys, GitHub Apps | Audit list; remove unused; deploy keys read-only | [A-22] |

### 7.3 Branch and tag protection (GitHub ruleset on `main`; owner-applied)

**[A-09] Required, with no bypass actors (not even admins; a documented break-glass path exists, section 12):**

- Require a pull request before merging; at least **1 approving review** (2 if the team has 3 or more write members); **dismiss stale approvals when new commits are pushed**; **require approval of the most recent push** by someone other than the pusher (OD-CI-04 for a solo maintainer); require **review from Code Owners**; require conversation resolution.
- Require status check **`ci-gate`** to pass; require the branch to be up to date before merging (or use a merge queue if the owner enables it).
- Block force pushes and deletions; require linear history (squash).
- Require signed commits: **optional**. It protects against commit spoofing only if all contributors are set up with signing keys; enable once everyone has them (the cost is friction, the benefit is moderate).
- Restrict who can push to `main`: nobody directly; merges only through PR.
- Restrict creation, update and deletion of release tags (`v*`, `release-*`) to maintainers **[A-11]**.

**[A-10] `.github/CODEOWNERS`** (paths are the repository paths implied by ARCH-001 6.1; handles are placeholders for the owner to fill):

```
# Security-sensitive paths require review from the code owner team (placeholders)
/.github/                                   @<owner-handle-or-team>
/.github/CODEOWNERS                         @<owner-handle-or-team>
/web/security/                              @<owner-handle-or-team>
/web/src/proxy.ts                           @<owner-handle-or-team>
/web/next.config.ts                         @<owner-handle-or-team>
/web/vercel.json                            @<owner-handle-or-team>
/web/.npmrc                                 @<owner-handle-or-team>
/web/package.json                           @<owner-handle-or-team>
/web/package-lock.json                      @<owner-handle-or-team>
/web/src/lib/security/                      @<owner-handle-or-team>
/web/src/lib/revalidate/                    @<owner-handle-or-team>
/web/src/app/api/                           @<owner-handle-or-team>
/web/src/lib/env/                           @<owner-handle-or-team>
/web/src/lib/api/browser/tokens.ts          @<owner-handle-or-team>
/web/src/lib/api/browser/session-lock.ts    @<owner-handle-or-team>
/web/src/lib/api/server/                    @<owner-handle-or-team>
/web/src/lib/observe/scrub.ts               @<owner-handle-or-team>
/web/src/lib/seo/JsonLd.tsx                 @<owner-handle-or-team>
/web/src/lib/mock/                          @<owner-handle-or-team>
/web/scripts/                               @<owner-handle-or-team>
/web/*dependency-cruiser*                   @<owner-handle-or-team>
/web/eslint.config.mjs                      @<owner-handle-or-team>
/web/budgets.json                           @<owner-handle-or-team>
/web/playwright.config.ts                   @<owner-handle-or-team>
/web/e2e/helpers/                           @<owner-handle-or-team>
/SECURITY.md                                @<owner-handle-or-team>
/CONTRIBUTING.md                            @<owner-handle-or-team>
/docs/architecture/                         @<owner-handle-or-team>
/docs/decisions/                            @<owner-handle-or-team>
/docs/reviews/                              @<owner-handle-or-team>
```

Why these: `proxy.ts` and `next.config.ts` carry CSP and headers (ARCH-001 10); `lib/security`, `lib/revalidate`, `app/api` hold the HMAC verifier, redirect helper, JSON-LD escaper and the revalidate, draft and csp-report routes; `lib/env` and `scripts` carry the build guards, so weakening them is a security change; `lib/mock` and `lib/api/adapters` decide whether mock code can reach production; `eslint.config.mjs`, `.dependency-cruiser` and `budgets.json` encode the architecture rules, and editing a rule or raising a budget is how a gate is quietly disabled. `/web/src/lib/api/adapters/` is added to the list when TASK-014 creates it. CODEOWNERS only takes effect with the ruleset option "Require review from Code Owners"; it needs a user or team with **write** access, and the file must not contain syntax errors (GitHub reports them).

**[A-12]** The CODEOWNERS file and `.github/` are themselves owned paths, so the review requirement cannot be removed by the same PR that weakens it.

### 7.4 What GitHub cannot enforce, and the compensating control

| Gap | Compensation |
|---|---|
| Rulesets on a private repository require a paid plan (unverified, U-01) | Move the repository to a GitHub organisation or upgrade; until then a pre-merge discipline in CONTRIBUTING.md plus `ci-gate` run on `main` pushes (post-merge detection) and the owner treats this as a launch blocker for TASK-101 |
| A solo owner cannot get a second approval | OD-CI-04: add a second reviewer, or allow one named bypass actor, with after-the-fact review recorded in the PR; admin bypass otherwise off |
| Organisation-level "require 2FA" exists only for organisations | Move to an organisation (recommended), or verify 2FA per collaborator manually and record it |
| Dependabot or Actions features differ by plan | Appendix B marks each with verification evidence to attach |

## 8. Secrets and environment scoping

### 8.1 Principle

Production secrets live in exactly two places: **Vercel (Production scope)** and **Railway (production environment)**. GitHub holds none (DEC-CI-01, **[S-08]**). A pull request, a fork, a preview deployment or a CI job can therefore never read a production secret, because it is not in any system those contexts can reach.

### 8.2 Variable inventory and scoping matrix (Vercel project for `web/`)

Variable names come from ARCH-001 17.2 and TASK-115. "Prod/Staging/Preview" are Vercel environments: Production, a custom environment `staging` (ARCH-001 18.1; Vercel custom environments are plan-dependent, U-06), and Preview. "Dev" is local `next dev` only. Values are never written in this document.

| Variable | Class | Production | Staging | Preview | Dev (local) | Sensitive flag | Notes |
|---|---|---|---|---|---|---|---|
| `API_INTERNAL_URL` | server | Railway production API URL | Railway staging API URL | **unset** (previews use mocks) | optional | no (a URL), but never exposed to client | Rewrite destination and server fetch base (ARCH-001 12.7) |
| `REVALIDATE_SECRET` | server secret | production secret (>= 32 random bytes) | staging secret (different) | **unset**; if a preview needs the route in mock mode it uses the mock-only secret below | local random | **yes** | Same value as Railway production only |
| `REVALIDATE_SECRET_PREVIOUS` | server secret | set only during a rotation window | same | unset | unset | **yes** | ARCH-001 17.2 |
| `PREVIEW_SECRET` | server secret | production secret | staging secret | unset | local random | **yes** | Authenticates the draft-preview token exchange (ARCH-001 8.4) |
| `MOCK_PUBLISH_SECRET` (name not decided in ARCH-001; see U-12) | server secret, mock builds only | **must not exist** | must not exist | a throwaway random value | local | **yes** | Mock-only signing secret (ARCH-001 11.3); a production build must refuse to start if it is present |
| `NEXT_PUBLIC_USE_MOCKS` | public | **unset or `false`; build fails if `true`** | `false` | `true` only by explicit opt-in (preview-opt-in mechanism below) | `true` default | n/a | Section 9 |
| `NEXT_PUBLIC_SITE_URL` | public | production origin | staging origin | preview origin or staging origin (decision in TASK-115) | `http://localhost:3000` | n/a | Canonical and sitemap |
| `NEXT_PUBLIC_API_BASE_URL` | public | `/api` | `/api` | `/api` | `/api` | n/a | |
| `NEXT_PUBLIC_GOOGLE_AUTH`, `NEXT_PUBLIC_RAZORPAY_ENABLED`, `NEXT_PUBLIC_CONTACT_MODE` | public flags | per launch decision | per test plan | `false` in previews unless a test needs it | any | n/a | Razorpay flag on only where the backend has test or live keys |
| `NEXT_PUBLIC_SUPABASE_STORAGE_HOST`, `NEXT_PUBLIC_MEDIA_BASE_URL`, `NEXT_PUBLIC_MEDIA_BUCKET` | public config | production Storage host | staging Storage host | staging or placeholder | any | n/a | Not secrets (ARCH-001 17.2) |
| Supabase anon or service key | **never exists in this project** | - | - | - | - | - | ARCH-001 17.2: no Supabase keys in the frontend; `check:build-output` and the secret scan flag any name containing `SUPABASE` together with `KEY` |
| Preview mock opt-in flag | public | must not exist | must not exist | explicit variable (name set in TASK-007; ARCH-001 18.1 says "explicit opt-in variable") | optional | n/a | The same variable that allows mocks outside local; allow-list guard, section 9 |

**Rules:**

1. **[S-01] Every secret and every mock-related variable is created per environment, never "All Environments".** A review of the Vercel project Environment Variables page is an Appendix B item, repeated at TASK-101 and quarterly.
2. **[S-02] Secrets use Vercel's Sensitive setting** (value not readable after saving) in Production and Staging. Verify availability per environment on the plan (U-06).
3. **[S-03] Names:** a `NEXT_PUBLIC_*` variable whose name matches `SECRET|TOKEN|KEY|PASSWORD|PRIVATE|CREDENTIAL` fails the `guard-env` step (ARCH-001 6.3) **and** the CI workflow check (the CI job scans `.env.example`, `vercel.json`, the Appendix C template and workflow files). A server-only name appearing in the client bundle fails `check:build-output` by **value**, not name: the scan searches `.next/static` for the dummy secret values the build was given (CI generates random dummies) and for the production secrets' length-and-charset pattern.
4. **[S-04] Server-only variables** are read in `lib/env/env.server.ts` (starts with `import 'server-only'`); a client import is a build error. CODEOWNERS covers the module.
5. **[S-11] CI builds get generated dummy secrets** (`openssl rand -hex 32` equivalent in a step, written to `$GITHUB_ENV`, masked with `::add-mask::`), never real ones. The same values feed the leak scan above.
6. **[S-12] Repository ignore rules** for `web/`: `.env*` ignored with `!.env.example`; the root `.gitignore` covers only `*.local` and `backend/.env`, so a plain `.env` in the repo root would be committed (found in section 2). Add the rules in TASK-007 and the secret scan (8.7) as backstop. `web/.env.example` lists names and safe placeholder values only.
7. **[S-14] Separate Vercel project for `web/`** (DEC-CI-09, OD-CI-06): the legacy project stays as is until TASK-107, so env scoping, region `sin1`, domain assignments and the "no promote from preview" setting can be applied without touching the live legacy deployment. The new project's production domain stays unassigned until cutover.

### 8.3 Shared secrets across Vercel and Railway

`REVALIDATE_SECRET` is held by Vercel (verifier) and Railway (signer); `PREVIEW_SECRET` likewise (TASK-113, TASK-115).

- **[S-05]** Generation: at least 32 random bytes from a CSPRNG, produced locally by the owner (not typed, not a passphrase), a different value for production and staging. Never in chat, issue, PR, email or a screenshot; transmit by pasting into the two consoles directly.
- Rotation: every 6 months, immediately on suspected exposure, and when a person with access leaves. Procedure uses the two-secret window already in ARCH-001 17.2 / 9.2: (1) set new value as `REVALIDATE_SECRET` and old as `REVALIDATE_SECRET_PREVIOUS` in Vercel; (2) switch the Railway signer to the new value; (3) after the longest retry period of the outbox (set by the backend plan; at least 1 hour) remove `..._PREVIOUS`; (4) confirm 401 count returns to zero in logs. The runbook text itself is the TASK-124 absorbed item and lives in ARCH-001; this section only requires that the rotation date is recorded in the owner's access register (Appendix B).
- Scope each secret to the minimum Railway services: only the API/worker service that signs revalidation holds `REVALIDATE_SECRET`; the scheduler does not unless it signs.
- `PREVIEW_SECRET` follows the same rules.

### 8.4 Previews, forks and staging

| Case | Control |
|---|---|
| Deployments from forked repositories | **[S-07]** Keep Vercel's protection that blocks deployments from forks unless a team member authorises them enabled (default behaviour on current plans, **verify**, U-07). Preview scope holds no secrets (matrix above) so even an authorised fork deployment exposes nothing. |
| Preview deployments of mock builds | **[S-07]** Deployment Protection (Vercel Authentication) on all previews (SEC-001 F-18; operational detail in TASK-126). `X-Robots-Tag: noindex` on non-production hosts (ARCH-001 18.1). Persistent "Mock data" banner. |
| Automation bypass for protected previews | If Playwright against deployed previews is ever added, the bypass secret lives in a GitHub Environment with required reviewers, not as a repository secret; **not needed in this design** because PR e2e runs against a local `next start`. |
| Staging | Own Railway environment and Supabase project (ARCH-001 18.1); its secrets differ from production; CSP Report-Only first; Razorpay test keys only on Railway staging. |
| Production-looking URLs for staging/preview | Never share the production domain pattern; the custom environment domain is separate. |

### 8.5 Railway and Supabase (boundaries and minimum rules)

The backend repository and its CI are out of scope (backend plan). The minimum rules that affect this frontend's security:

- **[S-09]** Railway: separate production and staging environments; secrets are service variables per environment; production variables are not shared into staging via project-level shared variables; team access limited to named people with 2FA; deploy triggers limited to the protected branch; PR environments (if enabled) get no production variables.
- Supabase: separate production and staging projects (TASK-117); the service-role key exists only in Railway production and staging, never in Vercel or GitHub; database password rotation recorded; the lockdown checklist in TASK-117 applies.
- Razorpay: live keys only on Railway production; test keys on staging; webhook secret only on Railway.

### 8.6 What the owner configures in each console

Collected in Appendix B so none is lost in prose: Vercel (project, environments, sensitive flags, fork protection, Deployment Protection, disable promote-from-preview, team members and roles, 2FA enforcement), Railway (environments, variable scoping, team), Supabase (projects, keys), GitHub (rulesets, Actions policy, secret scanning, Dependabot).

### 8.7 Secret scanning in CI

**[S-10]** Two layers: (1) GitHub secret scanning with push protection (owner setting, 7.2 row 6); (2) a CI step scanning the diff on PRs and the full tree on `main` and weekly full history. ARCH-001 16.1 names `gitleaks`. Run it as a **pinned binary with a verified checksum** or a SHA-pinned action, not as an unpinned download; note that the maintained `gitleaks-action` has historically needed a licence key for organisation repositories (**from memory, verify**, U-09). If neither fits, a small in-repo script with high-signal patterns (private key headers, `sk_live_`, `rzp_live_`, `AKIA`, JWT-shaped strings in non-test files, `.env` file additions) is acceptable as the baseline and GitHub push protection provides the broad patterns. The rule for what happens on a hit: the PR is red, the secret is treated as leaked (rotate first, rewrite history second), and Appendix B's rotation register is updated **[S-13]**.

## 9. Mock-code-not-in-production assertion

This repeats ARCH-001 11.3 and 17.1 (F-09, FM-21) as testable CI/ops controls and fixes the `ignore-scripts` hole (I-1).

### 9.1 Layers (defence in depth; each fails closed)

| # | Layer | When | Fails if | Control |
|---|---|---|---|---|
| L1 | **Allow-list guard** `guard-env.ts` | start of `npm run build` (explicit chain) | `NEXT_PUBLIC_USE_MOCKS=true` unless `VERCEL_ENV` is `preview` (and the preview opt-in is set) or the build is local (`CI` unset and `VERCEL` unset); `MOCK_PUBLISH_SECRET` present when mocks are off; any secret-looking `NEXT_PUBLIC_*` name. An **unknown or missing `VERCEL_ENV` on a Vercel build is treated as production**. | [M-01] |
| L2 | **Explicit script chain** | always | `package.json` `build` does not start with the guard and end with `check:build-output`; `prebuild`/`postbuild` hooks exist only as optional extras and are never relied on. Verified by `supply-chain.mjs scripts` (G18). | [M-02] |
| L3 | **Sentinel scan with a positive control** | `check:build-output` in `build-prod` | the mock sentinel string (exported only by `lib/mock`) appears anywhere under `.next` (static chunks and server output). To avoid a vacuous pass, CI also builds the mock profile once in `e2e-smoke` and a tiny test asserts the scanner **does** find the sentinel there; if it does not, the sentinel was renamed or the scanner is broken and the job fails. | [M-03] |
| L4 | **Route and file absence** | `check:build-output` | `/handoff/**`, `/api/mock-publish`, the scenario panel and mock banner components, and fixture files appear in the production route manifest or output (ARCH-001 16.1 build-output row already requires `/handoff` absent) | [M-04] |
| L5 | **Mock-only secret and variable audit** | Appendix B at setup and TASK-101; automated for the repo files | Production or Staging Vercel scope has `NEXT_PUBLIC_USE_MOCKS` or `MOCK_PUBLISH_SECRET`; CI scans committed files (`.env.example`, `vercel.json`, workflow YAML) for `NEXT_PUBLIC_USE_MOCKS=true` outside the mock-profile job | [M-05] |
| L6 | **No promote-from-preview** | Vercel project setting | A preview deployment can be promoted to production without a rebuild, bypassing L1 to L4 (SEC-001 F-09). Owner disables or restricts promotion; production deploys only from the `main` branch. | [M-06] |
| L7 | **Post-deploy smoke** (TASK-109, spec only until cutover) | after every production deployment and hourly | the production URL's HTML contains the sentinel or the "Mock data" banner text, `/handoff` returns anything but 404, `/api/mock-publish` returns anything but 404, or `/api/revalidate` accepts an unsigned request. Runs with no credentials against the public URL only. | [M-07] |
| L8 | **Environment variable review** | quarterly and at TASK-101 | any variable is set for "All Environments" that should be scoped (section 8.2 rule 1) | [S-01] |

### 9.2 The failing cases that must be tested (TASK-007 / TASK-121 acceptance additions)

1. `VERCEL_ENV=production NEXT_PUBLIC_USE_MOCKS=true npm run build` exits non-zero before `next build` starts.
2. `VERCEL_ENV=preview NEXT_PUBLIC_USE_MOCKS=true` without the opt-in variable exits non-zero.
3. `VERCEL=1` with `VERCEL_ENV` unset or `staging` with mocks on exits non-zero (staging must be real).
4. Production profile output containing the sentinel (inject a fixture) fails `check:build-output`.
5. Mock profile output **lacking** the sentinel fails the positive-control test.
6. A `package.json` `build` script without the guard fails `supply-chain.mjs scripts`.
7. A production route manifest containing `/handoff` fails.

### 9.3 Residual risk

If the owner sets `NEXT_PUBLIC_USE_MOCKS=true` in the Production scope by mistake, L1 fails the build, so the site simply does not deploy; the previous production deployment keeps serving. If L1 is bypassed by editing `scripts/` the CODEOWNERS rule (7.3) forces owner review. The weakest remaining path is a human manually promoting a mock preview with promotion enabled, hence L6 and L7.

## 10. Account hygiene and 2FA

### 10.1 Requirements per system

"Phishing-resistant" means a passkey or a hardware security key; TOTP is acceptable where nothing stronger exists; SMS is not acceptable as the only second factor. The owner is responsible for every item; TASK-101 asks for evidence (screenshot or settings export, dated) for each.

| # | System | Required | Notes (availability marked unverified where relevant) | Control |
|---|---|---|---|---|
| 1 | **GitHub** (every account with write access, and the owner's account) | 2FA enabled, preferably a passkey or security key; recovery codes stored offline; no SMS-only; if an organisation owns the repository, **require 2FA for all members** (org setting) | Personal repositories cannot enforce 2FA on collaborators; recommend an organisation (U-01). Review SSH keys and authorised OAuth/GitHub Apps. | [H-01] |
| 2 | **Vercel** | 2FA or passkey for every team member; if the plan supports team-wide enforcement, enable it; team roles least-privilege (Members cannot see Sensitive values; limit Owner to one or two people); disable "invite by link" if present | Vercel Pro per hosting decision; role names and enforcement options **verify** (U-06) | [H-02] |
| 3 | **Railway** | 2FA on every account; project members limited; separate production and staging environments with narrower access to production; deploy tokens (if any) scoped to one environment and stored in Railway only | Railway 2FA options and RBAC are plan-dependent, **verify** (U-08) | [H-03] |
| 4 | **Supabase** | 2FA on every dashboard account; production project owner limited; database password and service-role key stored only in Railway; no keys in repo, Vercel or GitHub; API keys rotated after any offboarding | Supabase organisation-level MFA enforcement is plan-dependent, **verify** (U-08) | [H-04] |
| 5 | **npm** (registry account) | There is no publishing of packages, so an npm account is **not needed**. If one exists, enable 2FA (auth-and-writes) and do not create automation tokens. If a package is ever published: 2FA required on publish, granular tokens with expiry and IP allow-list if available, `provenance` only from a trusted CI. | TASK-128 text "2FA requirement on publish" is satisfied vacuously; `"private": true` blocks accidental publish [N-16] | [H-05] |
| 6 | **Razorpay dashboard, domain registrar and DNS, email provider, and the mailbox used for recovery of all of the above** | 2FA with a hardware key or authenticator on each; the recovery mailbox is the highest-value account and gets the strongest factor; registrar lock on the domain | These are not CI but the supply chain of the whole site; domain takeover defeats every control above | [H-06] |
| 7 | **Machine and personal tokens** | GitHub: fine-grained personal access tokens only, repository-scoped, expiry <= 90 days, no classic tokens; Vercel access tokens: none issued unless required, expiry set, recorded; no long-lived tokens in CI; local `.npmrc` with `_authToken` never committed | The CI design needs none (DEC-CI-01) | [H-07] |
| 8 | **Role review** | Quarterly: list members/roles in GitHub, Vercel, Railway, Supabase, Razorpay; remove unused; verify 2FA status; verify CODEOWNERS handles still exist | Record the review date in the register | [H-08] |
| 9 | **Offboarding** | Same day: remove from all seven systems, rotate shared secrets they could read (section 8.3), revoke tokens and SSH keys, reassign CODEOWNERS | | [H-09] |
| 10 | **Break-glass and recovery** | Documented in the owner's private access register (not in the repo): who holds recovery codes for each system, where hardware keys are, how to disable a compromised deploy (Vercel instant rollback, pausing Railway service); tested once | The repo may contain only the procedure, never codes | [H-10] |

### 10.2 What CI can and cannot verify

CI cannot check any 2FA state. The only automated aids are: GitHub rulesets require reviews (a stolen account then needs a second human), CODEOWNERS limits what a compromised contributor can change, and secret scanning catches pasted tokens. Everything else is attested by the owner (Appendix B) and re-attested quarterly. Treat the attestation as a launch gate item in TASK-101: no dated evidence, no sign-off.

## 11. Responsibilities

| Party | Owns |
|---|---|
| **Architect (this task)** | This specification; amendments to ARCH-001 17.1/28.5 and the plan wording (section 17); CODEOWNERS path list; the SLA proposal |
| **Frontend engineer (TASK-007, 008, 111, 114, 120, 121)** | `.npmrc`, `package.json` scripts, `guard-env.ts`, `check-build-output.ts`, contract stub, the `ci.yml` implementation from Appendix C, tests that prove failures |
| **Test engineer (TASK-009, 116, 099)** | Playwright smoke selection, axe and prerender assertions in CI, budget wiring, nightly Lighthouse, fixture failures |
| **Security reviewer (TASK-101)** | Verifies each control against evidence (Appendix A column "Evidence"), re-runs the audit, checks exception expiry, signs off |
| **Owner (human)** | Every console setting (Appendix B), secret generation and rotation, 2FA on all accounts, naming code owners and reviewers, choosing the open decisions, approving exceptions that need an ADR |
| **Backend plan** | Railway CI and image supply chain, Django or replacement dependency audit (`pip-audit` or equivalent), Dockerfile pinning, database access; must adopt equivalents of sections 5 to 8 |

## 12. Failure modes

| # | Failure | Effect | Handling |
|---|---|---|---|
| FM-CI-01 | npm registry unreachable or rate-limited during audit, release-age or signatures | Supply-chain job cannot decide | Fails closed (exit 2); re-run; nightly retries; never auto-pass |
| FM-CI-02 | New advisory published for a merged dependency | Next PR turns red although the PR is unrelated | Expected. Fix or add a time-boxed exception. Nightly job makes this visible before the next PR |
| FM-CI-03 | Release-age rule blocks an urgent security fix | Fix cannot merge for up to 7 days | `release-age` exception with advisory id; floor of 1 day; max lifetime 7 days (section 6.3) |
| FM-CI-04 | `ignore-scripts=true` breaks a dependency that needs a build step | Install succeeds but runtime fails | Detected by `build-prod`/`e2e-smoke`; add an `install-script` exception with an explicit `npm rebuild <pkg>` step |
| FM-CI-05 | `ignore-scripts=true` silently disables `prebuild`/`postbuild` guards | Mock or secret guards would not run | Prevented by DEC-CI-07 (explicit chain) and gate G18; drill 6 in 9.2 |
| FM-CI-06 | `ci-gate` always skipped or path-filtered so no check is reported | PR stuck pending, or a bypass is tempting | No path filters on `ci.yml`; `ci-gate` uses `if: always()` and treats any non-success as failure |
| FM-CI-07 | Actions or GitHub outage | No merges | Wait. Break-glass (below) only for production incidents, with after-the-fact review |
| FM-CI-08 | A pinned action SHA is later found compromised | Malicious code in CI (no secrets to steal, but tokens and source) | `permissions: {}` and no secrets limit blast radius; replace SHA within 1 day (SLA table); rotate the GITHUB_TOKEN implicitly per run |
| FM-CI-09 | Dependabot PR bumps an action SHA that is a malicious fork commit | Same as above | Dependabot only follows the action's own release tags; reviewers confirm the comment tag matches a release (PR template item) |
| FM-CI-10 | Owner leaves a console setting unapplied | Control absent without any signal | Appendix B evidence is a TASK-101 sign-off precondition; quarterly review |
| FM-CI-11 | Ruleset blocks the owner (solo maintainer) | Cannot merge own PR | OD-CI-04; no admin bypass by default |
| FM-CI-12 | Contract stub drifts from the contract | Production-profile build fails or passes wrongly | Stub generated from `export:contract` examples; `export:contract` drift check (G10) |
| FM-CI-13 | False positive from the secret scanner | PR blocked | Allow-list file reviewed by code owner; never disable the scanner |
| FM-CI-14 | Sentinel renamed in `lib/mock` so the scan finds nothing | Vacuous pass | Positive-control test on the mock build fails (L3) |
| FM-CI-15 | Flaky Playwright test | Merge friction, then a bypass habit | Retries limited to 1 with report; flake budget tracked in nightly; a test flaking twice in a week is quarantined by a code-owner-approved PR, not skipped silently |

**Break-glass (production incident only).** Preferred: use Vercel instant rollback to a previous deployment or pause the Railway service; none of these needs a merge. If a code fix must bypass `ci-gate`, the owner (not an agent) temporarily edits the ruleset, merges, restores the ruleset the same day, and records the reason in an issue labelled `break-glass`. The next nightly run must be green.

## 13. Observability

| Signal | Where | Action |
|---|---|---|
| Job summaries (audit table, budget deltas, exceptions expiring) | each run | Reviewer reads before approving |
| Nightly failure | GitHub Actions email and an issue labelled `security` or `ci` opened by the nightly workflow (`issues: write` in that one job) | Triage within the SLA table |
| Exception age and count | `exceptions` subcommand prints counts | Review monthly; the TASK-101 report quotes them |
| Dependabot backlog and alert count | GitHub Security tab | Weekly check by the code owner |
| Time to fix vs SLA | `sla-breach` label count | Reported at TASK-101 and quarterly |
| Post-deploy smoke result (after cutover) | scheduled workflow | Failure pages the owner by email; rollback runbook TASK-108 |
| Account hygiene | register (Appendix B) | Quarterly attestation |

No secrets, token values or environment dumps are printed in logs (A-20, S-11). The `gitleaks`-style scan also covers workflow logs only indirectly; masking (`::add-mask::`) is used for generated dummies.

## 14. Rollout and migration

No application data migration. Adoption is staged so that no step blocks the legacy site that is still live and so the required status check is only enabled once it is proven green.

| Stage | When | Who | What |
|---|---|---|---|
| 0 | Now (before TASK-007) | Owner | Accounts and consoles that do not depend on code: Appendix B items for GitHub account 2FA (consider an organisation), secret scanning and push protection, Dependabot alerts and security updates, Actions policy (allow GitHub-owned actions only, read-only default token), disable "create and approve pull requests", fork PR approval; **create the new Vercel project for `web/`** with the env scoping matrix and fork protection, Deployment Protection, no promote-from-preview; 2FA on Vercel, Railway, Supabase, Razorpay, registrar, recovery mailbox. Create the `main` ruleset **without** the required status check yet (PR + review + code owners + no force push). |
| 1 | With TASK-007 | Frontend engineer | `web/.npmrc`, `.gitignore` rules, `package.json` explicit `build` chain, `guard-env.ts`, `engines`, `.nvmrc`; first lockfile; `supply-chain.mjs` with fixtures; `policy-exceptions.json` (empty list); `ci.yml` from Appendix C with SHAs resolved by the implementer; CODEOWNERS and PR template; `CONTRIBUTING.md`, `SECURITY.md`, `POLICY.md` (text derived from this document) |
| 2 | Same PR series | Frontend engineer | Run `ci.yml` in report-only mode (job not required) for at least 3 consecutive PRs; measure wall time (U-13); tune Playwright smoke selection |
| 3 | After stage 2 is green | Owner | Add `ci-gate` as the required check; enable "require approval of most recent push" per OD-CI-04 |
| 4 | Before TASK-008/009/121/099/116 close | Their owners | Attach their commands to the jobs in 4.2 and tick the gate matrix rows G1 to G10, G20 in their acceptance criteria |
| 5 | Before TASK-101 | Test engineer, frontend engineer | Run the drills in 4.6 and capture run URLs |
| 6 | TASK-101 | Security reviewer | Walk Appendix A and B with evidence; verify nightly audit and exception expiry process worked at least once |
| 7 | TASK-105 and TASK-109 | Frontend engineer | Vercel project settings as code (`vercel.json`), post-deploy smoke workflow, production-domain assignment only after sign-off |

**Rollback.** Remove a job from `ci-gate.needs` through a code-owner PR; relax the ruleset only through an owner action; deleting `.github/` returns to the current state (no CI). Exceptions are plain JSON in git.

**Interaction with legacy.** The workflows trigger on `main` but all steps use `web/` paths; until `web/` exists the workflow files must not be merged (a missing directory would fail every run). The legacy Vite app gets no CI in this plan.

## 15. Alternatives considered

| Alternative | Why not chosen |
|---|---|
| Deploy from GitHub Actions with the Vercel CLI and a deploy token | Puts a token that can ship to production into GitHub; needs `secrets.*` in workflows; fork PR handling gets harder. Vercel's Git integration needs none of it (DEC-CI-01). |
| Renovate | Strong grouping and scheduling, but needs an app or self-hosted runner with repository write access; Dependabot is native and sufficient (DEC-CI-05). Reconsider if Dependabot's cooldown or grouping proves inadequate. |
| pnpm for stricter dependency isolation and `minimumReleaseAge` | ARCH-001 DEC-002 chose npm; npm now has `min-release-age`, `allow-git` and install-script policy, so the main reasons to switch are weaker (DEC-CI-08). |
| Third-party scanners (Snyk, Socket, Sonar, audit-ci, lockfile-lint) | Adds a third-party service or package to police third-party packages and needs a token or app permission; the in-repo script is small, testable and reviewable (DEC-CI-04). Can be added later as advisory checks. |
| `npm audit --audit-level=high` alone | Judges package-level roll-up, misses CVSS-high advisories labelled moderate, has no exception expiry, no scope split, no dev/prod distinction. Kept only as a convenience in `.npmrc`. |
| Require each CI job by name | Renaming a job or a skipped job leaves the PR stuck or unprotected; one aggregate job avoids both (DEC-CI-02). |
| Tag pinning (`@v4`) for first-party actions | Tags are mutable; full SHA is cheap with Dependabot maintaining it. |
| Runner egress filtering / hardening agent | Valuable but is a third-party action; defer until a concrete need appears. |
| Mandatory signed commits | Moderate benefit, real friction, only helps if every contributor is set up; left optional. |
| `pull_request_target` for labelling or comments | Highest-risk trigger; no feature needs it; banned. |
| Reusing the existing Vercel project for `web/` | Env scoping and promotion settings would change a live production deployment before cutover (DEC-CI-09). |
| Provenance attestation of the build | Does not describe the artifact Vercel ships (DEC-CI-10). |

## 16. Risks, open decisions, uncertainties

### 16.1 Open decisions (owner or planner)

| # | Decision | Recommended default |
|---|---|---|
| OD-CI-01 | Contract stub server for production-profile CI builds | Yes (section 4.5) |
| OD-CI-02 | Minimum release age, security-fix floor | 7 days, 1 day |
| OD-CI-03 | Patch SLA values and framework security-release window | 2 / 7 / 30 days; 3 days for Next, React, Radix |
| OD-CI-04 | Reviewer model for a small team | Second human reviewer; if impossible, one named bypass actor with after-the-fact review recorded |
| OD-CI-05 | Direct dependency pinning | Exact for all but `next`, `react`, `react-dom`, `tailwindcss`, `@tanstack/react-query` (keep ARCH-001 `~`) |
| OD-CI-06 | Separate Vercel project for `web/` | Yes |
| OD-CI-07 | Workflow linter (actionlint or zizmor) as a pinned binary | Adopt if the owner accepts the extra tool |
| OD-CI-08 | Dev-dependency high advisories: warn (proposed) or block (literal TASK-128 text) | Warn with SLA |
| OD-CI-09 | Move the repository into a GitHub organisation | Yes; unlocks org-level 2FA enforcement and team code owners |
| OD-CI-10 | Who implements the follow-on: workflows, `supply-chain.mjs`, CONTRIBUTING/POLICY text | A new task (suggest TASK-129, frontend-engineer with test-engineer review); the plan has no devops owner value (section 17) |

### 16.2 Uncertainties to verify

I had no web access. Everything about GitHub, Vercel, Railway, Supabase, Dependabot and third-party tools below is from memory or from the local npm 12.0.2 documentation, and is **unverified**. Each item has an owner and a point where it must be settled.

| # | Uncertainty | Settled by |
|---|---|---|
| U-01 | GitHub plan and repository visibility: availability of rulesets/branch protection, required reviews, CODEOWNERS enforcement, secret scanning, push protection and Dependabot on a private repository on the current plan; org-level 2FA enforcement | Owner, stage 0 |
| U-02 | Which npm version runs on GitHub runners with Node 24 and on Vercel: support for `min-release-age`, `allow-git`, `strict-npmrc`, `allowScripts`, `npm sbom`, `npm audit signatures`; behaviour of an unknown `.npmrc` key (error vs warning); that `min-release-age` is honoured by `npm ci` | TASK-007 (run `npm -v` and each option on the runner and in a Vercel build log) |
| U-03 | That `ignore-scripts=true` skips `prebuild`/`postbuild` in `npm run build` on the pinned npm (documented in npm config docs, not tested here) | TASK-007 test |
| U-04 | Whether the GitHub setting "require actions to be pinned to a full-length commit SHA" exists in the current UI | Owner, stage 0 |
| U-05 | Dependabot `cooldown` and `groups` syntax and behaviour, and whether it updates SHA pins while preserving the version comment | TASK-128 follow-on; GitHub docs |
| U-06 | Vercel plan features: custom environments (`staging`), per-environment Sensitive variables, team roles that hide Sensitive values, team-wide 2FA enforcement | Owner, stage 0 |
| U-07 | Vercel default for deployments from forks and whether Deployment Protection covers them | Owner, stage 0 |
| U-08 | Railway and Supabase 2FA enforcement and RBAC options per plan | Owner |
| U-09 | Licence terms of the maintained `gitleaks-action` for the owner's repository type; availability of a pinned release binary with checksums | Implementer |
| U-10 | Vercel setting to disable or restrict promoting a preview deployment to production, and to restrict the production branch | Owner, stage 0 |
| U-11 | That Vercel builds `web/` using `npm ci` with `web/.npmrc` honoured when the Root Directory is `web`, and that overrides in `vercel.json` `installCommand` are respected | TASK-007, TASK-115 |
| U-12 | Final name of the mock-only publish secret and the preview opt-in variable (ARCH-001 does not name them) | TASK-007 |
| U-13 | PR wall time and Actions minutes; whether Playwright with WebKit fits the target | Stage 2 |
| U-14 | Stability of the `npm audit --json` shape (`via[]` advisory objects, `cvss`, `fixAvailable`) across npm versions; observed once on npm 12.0.2 | `supply-chain.mjs` fixtures |
| U-15 | Owner confirmation of the licence allow-list | Owner |
| U-16 | Named backup person for SLA acknowledgement | Owner |
| U-17 | Whether the Vercel deployment status check can or should also be a required check | Owner, stage 3 |
| U-18 | Actions minutes cost on a private repository | Owner |
| U-19 | Node 24 availability on `actions/setup-node` and Vercel (already ARCH-001 OD-07) | TASK-007 |
| U-20 | Whether `deployment_status` events from Vercel arrive reliably for the post-deploy smoke workflow, or a scheduled poll is better | TASK-109 |

### 16.3 Risks

See the front matter (RISK-CI-01 to RISK-CI-06). Two more worth stating:

- **Control sprawl.** 81 controls (Appendix A) is a lot for a small team. Mitigation: 47 are code that runs without human attention; the owner list (Appendix B) is finite, mostly one-time, and has a quarterly review rather than daily work. If effort must be cut, keep first: D-01, A-01, A-02, A-03, A-06, S-01, S-08, M-01 to M-04, H-01, H-02, A-09, N-04, N-08, N-02. Those seventeen address the highest-likelihood paths.
- **Owner awareness items outside this task:** (1) the legacy lockfile already shows one high and two moderate production advisories (react-router chain); the legacy app is live but scheduled for deletion at TASK-107, so a decision to patch or accept is the owner's; (2) `git status` shows legacy `src/` as deleted but not committed while the plan says it stays until TASK-107; (3) `.env.local` exists in the working tree (ignored by `*.local`); I did not read it.

## 17. Traceability and proposed edits to other documents

### 17.1 TASK-128 acceptance

| Acceptance item | Where addressed | Status |
|---|---|---|
| High/critical audit runs in CI | Sections 5, 4.3 G11 | Specified; implemented by the follow-on |
| Sample workflow shows pinned SHA | Appendix C (placeholders; format shown, no SHA invented) | Template only |
| 2FA and env scoping rules stated | Sections 10, 8 | Specified |
| SLA section added to CONTRIBUTING | Section 5.2 supplies the text; CONTRIBUTING.md **not created** (this task may not create or edit other files) | Text ready; file is a follow-on |
| Deliverables `.github/workflows/POLICY.md` and CONTRIBUTING update | Not created (instruction); content source is this document | Follow-on |
| Tests: "CI verification" | Section 4.6 drills | Follow-on |

### 17.2 Edits proposed to other documents (not made here)

| Document | Edit |
|---|---|
| ARCH-001 17.1 "Dependency risk (F-19)" and 28.5 F-19 | Replace "Deferred to backend plan" with "Specified in OPS-002; web scope owned by TASK-128"; reference severity policy and SLA |
| ARCH-001 6.3 and 18.3 | Replace `prebuild`/`postbuild` with an explicit `build` chain (I-1); name the guard and `check:build-output` order |
| ARCH-001 17.2 | Add `MOCK_PUBLISH_SECRET` (name TBD) and the preview opt-in variable to the table; state "must not exist in Production/Staging" |
| PLAN-001 TASK-128 | Reword goal (4): "dev-only high is warn with SLA, critical blocks" if OD-CI-08 stays; note npm publish 2FA is vacuous (`private: true`); add follow-on task for implementation and a statement that no devops owner exists in the enum |
| PLAN-001 TASK-007 | Add acceptance: `.npmrc` content from 6.1, `.gitignore` rules, explicit build chain, `engines`, `private`, guard tests from 9.2; Vercel project settings per section 8 |
| PLAN-001 TASK-008 / 009 / 121 / 099 | Add acceptance: command is wired into the named job (4.2) and has a failing fixture; Playwright `@smoke` selection; `check:build-output` positive control |
| PLAN-001 TASK-101 | Add Appendix A/B evidence walk as a checklist item; verify exception process exercised |
| PLAN-001 TASK-105 / 109 | Import L6 and L7 (promotion disabled; post-deploy smoke assertions) |
| TASK-126 `ARCH-001-ops-checklist.md` | Cross-reference Deployment Protection and fork settings in 8.4 so there is one list |
| `templates/` | Optionally add an ops-spec template or relax the `ARCH-` id pattern (see schema note) |

## Appendix A. Controls register (81)

Type: **R** repo automation (code or file, no human step after review), **B** both (file plus an owner setting), **O** owner-only console or process, **P** written policy. "Evidence" is what TASK-101 asks for.

| ID | Control | Type | Section | Evidence |
|---|---|---|---|---|
| N-01 | `npm ci` is the only installer; `npm install`, `yarn`, `pnpm install`, piping curl or wget into a shell banned in workflows and package scripts | R | 6.4, 7.1 | `workflows` check log; drill |
| N-02 | Lockfile v3 committed; registry-only sources, sha512 integrity, no git/file/URL specifiers; no `.npmrc` registry override or auth lines | R | 6.4 | `lockfile` check fixtures |
| N-03 | Changed integrity for an existing `name@version` fails; lockfile-only change needs bot author or label plus code-owner review | R | 6.4 | fixture; CODEOWNERS |
| N-04 | `ignore-scripts=true` | R | 6.1, 6.2 | `.npmrc`; install log |
| N-05 | Install-script inventory compared to exceptions | R | 6.2 | `install-scripts` output |
| N-06 | `allow-git=none` | R | 6.1 | `.npmrc`; fixture |
| N-07 | `min-release-age=7` in `.npmrc` | R | 6.3 | `.npmrc`; verify U-02 |
| N-08 | CI release-age check on added/changed versions (security-fix exception path) | R | 6.3 | `release-age` output |
| N-09 | Exact versions for new direct dependencies; `~` only for five framework packages | R | 6.4 | `save-exact`; `package.json` |
| N-10 | Dependabot version updates for npm and github-actions, grouped, cooldown, owner enables alerts and security updates | B | 6.5 | `dependabot.yml`; Settings screenshot |
| N-11 | New or upgraded runtime dependency review in PR template; code owner on `package.json` | R | 6.8 | template; CODEOWNERS |
| N-12 | Licence allow/review/deny list | R | 6.6 | `licenses` output |
| N-13 | `npm audit signatures` | R | 6.7 | job log |
| N-14 | CycloneDX SBOM artifact per `main` build | R | 6.9 | artifact |
| N-15 | Node/npm pinned: `.nvmrc`, `engines`, `engine-strict`, `setup-node` from file | R | 6.4 | files |
| N-16 | `"private": true` in `web/package.json` | R | 6.4 | `lockfile` check |
| D-01 | Production audit: block high/critical by effective severity (CVSS band aware) | R | 5.1 | `audit` output; planted-advisory drill |
| D-02 | Dev audit: block critical, warn high | R | 5.1 | output |
| D-03 | Typed exceptions registry: owner, approver, expiry, max lifetime, renewal rule | R | 5.4 | `exceptions` output; fixtures |
| D-04 | Nightly full audit; issue for failures and exceptions expiring in 7 days | R | 4.1, 5.4 | nightly run |
| D-05 | Patch SLA in CONTRIBUTING.md | P | 5.2 | file; `sla-breach` count |
| P-01 | Single required aggregate check `ci-gate` | B | 4.2 | ruleset export |
| P-02 | `static` job: `npm run check` | R | 4.2 | job log |
| P-03 | `build-prod` job: explicit build chain and `check:build-output` on production profile | R | 4.2, 9 | job log |
| P-04 | `check:bundle` against `budgets.json` | R | 4.3 | job log |
| P-05 | Playwright PR smoke on Chromium and WebKit with axe serious+, no-JS, CSP and request-log assertions | R | 4.3 | report artifact |
| P-06 | `export:contract` drift check | R | 4.3 | job log |
| P-07 | Pipeline verification: fixture tests and rollout drills | R | 4.6 | run URLs |
| A-01 | Every `uses:` pinned to a 40-character commit SHA with version comment | R | 7.1 | `workflows` check |
| A-02 | `permissions: {}` at workflow level; minimum per job | R | 7.1 | check |
| A-03 | Banned triggers incl. `pull_request_target`, `workflow_run`, `issue_comment` | R | 7.1 | check |
| A-04 | `persist-credentials: false` on checkout | R | 7.1 | check |
| A-05 | No untrusted `github.*` expressions in `run:` | R | 7.1 | check |
| A-06 | No `secrets.*` other than `GITHUB_TOKEN` | R | 7.1 | check |
| A-07 | GitHub-hosted runners only, pinned image label | B | 7.1, 7.2 | check; Settings (no runners) |
| A-08 | Actions policy: GitHub-owned actions only (+ SHA pin requirement if available), read-only default token, no PR approval by Actions | O | 7.2 | screenshot |
| A-09 | `main` ruleset: PR, required review(s), dismiss stale, code owners, `ci-gate`, up to date, no force push or deletion, no bypass | O | 7.3 | ruleset JSON/screenshot |
| A-10 | CODEOWNERS file for security-sensitive paths and "require code owner review" enabled | B | 7.3 | file; ruleset |
| A-11 | Tag protection for release tags | O | 7.3 | screenshot |
| A-12 | CODEOWNERS and `.github/` are themselves owned paths | R | 7.3 | file |
| A-13 | PR template with security checklist (exception, dependency, action SHA tag match) | R | 6.8 | file |
| A-14 | Workflow lint beyond in-repo checks (pinned binary) | R | 7.1 | OD-CI-07 |
| A-15 | `timeout-minutes` on every job; `concurrency` group | R | 7.1 | check |
| A-16 | Secret scanning, push protection, private vulnerability reporting on | O | 7.2 | screenshot |
| A-17 | CodeQL (optional, advisory only) | O | 7.2 | optional |
| A-18 | Fork PR workflows need approval; no secrets or write tokens to forks | O | 7.2 | screenshot |
| A-19 | `SECURITY.md` with reporting channel and SLA pointer | R | 5.2 | file |
| A-20 | Artifacts contain no `.env*`, no server build output; no env dumps in logs | R | 7.1 | review |
| A-21 | Caches limited to npm download cache and Playwright browsers; none executed | R | 7.1 | workflow |
| A-22 | Audit webhooks, deploy keys, GitHub Apps, outside collaborators | O | 7.2 | list |
| S-01 | Per-environment variable scoping; nothing in "All Environments" that should be scoped | O | 8.2 | Vercel screenshot |
| S-02 | Vercel Sensitive flag on all secrets in Production and Staging | O | 8.2 | screenshot |
| S-03 | `NEXT_PUBLIC_*` secret-name guard and server-secret value scan of client output | R | 8.2 | `guard-env`, `check:build-output` |
| S-04 | Server env module with `server-only` | R | 8.2 | lint/build |
| S-05 | Shared secrets generated with CSPRNG, >= 32 bytes, distinct per environment | O | 8.3 | register entry |
| S-06 | Secret rotation: every 6 months, on exposure, on offboarding; two-secret window | O | 8.3 | register dates |
| S-07 | Vercel fork-deployment protection and Deployment Protection on previews; noindex | O | 8.4 | screenshot |
| S-08 | No GitHub repository or environment secrets (workflow check plus empty settings) | B | 7.2, 8.1 | check; Settings list |
| S-09 | Railway and Supabase environment/secret scoping | O | 8.5 | screenshot |
| S-10 | Secret scanning in CI (diff and full tree) plus GitHub push protection | B | 8.7 | job log; Settings |
| S-11 | CI uses generated dummy secrets (masked) | R | 8.2 | workflow |
| S-12 | `.gitignore` for `web/.env*`; `.env.example` placeholders only | R | 8.2 | file |
| S-13 | Leak response: rotate first, then purge; record | P | 8.7 | CONTRIBUTING |
| S-14 | Separate Vercel project for `web/` | O | 8.2 | project list |
| M-01 | Allow-list `guard-env` with unknown `VERCEL_ENV` = production | R | 9.1 | tests 1 to 3 |
| M-02 | Explicit build chain, no reliance on lifecycle hooks | R | 9.1 | `scripts` check |
| M-03 | Sentinel scan with positive control | R | 9.1 | tests 4, 5 |
| M-04 | Route and file absence (`/handoff`, `/api/mock-publish`, banner, fixtures) | R | 9.1 | test 7 |
| M-05 | No `NEXT_PUBLIC_USE_MOCKS` or mock secret in Production/Staging scope or committed files | B | 9.1 | file scan; screenshot |
| M-06 | Promote-from-preview disabled; production deploys from `main` only | O | 9.1 | screenshot |
| M-07 | Post-deploy smoke for mock leak and unsigned revalidate (after cutover) | R | 9.1 | workflow |
| H-01 | GitHub: 2FA (passkey/key preferred), recovery codes, org enforcement | O | 10.1 | attestation |
| H-02 | Vercel: 2FA, least-privilege roles | O | 10.1 | attestation |
| H-03 | Railway: 2FA, scoped membership | O | 10.1 | attestation |
| H-04 | Supabase: 2FA, key custody | O | 10.1 | attestation |
| H-05 | npm: no account needed; if exists 2FA and no automation tokens | O | 10.1 | attestation |
| H-06 | Razorpay, registrar/DNS, email provider, recovery mailbox: 2FA, domain lock | O | 10.1 | attestation |
| H-07 | Token policy: fine-grained, expiring, none in CI | O | 10.1 | token lists |
| H-08 | Quarterly access review | O | 10.1 | dated record |
| H-09 | Offboarding same day incl. secret rotation | O | 10.1 | record |
| H-10 | Break-glass and recovery documented and tested once | O | 10.1, 12 | record |

Counts: R 47, B 7, O 25, P 2 = 81. Owner involvement (B + O): 32 controls.

## Appendix B. Owner manual configuration checklist

Dated evidence (screenshot or settings export) is attached to the TASK-101 review for each item. Stage numbers refer to section 14. Items marked (verify) depend on plan features listed in section 16.2.

**GitHub (stage 0, 3)**
- [ ] H-01 2FA on the owner account and every collaborator; passkey or security key if possible; recovery codes stored offline. Consider moving the repository into an organisation and enforcing 2FA (OD-CI-09, verify U-01).
- [ ] A-22 Review collaborators, outside collaborators, deploy keys, webhooks, installed GitHub Apps, SSH keys; remove unused.
- [ ] A-08 Actions: allow GitHub-owned actions only; require SHA pinning if the setting exists (U-04); default workflow permission read-only; disallow Actions creating/approving PRs.
- [ ] A-18 Fork pull request workflows require approval; no secrets to forks.
- [ ] S-08 No repository or environment secrets; no self-hosted runners (A-07).
- [ ] A-16 Secret scanning, push protection, private vulnerability reporting.
- [ ] N-10 Dependabot alerts, security updates and version updates enabled.
- [ ] A-09 Ruleset on `main` per 7.3 (stage 0 without `ci-gate`; add `ci-gate` at stage 3). Name the code owners and reviewers (OD-CI-04); fill CODEOWNERS handles.
- [ ] P-01 Mark `ci-gate` as the required check (stage 3).
- [ ] A-10 Enable "Require review from Code Owners".
- [ ] A-11 Protect release tags.
- [ ] A-17 Decide on CodeQL (optional).
- [ ] M-05 Confirm no `NEXT_PUBLIC_USE_MOCKS`-style variables exist as GitHub variables.

**Vercel (stage 0; again at TASK-105)**
- [ ] S-14 Create a separate project for `web/` (OD-CI-06), Root Directory `web`, region `sin1`, no production domain until cutover.
- [ ] S-01 Create each variable per environment (matrix 8.2); nothing in "All Environments" for secrets or mock variables.
- [ ] S-02 Mark secrets Sensitive in Production and Staging (verify U-06).
- [ ] S-05 Generate `REVALIDATE_SECRET` and `PREVIEW_SECRET` locally with a CSPRNG (distinct per environment); paste only into Vercel and Railway; record creation date.
- [ ] S-07 Deployment Protection (Vercel Authentication) on previews; confirm fork deployment authorisation behaviour (verify U-07); details with TASK-126.
- [ ] M-06 Disable or restrict promote-from-preview; production branch = `main` only (verify U-10).
- [ ] H-02 2FA on all team members; least-privilege roles; no access tokens issued unless needed.
- [ ] M-05 Production and Staging scopes contain no `NEXT_PUBLIC_USE_MOCKS` and no mock-publish secret.
- [ ] U-17 Decide whether the Vercel deployment status should also be required.

**Railway (stage 0)**
- [ ] S-09 Separate production and staging environments; secrets as service variables per environment; no sharing of production variables into staging; PR environments, if enabled, hold no production variables.
- [ ] H-03 2FA and scoped membership (verify U-08).

**Supabase (stage 0)**
- [ ] H-04 2FA; separate production and staging projects (TASK-117); service-role key only in Railway; password rotation record.
- [ ] S-09 Confirm no Supabase key appears in Vercel or GitHub.

**Other systems (stage 0)**
- [ ] H-06 2FA on Razorpay, domain registrar/DNS, email provider and the recovery mailbox; registrar lock on.
- [ ] H-05 If an npm account exists: 2FA, no automation tokens. Otherwise record "no npm account".
- [ ] H-07 Replace classic or long-lived tokens with fine-grained, expiring ones; none in CI.

**Process and policy (stages 0, 6)**
- [ ] D-05 Approve SLA values and name the acknowledgement owner and backup (OD-CI-03, U-16).
- [ ] N-12 Confirm licence allow-list (U-15).
- [ ] S-06 Create the private access/secret register: creation and rotation dates, who holds recovery codes, hardware key locations.
- [ ] H-10 Write and test the break-glass procedure once (Vercel rollback; pause Railway service).
- [ ] H-08 Calendar a quarterly access review; H-09 define the offboarding checklist.
- [ ] Decide OD-CI-01 to OD-CI-10 (section 16.1).

## Appendix C. Template workflow skeleton (for TASK-008 / TASK-099 / TASK-007 implementers)

> **TEMPLATE ONLY. NOT A WORKING WORKFLOW.** It is not saved under `.github/`, must not be copied verbatim, and contains no real action SHAs: every `<FULL_40_CHAR_COMMIT_SHA>` is a placeholder. The implementer resolves each SHA from the action's own repository release page at implementation time and writes the release tag in the trailing comment. Script names, the preview opt-in variable and the contract stub are those proposed in this document or in ARCH-001 and are not yet implemented. Job logic that depends on unverified behaviour is marked `# VERIFY`. Pin every `uses:` the same way; do not add third-party actions without section 7.1 rule 2.

```yaml
# .github/workflows/ci.yml  -- TEMPLATE (OPS-002 Appendix C)
name: ci

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  # No pull_request_target, workflow_run, issue_comment, repository_dispatch (rule A-03)

permissions: {}            # A-02: nothing by default; each job asks for the minimum

concurrency:
  group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

defaults:
  run:
    shell: bash
    working-directory: web

env:
  CI: "true"
  NEXT_TELEMETRY_DISABLED: "1"

jobs:
  workflows:
    name: workflows
    runs-on: ubuntu-24.04              # A-07: pinned image label, GitHub-hosted
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@<FULL_40_CHAR_COMMIT_SHA>   # <release tag, resolved by implementer>
        with:
          persist-credentials: false                         # A-04
      - uses: actions/setup-node@<FULL_40_CHAR_COMMIT_SHA> # <release tag>
        with:
          node-version-file: web/.nvmrc
      # Script is zero-dependency, so no npm install is needed here.
      - name: Workflow and package-script policy (A-01..A-06, N-01, M-02)
        run: node scripts/ci/supply-chain.mjs workflows scripts --root ..

  secrets:
    name: secrets
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@<FULL_40_CHAR_COMMIT_SHA>   # <release tag>
        with:
          persist-credentials: false
          fetch-depth: 0
      - name: Secret scan (S-10)
        run: |
          # TEMPLATE placeholder: run <PINNED_SECRET_SCANNER_COMMAND>, see OPS-002 section 8.7   (VERIFY U-09)
          echo "replace this step"
          exit 1

  static:
    name: static
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@<FULL_40_CHAR_COMMIT_SHA>   # <release tag>
        with:
          persist-credentials: false
      - uses: actions/setup-node@<FULL_40_CHAR_COMMIT_SHA> # <release tag>
        with:
          node-version-file: web/.nvmrc
          cache: npm                                         # download cache only (A-21)
          cache-dependency-path: web/package-lock.json
      - run: npm ci                                          # N-01: the only installer
      - run: npm run check                                   # typecheck + lint + check:deps + check:tokens + test
      - name: Contract export is up to date (P-06)
        run: |
          npm run export:contract
          git diff --exit-code -- ../docs/architecture/pgapi-contract

  build-prod:
    name: build-prod
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    permissions:
      contents: read
    env:
      VERCEL_ENV: production                 # production PROFILE; guard must pass with mocks off
      NEXT_PUBLIC_USE_MOCKS: "false"
      NEXT_PUBLIC_SITE_URL: https://example.invalid
      NEXT_PUBLIC_API_BASE_URL: /api
      API_INTERNAL_URL: http://127.0.0.1:4010   # contract stub (OD-CI-01), not a real backend
    steps:
      - uses: actions/checkout@<FULL_40_CHAR_COMMIT_SHA>   # <release tag>
        with:
          persist-credentials: false
      - uses: actions/setup-node@<FULL_40_CHAR_COMMIT_SHA> # <release tag>
        with:
          node-version-file: web/.nvmrc
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - name: Dummy secrets for the leak scan (S-11); never real values
        run: |
          for n in REVALIDATE_SECRET PREVIEW_SECRET; do
            v="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
            echo "::add-mask::$v"
            echo "$n=$v" >> "$GITHUB_ENV"
          done
      - name: Start contract stub
        run: |
          node scripts/ci/contract-stub.mjs &
          for i in $(seq 1 30); do curl -fsS http://127.0.0.1:4010/healthz && break; sleep 1; done
      - run: npm run build                 # explicit chain: guard-env -> next build -> check:build-output (M-01..M-04)
      - run: npm run check:build-output    # re-run explicitly; includes sentinel scan (M-03)
      - run: npm run check:bundle          # budgets.json (P-04)
      - uses: actions/upload-artifact@<FULL_40_CHAR_COMMIT_SHA> # <release tag>
        with:
          name: route-bundle-stats
          path: web/.next/diagnostics/route-bundle-stats.json   # VERIFY path against the pinned Next version
          retention-days: 7

  e2e-smoke:
    name: e2e-smoke
    runs-on: ubuntu-24.04
    timeout-minutes: 25
    permissions:
      contents: read
    env:
      VERCEL_ENV: preview                    # mock PROFILE
      NEXT_PUBLIC_USE_MOCKS: "true"
      # <PREVIEW_MOCK_OPT_IN_VAR>: "true"    # name decided in TASK-007 (U-12)
      NEXT_PUBLIC_SITE_URL: https://example.invalid
    steps:
      - uses: actions/checkout@<FULL_40_CHAR_COMMIT_SHA>   # <release tag>
        with:
          persist-credentials: false
      - uses: actions/setup-node@<FULL_40_CHAR_COMMIT_SHA> # <release tag>
        with:
          node-version-file: web/.nvmrc
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium webkit   # explicit; no postinstall
      - name: Playwright PR smoke incl. axe serious+, no-JS, CSP, request-log (P-05)
        run: npm run test:e2e -- --grep @smoke                       # selection mechanism defined by TASK-009
      - uses: actions/upload-artifact@<FULL_40_CHAR_COMMIT_SHA> # <release tag>
        if: failure()
        with:
          name: playwright-report
          path: web/playwright-report
          retention-days: 7

  supply-chain:
    name: supply-chain
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    permissions:
      contents: read
    env:
      # SHAs only; not user-controlled strings. Pull request: base sha. Push: previous sha.
      BASE_SHA: ${{ github.event.pull_request.base.sha || github.event.before }}
    steps:
      - uses: actions/checkout@<FULL_40_CHAR_COMMIT_SHA>   # <release tag>
        with:
          persist-credentials: false
          fetch-depth: 0                       # release-age needs the base lockfile
      - uses: actions/setup-node@<FULL_40_CHAR_COMMIT_SHA> # <release tag>
        with:
          node-version-file: web/.nvmrc
      - run: npm ci
      - name: Lockfile, release age, exceptions, audit policy, licences, install scripts
        run: node scripts/ci/supply-chain.mjs lockfile release-age exceptions audit licenses install-scripts --base "$BASE_SHA"
      - run: npm audit signatures            # N-13  VERIFY U-02
      - name: SBOM (main only, N-14)
        if: github.ref == 'refs/heads/main'
        run: npm sbom --sbom-format cyclonedx > sbom.cdx.json   # VERIFY U-02
      - uses: actions/upload-artifact@<FULL_40_CHAR_COMMIT_SHA> # <release tag>
        if: github.ref == 'refs/heads/main'
        with:
          name: sbom
          path: web/sbom.cdx.json
          retention-days: 90

  ci-gate:                                   # the ONLY required status check (P-01, DEC-CI-02)
    name: ci-gate
    if: ${{ always() }}
    needs: [workflows, secrets, static, build-prod, e2e-smoke, supply-chain]
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    permissions: {}
    defaults:
      run:
        working-directory: .                 # no checkout in this job
    steps:
      - name: Fail unless every needed job succeeded
        env:
          NEEDS: ${{ toJSON(needs) }}
        run: |
          node -e '
            const needs = JSON.parse(process.env.NEEDS);
            const bad = Object.entries(needs).filter(([, v]) => v.result !== "success");
            if (bad.length) { console.error("Not successful:", bad.map(([k, v]) => k + "=" + v.result).join(", ")); process.exit(1); }
          '

# nightly.yml (separate file, same hardening rules; outline only):
#   on: schedule (daily) + workflow_dispatch
#   jobs: full Playwright matrix (6 viewports, Chromium + WebKit + Firefox), Lighthouse mobile on the seven
#   public pages, `supply-chain.mjs audit --scope all --report-expiring 7`, weekly full-history secret scan.
#   Only this workflow gets `issues: write`, used to open or update an issue on failure.
```

```yaml
# .github/dependabot.yml -- TEMPLATE (verify syntax against current GitHub docs, U-05)
version: 2
updates:
  - package-ecosystem: npm
    directory: /web
    schedule:
      interval: weekly
      day: monday
      timezone: Asia/Kolkata
    open-pull-requests-limit: 5
    cooldown:
      default-days: 7                         # VERIFY key names
    groups:
      dev-tooling:
        dependency-type: development
        update-types: [minor, patch]
        exclude-patterns: ["next", "react", "react-dom", "@radix-ui/*"]
    labels: [dependencies]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    groups:
      actions:
        patterns: ["*"]
    labels: [ci]
```
