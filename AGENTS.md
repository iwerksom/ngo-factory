# AGENTS.md

NGO Factory is a small, non-profit platform where local NGOs submit AI projects for their community. Each project moves through public gates (submitted, vetted, refined, estimated, safety review, support plan, funded, building, delivered). SvelteKit 3, Svelte 5 (runes), TypeScript. Read `SPEC.md` first: it says what we build and, as important, what we do not.

## Commands

```bash
npm run dev      # dev server
npm run check    # svelte-check, must pass
npm run lint     # prettier + eslint, must pass
npm test         # vitest, must pass
npm run build    # must pass
```

Run `check`, `lint` and `test` before every PR.

## Rules

Each rule says where it applies and why it exists. Builders follow them; reviewers flag a diff that breaks one.

### 1. Escape text a stranger typed before it goes into a public GitHub issue

- **Applies to:** any code that puts form input into an issue or comment body, today `toIssueBody` in `src/lib/submission.ts`. Use `escapeMarkdown`, and collapse line breaks in one-line fields.
- **Why:** the issue is public, rendered Markdown. Unescaped input can notify people with `@mentions`, link other issues, forge a ticked gate such as `- [x] Vetted`, or, when indented, render as a code block. The last one was a Qodo finding on PR 5 that we first dismissed as harmless.

### 2. No payments and no personal data about end users

- **Applies to:** forms, routes, data models and anything that stores or sends what a visitor enters. The submit form collects no contact details.
- **Why:** everything we receive ends up in a public issue, and the platform does not take money (see "Out of scope" in `SPEC.md`). Funding is simulated.

### 3. Advice to the public keeps the decision-support disclaimer

- **Applies to:** any copy that suggests an action to a farmer or other end user, such as crop mitigation steps, in `src/lib/data` and project pages.
- **Why:** these tools support a decision, they do not make it. A wrong frost or drought call costs someone a harvest.

### 4. Mark simulated data as simulated

- **Applies to:** everything in `src/lib/data` and any view that shows funding, estimates or progress from it.
- **Why:** a visitor must not mistake a simulated funding goal or gate for real money or a real decision.

### 5. Secrets live in the environment, declared in one place

- **Applies to:** `src/env.ts`, `.env.example` and any server code that needs a key. Declare variables with `defineEnvVars`, read them from `$app/env/private` (SvelteKit 3 has no `$env/*`), set them in the ignored `.env`, and list them in `.env.example`.
- **Why:** a committed credential is public the moment it is pushed.

### 6. Local limits come before any GitHub call made for an anonymous visitor

- **Applies to:** server code that calls the GitHub API with our token because someone loaded a page or sent a form, today the submit action (`src/lib/submission-cap.ts`) and the project page loader (`src/lib/gates.ts`).
- **Why:** anyone can send requests, and our token has one shared hourly quota. A request that is going to be refused anyway must not spend it, or abuse turns into the next outage for real visitors. Refused requests also must not use up another visitor's allowance. Known gap: the project page loader still makes one read per page view and has no cache of its own.

## Conventions

- Import app code with the `#lib` alias with the `.js` extension (for example `#lib/types.js`), not `$lib`. New and edited files use it everywhere, also from one `src/lib` file to another; a few older `src/lib` files still import their neighbours as `./types` and are only changed when they are edited anyway. Link to internal pages with `resolve()` from `$app/paths`.
- Svelte 5 runes only (`$state`, `$derived`, `$props`). No legacy `export let` or stores for local state.
- Keep logic in plain TypeScript files under `src/lib` with a `.spec.ts` beside them. Components only render.
- No new dependency without a reason in the PR description. Smaller is the goal.
- Tabs, single quotes (Prettier decides; run `npm run format`).

## Pull requests

- One topic per PR, linked to an issue.
- Describe what changed and how you verified it. Say what is not verified.
- Qodo review comments are answered or fixed before merge.
