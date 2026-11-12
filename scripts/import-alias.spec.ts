import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

/**
 * Tests the import-style lint rules in eslint.config.js (AGENTS.md, "Conventions") by linting
 * small snippets under virtual file paths with the repo's real config. Only the
 * `no-restricted-imports` messages are looked at, so unrelated rules cannot fail these cases.
 */
const eslint = new ESLint({ cwd: process.cwd() });

/** Lints `code` as if it lived at `file`, and returns the import-restriction messages. */
async function restrictedImports(file: string, code: string): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath: file });
	return result.messages.filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.message);
}

const imp = (specifier: string) => `import { x } from '${specifier}';\nexport const y = x;\n`;

describe('imports inside src/lib', () => {
	const file = 'src/lib/example.ts';

	it.each(['./types', '../types', '../../types', './types.js', '$lib/types.js', '$lib', '.', '..'])(
		'rejects %s',
		async (specifier) => {
			expect(await restrictedImports(file, imp(specifier))).toHaveLength(1);
		}
	);

	it('says what to use instead', async () => {
		const [message] = await restrictedImports(file, imp('./types'));
		expect(message).toContain('#lib/<file>.js');
	});

	it('also applies to specs and nested folders', async () => {
		expect(await restrictedImports('src/lib/example.spec.ts', imp('./example'))).toHaveLength(1);
		expect(await restrictedImports('src/lib/data/example.ts', imp('../types'))).toHaveLength(1);
	});

	it.each(['#lib/types.js', '#lib/data/projects.js', '#lib/assets/favicon.svg', '#lib', 'vitest'])(
		'accepts %s',
		async (specifier) => {
			expect(await restrictedImports(file, imp(specifier))).toEqual([]);
		}
	);
});

describe('imports inside src/routes', () => {
	const file = 'src/routes/submit/+page.server.ts';

	it('accepts the generated ./$types and sibling files', async () => {
		expect(await restrictedImports(file, imp('./$types'))).toEqual([]);
		expect(await restrictedImports(file, imp('./Sibling.svelte'))).toEqual([]);
	});

	it.each([
		'$lib/types.js',
		'$lib',
		'../../lib/types.js',
		'../../lib',
		'../../../lib/data/projects.js'
	])('rejects %s, which reaches into src/lib', async (specifier) => {
		expect(await restrictedImports(file, imp(specifier))).toHaveLength(1);
	});

	it('accepts the alias', async () => {
		expect(await restrictedImports(file, imp('#lib/estimate.js'))).toEqual([]);
	});

	// Known over-flag, kept on purpose (see eslint.config.js): the pattern cannot tell
	// `src/routes/lib/x` from `src/lib/x` without knowing how deep the importing file is.
	it('also rejects a route folder named lib, because it cannot resolve the path', async () => {
		expect(await restrictedImports('src/routes/a/+page.ts', imp('../lib/x.js'))).toHaveLength(1);
	});
});

describe('the .js extension on #lib imports', () => {
	it.each(['src/lib/example.ts', 'src/routes/+page.server.ts'])(
		'is required in %s',
		async (file) => {
			for (const specifier of ['#lib/estimate', '#lib/data/projects', '#lib/estimate.ts']) {
				const messages = await restrictedImports(file, imp(specifier));
				expect(messages, specifier).toHaveLength(1);
				expect(messages[0]).toContain('.js');
			}
		}
	);

	it('is not required for assets', async () => {
		expect(
			await restrictedImports('src/routes/+layout.svelte.ts', imp('#lib/assets/a.svg'))
		).toEqual([]);
	});
});
