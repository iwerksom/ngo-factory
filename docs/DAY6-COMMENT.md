## Original work order

Ticket link and original wording: https://github.com/iwerksom/ngo-factory/issues/18 (the original wording is kept, unchanged, in a collapsed block at the bottom of the ticket). It said:

> **Enforce the #lib import alias with ESLint instead of review**
>
> **Why:** Qodo raised the same finding twice for a rule we already have: "import without the `#lib` alias and `.js` extension" (PR 10, again on PR 12). A rule that is only enforced by reviewer attention costs one review round every time. 9 relative imports remain in `src` today.
>
> **Tasks:** Add `no-restricted-imports` (patterns `./*`, `../*` for `src/lib` and `src/routes`, plus `$lib/*`) to `eslint.config.js`, with the message "Use `#lib/<file>.js`". Convert the 9 remaining relative imports (the "older files" exception in AGENTS.md goes away). Update the Conventions line in AGENTS.md. Check that Qodo rules 4477684 and 4477690 still say something not covered by lint; if not, propose inactivating them.
>
> **Test cases:** a deliberately bad import in a scratch file makes `npm run lint` fail; `#lib/x.js` imports pass and `.spec.ts` files are not wrongly flagged; `check`, `lint`, `test`, `build` pass. **Not in scope:** any change to app behaviour.

Proposed implementation, if any: one `no-restricted-imports` block over `src/lib` and `src/routes`, then convert the imports by hand.

## What I investigated

**I did not use Codebase Wisdom.** The Agentic Toolbox is not installed on this machine. My product owner chose to try the Qodo MCP tools that are already connected first and not to install anything, so the investigation below was done by me with those tools, git and small experiments. Where Wisdom would have helped (explaining which components depend on the import convention), I checked the code myself.

Questions I asked, and how:

- Which relative imports are there, and who imports what? Qodo's repo search (`litegit-grep`, on the mirror of `main` at 8354c1f) and my own `grep`. Same answer from both.
- What do the two Qodo rules the ticket names actually say? `rules-get` for 4477684 and 4477690.
- Has a similar change been made before? `pull-request-similar`. It failed twice with `MT-UPSTREAM-DOWN` (context-retriever unreachable), so I have no answer from it.
- Would the ticket's exact patterns work? I tried them in a scratch worktree.

Useful findings and source references:

- **The count was wrong.** There are **6** relative imports into `src/lib` ([estimate.ts:1](https://github.com/iwerksom/ngo-factory/blob/8354c1f3ecda279c3894954a2b72326a052619c6/src/lib/estimate.ts#L1), [estimate.spec.ts:11](https://github.com/iwerksom/ngo-factory/blob/8354c1f3ecda279c3894954a2b72326a052619c6/src/lib/estimate.spec.ts#L11), [submission.ts:1](https://github.com/iwerksom/ngo-factory/blob/8354c1f3ecda279c3894954a2b72326a052619c6/src/lib/submission.ts#L1), `submission.spec.ts`, `rate-limit.spec.ts`, `vitest-examples/greet.spec.ts`), not 9. The other 7 relative imports in `src/routes` are all `./$types`, the types SvelteKit generates next to every route.
- **The ticket's patterns would have broken lint.** With the ticket's exact patterns, `eslint src` gave 13 errors: 6 real and 7 false positives on `./$types`. A route's own generated types must stay relative.
- **No exception for specs is needed.** `estimate.spec.ts` already mixes `#lib/estimate.js` (line 10) with `./types` (line 11), so "specs may use `./x`" is not an existing practice, and rule 4477684 flags relative imports into `src/lib` in specs too.
- **The two Qodo rules are covered differently.** 4477684 (use `#lib`, not `$lib` or relative) can be covered entirely by lint. 4477690 (`.js` extension) cannot with the ticket's patterns, and the one asset import `#lib/assets/favicon.svg` correctly has no `.js`.
- **No new dependency is needed.** The built-in rule does the job. `eslint-plugin-import` would add a dependency, and AGENTS.md says smaller is the goal.

What I checked against the project: the 13 errors above (run, not read); that `no-restricted-imports` reads the `<script>` of `.svelte` files (it flagged `+layout.svelte`); the contents of both Qodo rules; that `package.json` maps `#lib/*` to `./src/lib/*`.

Assumptions or suggestions I could not verify:

- The ticket says the same finding came up on PR 10 and PR 12. I did not re-read those reviews; the only source I had is my Day 3 write-up (`docs/DAY3-COMMENT.md`), which says the same thing was flagged on two PRs.
- Whether Codebase Wisdom would have found more dependencies than my search did. I cannot say, because I did not run it.

## Resulting decision

Revised ticket or implementation plan: the ticket was rewritten (same link as above, original kept). New plan: two config blocks. In `src/lib`, forbid `./*`, `../*`, `$lib/*`. In `src/routes`, forbid only `$lib/*` and relative paths that reach into `src/lib`, and allow `./$types` and sibling files. Also flag `#lib/...` without `.js` (assets pass). Convert the 6 imports, specs included. Update AGENTS.md. Add a spec that lints snippets with the real config. The Qodo rule question stays with the product owner after merge.

What changed and why: the count (6, not 9), the routes pattern (it would have failed on `./$types`), the extension check (added, because it is what rule 4477690 is about), and no exception for specs. Nothing about the goal changed.

Remaining questions or blockers: should Qodo rule 4477684 be inactivated now that lint covers it, and should 4477690 stay? The ticket proposes inactivating 4477684 and keeping 4477690. The product owner decides; rule changes are not made without a yes.

_Written with Claude Code (Claude Sonnet 5.5) acting as developer; my product owner picked the ticket and decided what is posted._
