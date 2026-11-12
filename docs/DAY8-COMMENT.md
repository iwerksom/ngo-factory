## Task and review scope

Task or ticket: https://github.com/iwerksom/ngo-factory/issues/18, enforce the `#lib` import alias with ESLint (the ticket I investigated on Day 6, in its revised form).

What my agent implemented: two `no-restricted-imports` blocks in `eslint.config.js` (`src/lib` and `src/routes`), 6 relative imports converted to `#lib/<file>.js`, the AGENTS.md Conventions line, and a new spec, `scripts/import-alias.spec.ts`, that lints snippets with the real config.

Files or diff reviewed, including staged and unstaged changes: nothing was committed during the three reviews. The scope was every change against `origin/main` (`8354c1f`): 8 modified files and 1 new untracked file (added with `git add -N` so it was in the diff): 9 files, +135/−8 in the first round and +165/−8 at the end. I used the Qodo MCP tool `start-pre-pr-review` with the full diff inline, plus the ticket link and the decisions as review context. I did not use the `qodo review` command, because the Agentic Toolbox is not installed here. The runs whose metadata I read (rounds 1 and 3) reported the **lite** effort tier (Haiku models), not a deep review, so a clean last round is weaker evidence than it sounds. I did not read round 2's metadata.

## Finding and response

Useful Qodo finding, or no findings: round 2 (4 findings) said my patterns did not match bare specifiers: `import ... from '..'` inside `src/lib`, a bare `$lib`, and `../../lib` from a route (that one resolves to `src/lib/index.ts`). The rule I had just written into AGENTS.md ("none that reach into `src/lib` from `src/routes`") was not true.

What the code or task requirements showed: I did not take the claim on trust. A probe with the real config gave `allowed` for `..`, `.`, bare `$lib` in both blocks, and `../../lib`. The claim was right, and a hole in my own work. The same probe showed that dynamic `import()` and `vi.mock` with relative paths also pass (another round-2 finding, informational).

What we fixed, or why we disagreed:

- **Fixed:** the bare specifiers. `'.'`, `'..'`, `'$lib'` went into the `src/lib` group and `'$lib'`, `'../**/lib'` into the `src/routes` group, with five new spec cases. Mutation check: with the previous patterns, exactly those five cases fail.
- **Disagreed, kept on purpose:** the routes pattern `../**/lib/**` also rejects a route folder that is itself named `lib` (flagged in rounds 1 and 2). A pattern sees the specifier text and not the importing file's depth. The narrowing Qodo suggested (only `../../lib` and `../../../lib`) would miss `../lib/x` from `src/routes/+page.server.ts`, which a probe showed is a real `src/lib` import. The rule can only over-flag, never miss. Documented in the config comment and pinned by a spec case.
- **Not fixed, documented:** dynamic `import()`, `require()` and `vi.mock` with relative paths are not covered. No file in the repo does that. The config comment says what to add if one ever does.
- **Process findings, true:** the description needed the recommendation about Qodo rule 4477684 and "how verified / not verified" sections. Both are in the PR description.

Supporting code, test output or screenshot: the rules and the spec are in the merged commit: [eslint.config.js](https://github.com/iwerksom/ngo-factory/blob/6fe61019bcf7716ea0ef9b01e25051c0de75e52c/eslint.config.js), [import-alias.spec.ts](https://github.com/iwerksom/ngo-factory/blob/6fe61019bcf7716ea0ef9b01e25051c0de75e52c/scripts/import-alias.spec.ts). Run for real on three deliberately bad files, with the merged config:

```
src/lib/demo/bad-extension.ts   1:1  error  '#lib/estimate' import is restricted ... Add the `.js` extension: `#lib/<file>.js`
src/lib/demo/bad-relative.ts    1:1  error  './types' import is restricted ... Use `#lib/<file>.js` (see AGENTS.md, Conventions)
src/routes/bad-reach.ts         1:1  error  '../../lib/estimate.js' import is restricted ... Use `#lib/<file>.js` (see AGENTS.md, Conventions)
```

A fourth file with `./$types` and `#lib/estimate.js` was not flagged, and the real tree has 0 lint errors.

## Result

Checks run and results: `npm run check`, `npm run lint`, `npm run build` pass; 130 tests pass, 24 skipped here because `jq` is missing (CI runs them). The new spec has 26 cases; it fails against the old config and passes against the new one.

Rerun result after fixes, if any: three rounds in total. Round 1: 2 findings. Round 2: 4 findings (one real, fixed). Round 3, on the fixed and still uncommitted code: **no findings**. The work was committed and became PR 31 only after that.

Anything still unresolved:

- Getting the diff to Qodo cost me three failed submissions (about ten minutes of waiting), because I retyped the diff and made small mistakes. I now apply the text to a clean checkout of the base commit before sending.
- Whether Qodo rule 4477684 should be inactivated (recommended) and 4477690 kept. The product owner decides.
- The route-local `lib` over-flag is a known deviation from a Qodo rule derived from the ticket.
- The local review has not been tried at a deeper effort level than the lite tier I saw.

_Written with Claude Code (Claude Sonnet 5.5) acting as developer; my product owner decided what is posted._
