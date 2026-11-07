import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Tests the check classifier the agent poller uses (scripts/ci-state.jq) by running the real
 * jq on sample `statusCheckRollup` data. Rule 7 in AGENTS.md is what these cases protect: a
 * missing or unknown result must never come out as "passed".
 */
const FILTER = fileURLToPath(new URL('./ci-state.jq', import.meta.url));

const jqAvailable = spawnSync('jq', ['--version']).status === 0;
// GitHub's runners ship jq. If it is ever missing there, fail instead of skipping silently:
// a test that quietly does not run is a pass nobody checked.
if (!jqAvailable && process.env.CI) throw new Error('jq is required for scripts/ci-state.spec.ts');

type Check = Record<string, string>;

function classify(checks: Check[]): string {
	const run = spawnSync('jq', ['-r', '-f', FILTER], {
		input: JSON.stringify({ statusCheckRollup: checks }),
		encoding: 'utf8'
	});
	expect(run.status, run.stderr).toBe(0);
	return run.stdout.trim();
}

const done = (conclusion: string): Check => ({ status: 'COMPLETED', conclusion });
const commitStatus = (state: string): Check => ({ state });

describe.skipIf(!jqAvailable)('ci-state.jq', () => {
	it('says none while no check has been reported', () => {
		expect(classify([])).toBe('none');
	});

	it.each(['SUCCESS', 'NEUTRAL', 'SKIPPED'])('passes a finished check ending in %s', (c) => {
		expect(classify([done(c)])).toBe('passed');
	});

	it('passes a commit status in state SUCCESS', () => {
		expect(classify([commitStatus('SUCCESS')])).toBe('passed');
	});

	it.each(['FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'STALE'])(
		'fails a finished check ending in %s',
		(c) => {
			expect(classify([done(c)])).toBe('failed');
		}
	);

	it.each(['FAILURE', 'ERROR'])('fails a commit status in state %s', (s) => {
		expect(classify([commitStatus(s)])).toBe('failed');
	});

	describe('fails closed on a missing or unknown result (issue 24)', () => {
		it('an empty conclusion is not a pass', () => {
			expect(classify([done('')])).toBe('failed');
		});
		it('an unknown conclusion is not a pass', () => {
			expect(classify([done('SOMETHING_NEW')])).toBe('failed');
		});
		it('a check with no status and no result is not a pass', () => {
			expect(classify([{}])).toBe('failed');
		});
		it('one unknown result among passes is not a pass', () => {
			expect(classify([done('SUCCESS'), done('SOMETHING_NEW')])).toBe('failed');
		});
	});

	it.each([
		[{ status: 'IN_PROGRESS', conclusion: '' }],
		[{ status: 'QUEUED', conclusion: '' }],
		[commitStatus('PENDING')],
		[commitStatus('EXPECTED')]
	])('keeps waiting while a check is still running (%j)', (check) => {
		expect(classify([check])).toBe('pending');
	});

	it('keeps waiting when one check is running and another already failed', () => {
		expect(classify([done('FAILURE'), { status: 'IN_PROGRESS', conclusion: '' }])).toBe('pending');
	});

	it('fails when one check failed and the rest passed', () => {
		expect(classify([done('SUCCESS'), done('FAILURE')])).toBe('failed');
	});

	it('passes only when every check passed', () => {
		expect(classify([done('SUCCESS'), done('SKIPPED'), commitStatus('SUCCESS')])).toBe('passed');
	});
});
