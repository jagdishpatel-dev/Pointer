# PR Doctor — project context

Read this before any task. It is the source of truth for what exists and what the
rules are. Keep answers and changes inside these boundaries.

## What this is

An AI pull-request reviewer built on IBM BOB 2.0. Four roles investigate one PR
and return a MERGE / NEEDS_WORK / BLOCK verdict with a traceable evidence chain.

Built for the IBM TechXchange 2026 Pre-conference Dev Day Hackathon. Submission
closes 10:00 AM ET, Aug 30 2026. This is a **prototype for a 3-minute demo**, not
a production system.

The differentiator is not the verdict. It is that every finding separates
**evidence** (what is literally in the diff) from **inference** (what the agent
concluded). Do not collapse those two anywhere in the UI or the data.

## Stack

Next.js 14 App Router · TypeScript · Tailwind · no `src/` directory · `@/*`
resolves to the project root.

## What already exists — do not rebuild or modify

| Path | What it is |
|---|---|
| `lib/types.ts` | Shared contracts. **Never modify.** Every layer imports these. |
| `fixtures/demo-pr.json` | The entire demo: BLOCK @ 91%, 8 findings, blast radius. **Never modify.** |
| `lib/job-store.ts` | In-memory job + staggered agent progress timing (tested). |
| `lib/bob-adapter.ts` | The only seam to IBM BOB. `DEMO_MODE=fixture` is the kill switch. |
| `app/api/analyze/route.ts` | POST → `{ jobId, estimatedMs }` |
| `app/api/job/[jobId]/route.ts` | GET → live agent progress |
| `app/api/verdict/[jobId]/route.ts` | GET → the `FinalVerdict` |
| `prompts/*.md` | The four BOB role prompts. Product IP, not build instructions. |
| `public/preview.html` | **The design spec.** Match it exactly. |
| `scripts/validate-fixture.mjs` | Run after any fixture change. |

All of the above is verified working: `curl -X POST localhost:3000/api/analyze`
returns a job id, and the verdict endpoint returns BLOCK at 0.91.

## The demo scenario

PR #4821, `acme/ledger-api`, titled "fix: simplify permission check in auth helper".

One line in `src/lib/auth.ts:42` changes from `user.role === 'admin' && user.verified`
to `user.role === 'admin'`. It also deletes the two tests that covered that
behavior. Three files call the helper; one is `billing/refund.ts`, which moves
money and has no coverage.

Verdict is always BLOCK. Never demo a MERGE.

## Design rules

Match `public/preview.html`. Specifically:

- Typefaces: IBM Plex Sans (body), IBM Plex Sans Condensed (display), IBM Plex Mono (data)
- Verdict renders as a stamped triage tag, not a colored banner
- BLOCK `#B3261E` · caution `#8A5A00` · clear `#1F6B45` · BOB blue `#24408E`
- Evidence and inference sit in two facing columns labeled OBSERVED and CONCLUDED,
  with a hard rule between them. This split is the product thesis. Never merge them.
- No emoji, no gradients on text, no stock imagery, no rounded pill buttons

## Rules for every task

- Modify ONLY the files named in the task. No refactoring, no reformatting,
  no "while I was in here" improvements.
- No new dependencies unless the task names one.
- Never invent IBM BOB APIs. If the call shape is unclear, stop and say so.
- Import real values from the fixture. Never hardcode numbers that exist in it.
- If a file already satisfies the requirement, say "already done" and stop.
- OUTPUT: files changed, plus blockers. No summary, no next steps, no explanation
  of obvious code.

Coin budget is tight. Verbose output costs real money on this project.

## Build status

- [x] Contracts, fixture, job store, BOB adapter
- [x] Three API routes, verified live
- [x] Four BOB role prompts
- [x] Design spec (`public/preview.html`)
- [ ] `app/page.tsx` — landing page
- [ ] `app/investigation/page.tsx` — live agent run + verdict + findings list
- [ ] `app/finding/[id]/page.tsx` — evidence/inference split + remediation
- [ ] Agent timeline + risk graph *(cuttable if short on time)*
- [ ] Loading / error states, 1280×720 layout for video capture
- [ ] README + demo video

## Screens still to build

**Landing** — hero → verdict preview card → trust strip → four agent cards →
four-step flow → footer. CTA goes to `/investigation`.

**Investigation** — on mount POST `/api/analyze`, poll `/api/job/[jobId]` every
800ms until complete, then GET `/api/verdict/[jobId]`. Verdict tag on top, three
agent lanes filling live, findings sorted critical-first, each row links to
`/finding/[id]`.

**Finding detail** — severity + title, `file:line`, reporting agent and BOB mode,
the OBSERVED/CONCLUDED split, the diff with the offending line highlighted, then
remediation in a bordered box.

## Do not build

Authentication · database · analytics dashboard · admin panel · design system ·
a general-purpose code graph engine · live GitHub webhooks · production
observability. None of it appears in a 3-minute demo.
