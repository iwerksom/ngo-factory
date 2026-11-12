import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

/**
 * Import style from AGENTS.md ("Conventions"): app code is imported as `#lib/<file>.js`, so lint
 * enforces what Qodo's rules 4477684 and 4477690 used to catch only in review.
 *
 * Why two blocks: inside `src/lib` every relative import is a neighbour and must use the alias.
 * In `src/routes` a sibling import is normal, and SvelteKit generates `./$types` beside every
 * route, so only imports that reach into `src/lib` are forbidden there. Specs follow the same
 * rule as the code they test; there is no exception for them.
 *
 * Known over-flag: a pattern sees the specifier text, not the importing file's depth, so in
 * `src/routes` the `../**\/lib/**` pattern also rejects a route folder that is itself named `lib`
 * (`../lib/x` from `src/routes/a/` is `src/routes/lib/x`). That is deliberate. It can only flag
 * too much, never miss an import into `src/lib`, and a route folder named `lib` would be the
 * public URL `/lib`. Fixing it needs a custom rule that resolves paths; not worth the code.
 * Pinned in scripts/import-alias.spec.ts.
 *
 * Not covered: `no-restricted-imports` only sees static `import`/`export ... from`. A dynamic
 * `import('./x')`, `require()` or `vi.mock('./x')` with a relative path passes. No file does that
 * today; add a `no-restricted-syntax` selector if one ever does.
 *
 * `#lib/<file>` with no extension is flagged; assets such as `#lib/assets/favicon.svg` have an
 * extension and pass. Tested in scripts/import-alias.spec.ts.
 */
const useAlias = 'Use `#lib/<file>.js` (see AGENTS.md, Conventions).';
// `#lib/x` or `#lib/dir/x` whose last segment has no dot, or that ends in `.ts`.
const needsJsExtension = {
	regex: '^#lib/(.*/)?[^./]+$|^#lib/.*\\.ts$',
	message: 'Add the `.js` extension: `#lib/<file>.js`.'
};
// A rule's options replace each other across config blocks instead of merging, so each block
// below lists all of its patterns, including `needsJsExtension`.
/** @type {import('eslint').Linter.Config[]} */
const importAliasRules = [
	{
		files: ['src/lib/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{ group: ['.', '..', './*', '../*', '$lib', '$lib/*'], message: useAlias },
						needsJsExtension
					]
				}
			]
		}
	},
	{
		files: ['src/routes/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{ group: ['$lib', '$lib/*', '../**/lib', '../**/lib/**'], message: useAlias },
						needsJsExtension
					]
				}
			]
		}
	}
];

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {}
	},
	...importAliasRules
);
