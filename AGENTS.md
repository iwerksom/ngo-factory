# AGENTS.md

SvelteKit 3, Svelte 5 (runes), TypeScript. Read `SPEC.md` first: it says what we build and, as important, what we do not.

## Commands

```bash
npm run dev      # dev server
npm run check    # svelte-check, must pass
npm run lint     # prettier + eslint, must pass
npm test         # vitest, must pass
npm run build    # must pass
```

Run `check`, `lint` and `test` before every PR.

## Conventions

- Import app code with the `#lib` alias with the `.js` extension (for example `#lib/types.js`), not `$lib`. Link to internal pages with `resolve()` from `$app/paths`.
- Svelte 5 runes only (`$state`, `$derived`, `$props`). No legacy `export let` or stores for local state.
- Keep logic in plain TypeScript files under `src/lib` with a `.spec.ts` beside them. Components only render.
- No new dependency without a reason in the PR description. Smaller is the goal.
- Simulated data lives in `src/lib/data`. Mark anything fake as simulated in the UI.
- Tabs, single quotes (Prettier decides; run `npm run format`).

## Safety

- Never commit credentials. Use `.env` (ignored) and `$env/dynamic/private`.
- Do not add real payment handling, and do not collect personal data about farmers or other end users.
- Any copy that gives advice to the public (for example crop actions) must keep the decision-support disclaimer.

## Pull requests

- One topic per PR, linked to an issue.
- Describe what changed and how you verified it. Say what is not verified.
- Qodo review comments are answered or fixed before merge.
