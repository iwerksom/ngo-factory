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
- **Why:** anyone can send requests, and our token has one shared hourly quota. A request that is going to be refused anyway must not spend it, or abuse turns into the next outage for real visitors. Refused requests also must not use up another visitor's allowance. The project page loader caches each issue's label read for 60 seconds in memory; the cache is per instance and lost on restart, and a failed read is not cached. Overlapping requests for one issue share a single read. Known gap: each instance still makes one read per issue after a restart or once the minute is up.

### 7. Automation that decides "ready" or "passed" fails closed

- **Applies to:** scripts and workflows that move a ticket or PR forward because a check came back, today `scripts/agent-poller.sh` (it sets `agent-review` or `agent-stuck`) and any later script that waits on CI or a Qodo review. Not app code under `src`.
- **Why:** an unattended script has nobody to notice a wrong pass. A timeout, a missing or unreadable signal, an empty list of checks or a crash must end as "stuck" with a comment on the ticket, never as "ready". A signal counts only when it belongs to the exact head commit (a Qodo review names the commit it read; an old review that was edited later does not count), and a result is read only from the place it is defined (the last line of the output), not from anywhere in it. Qodo found five of these in the poller on PR 16: a timed-out wait that passed, a failed check that passed, an edited old review counted as new, an earlier line that ended a round, and a crash that left the ticket claimed with no word. A sixth turned up in review of this rule: `ci_state` counted a check with a missing or unknown result as passed. It now allows only known passing results, with tests (`scripts/ci-state.jq`, issue 24).

## Conventions

- Import app code with the `#lib` alias with the `.js` extension (for example `#lib/types.js`), not `$lib`. Use it everywhere, also from one `src/lib` file to another and in specs. `npm run lint` enforces it (`eslint.config.js`, tested in `scripts/import-alias.spec.ts`): no relative or `$lib` imports in `src/lib`, none that reach into `src/lib` from `src/routes`, and no `#lib` import without `.js` (assets such as `.svg` are fine). Sibling imports in `src/routes`, including SvelteKit's generated `./$types`, stay relative. Link to internal pages with `resolve()` from `$app/paths`.
- Svelte 5 runes only (`$state`, `$derived`, `$props`). No legacy `export let` or stores for local state.
- Keep logic in plain TypeScript files under `src/lib` with a `.spec.ts` beside them. Components only render.
- No new dependency without a reason in the PR description. Smaller is the goal.
- Tabs, single quotes (Prettier decides; run `npm run format`).

## Quality gate

This is the definition of done for any review loop: a person or agent running Qodo local review on uncommitted changes (staged and unstaged), or working through Qodo's findings on a PR. `scripts/agent-poller.sh` applies it too.

**Gate:** fix every _valid_ High or Medium finding, whatever its type (Bug, Rule violation, Requirement gap). Leave Low findings unchanged, and list every one of them for the owner.

| Qodo shows (comment group, `action_level`)                   | Gate treats it as                           |
| ------------------------------------------------------------ | ------------------------------------------- |
| High, "Action required", `action_required`                   | High: must be settled                       |
| Medium, "Remediation recommended", `remediation_recommended` | Medium: must be settled                     |
| Low, "Informational" (raw `action_level` not seen yet)       | Low: flag, do not fix                       |
| any other level, none, or a severity that cannot be read     | High: must be settled (fail closed, rule 7) |

A finding's level is the group it is listed under in Qodo's "Code Review by Qodo" comment, which matches its `action_level`. If the two disagree, take the higher. Free text in a review's summary never lowers a level. The type is optional for the decision, because the gate covers every type: where shown, it comes from `finding_source`, where `IssueFinding` is a Bug, `ComplianceRule` a Rule violation and `ComplianceTicketRule` a Requirement gap. These mappings were read off Qodo's comment on PR 16 and its findings on PRs 5, 16 and 31, not from a Qodo document; if a level or type is unclear, say so in the report.

"Settled" means **fixed** (the code or test change, and the check that now passes), or **disputed with evidence** (the file, line, probe or test output that shows the finding is wrong or already handled) **and the owner has seen that evidence and agreed**. Until the owner has agreed, a disputed High or Medium finding is still open. Test a claim before accepting or dismissing it.

**Done requires all of these.** If one is missing, the status is **not done**, and the report says which and what is needed from the owner:

1. No valid High or Medium finding is open.
2. `npm run check`, `lint`, `test` and `build` pass on the final code.
3. The latest completed Qodo review covers the final code: for uncommitted changes, a review of the final diff; for a PR, a review whose commit is the PR's current head (`get-pr-review-findings` names it). A review of an older commit, a timed-out wait or an unreadable result counts as no review.
4. For a PR, the required CI checks are green on that head. (Uncommitted changes have no CI; item 2 is their evidence.)

**Stop, do not loop.** At most two fix rounds on one change. If a third round would be needed, or a round fixes nothing, stop and report **not done** with the blocker.

**Final report:** every finding with its type and level and what was done about it; the checks and their results; the latest review and the commit it covered; all Low findings, including unchanged Low Rule violations; anything unclear in a type or level for the owner to decide.

## Pull requests

- One topic per PR, linked to an issue.
- Describe what changed and how you verified it. Say what is not verified.
- Qodo review comments are answered or fixed before merge.
