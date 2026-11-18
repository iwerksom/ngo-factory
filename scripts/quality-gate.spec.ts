import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Pins the saved quality gate (AGENTS.md, "Quality gate") and the places that must apply it.
 * The gate is prose that an agent reads, so what can be tested is that it is still there, still
 * says the load-bearing things, and that the unattended poller still points at it. If a prompt
 * stops mentioning the gate, the poller silently goes back to "fix everything it can confirm".
 */
const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const agents = read('AGENTS.md');
const poller = read('scripts/agent-poller.sh');

/** The one script line that holds a prompt, found by a phrase only that prompt contains. */
function promptLine(phrase: string): string {
	const line = poller.split('\n').find((l) => l.includes(phrase));
	if (!line) throw new Error(`no line in agent-poller.sh contains "${phrase}"`);
	return line;
}
const workPrompt = () => promptLine('is open for #$issue');
const finalPrompt = () => promptLine('fix rounds. Do not change anything');

/** The text of the "Quality gate" section, up to the next `## ` heading. */
function gateSection(): string {
	const start = agents.indexOf('\n## Quality gate');
	if (start === -1) return '';
	const next = agents.indexOf('\n## ', start + 1);
	return agents.slice(start, next === -1 ? undefined : next);
}

describe('AGENTS.md quality gate', () => {
	const gate = gateSection();

	it('has the section', () => {
		expect(gate).not.toBe('');
	});

	it('fixes valid High and Medium findings of every type, and flags Low ones', () => {
		expect(gate).toMatch(/fix every _valid_ High or Medium finding/);
		expect(gate).toMatch(/Bug, Rule violation, Requirement gap/);
		expect(gate).toMatch(/Leave Low findings unchanged, and list every one/);
		expect(gate).toMatch(/put the list in one PR comment headed "Low findings for the owner"/);
	});

	it('fails closed on a level it cannot read', () => {
		expect(gate).toMatch(/any other level, none, or a severity that cannot be read/);
		expect(gate).toMatch(/High: must be settled \(fail closed/);
	});

	it('maps Qodo levels, and summary text never lowers one', () => {
		expect(gate).toContain('`action_required`');
		expect(gate).toContain('`remediation_recommended`');
		expect(gate).toMatch(/Free text in a review's summary never lowers a level/);
		expect(gate).toMatch(/If the two disagree, take the higher/);
		expect(gate).toContain('"Informational"');
		expect(gate).not.toMatch(/summary labels Low/);
	});

	it('ties "done" to a review of the current head, passing checks and green CI', () => {
		expect(gate).toMatch(/is the PR's current head/);
		expect(gate).toMatch(/`npm run check`, `lint`, `test` and `build` pass/);
		expect(gate).toMatch(/For a PR, the required CI checks are green on that head/);
		expect(gate).toMatch(/Uncommitted changes have no CI/);
	});

	it('stops a stalled loop and says not done', () => {
		expect(gate).toMatch(/At most two fix rounds/);
		expect(gate).toMatch(/\*\*not done\*\*/);
	});
});

describe('scripts/agent-poller.sh', () => {
	it('points the shared prompt, and each round prompt, at the gate', () => {
		expect(poller).toMatch(/COMMON=.*Apply the Quality gate in AGENTS\.md/);
		expect(workPrompt()).toContain('Quality gate in AGENTS.md');
		expect(finalPrompt()).toContain('Quality gate in AGENTS.md');
	});

	it("tells the agent where a finding's level is shown", () => {
		expect(workPrompt()).toMatch(
			/High, Medium or Low group it is listed under in Qodo's 'Code Review by Qodo' comment/
		);
	});

	it('keeps Low findings out of the fix round and lists them for the owner', () => {
		expect(poller).toMatch(/Do not change code for Low findings/);
		expect(poller).toContain('Low findings for the owner');
	});

	it('judges the final read-only round by High and Medium findings only, and ends stuck on an open one', () => {
		expect(finalPrompt()).toMatch(/no open High or Medium finding/);
		expect(finalPrompt()).toMatch(
			/otherwise end with RESULT: stuck: <the open High or Medium finding/
		);
		expect(finalPrompt()).not.toMatch(/otherwise end with RESULT: fixed-needs-rereview/);
	});

	it('sends a disputed High or Medium finding to the owner instead of calling it settled', () => {
		expect(poller).toMatch(/every High and Medium finding is fixed and CI is green/);
		expect(poller).toMatch(/RESULT: stuck: disputed High or Medium finding needs the owner/);
		expect(poller).not.toMatch(/every High and Medium finding is settled/);
	});

	it.each(['3', '10', '-1', 'two', '1.5'])(
		'refuses AGENT_MAX_ROUNDS=%s before doing anything',
		(value) => {
			// The cap runs before the lock, the ticket lookup and every gh call, so this makes no request.
			const run = spawnSync('bash', ['scripts/agent-poller.sh', '--dry-run'], {
				cwd: new URL('..', import.meta.url),
				env: { ...process.env, AGENT_MAX_ROUNDS: value },
				encoding: 'utf8'
			});
			expect(run.status).toBe(2);
			expect(run.stderr).toContain('AGENT_MAX_ROUNDS must be 0, 1 or 2');
		}
	);

	it('stops a fix round that pushed no new commit, and a head it could not read', () => {
		expect(poller).toMatch(/head_before=\$\(head_sha\)/);
		// The lookup is its own statement with `|| stuck`: inside `[ ... ]` a failure would look like a new commit.
		expect(poller).toMatch(/head_after=\$\(head_sha\) \|\| stuck/);
		expect(poller).toMatch(/\[ "\$head_after" != "\$head_before" \] \|\| stuck/);
		expect(poller).not.toMatch(/\[ "\$\(head_sha\)" != /);
	});

	it('has the final read-only round and the fix round write the Low list the owner gets', () => {
		// The final round cannot post a comment, and with AGENT_MAX_ROUNDS=0 no fix round runs.
		expect(finalPrompt()).toMatch(/section headed 'Low findings for the owner'/);
		expect(finalPrompt()).toMatch(/Before the RESULT line/);
		expect(workPrompt()).toMatch(
			/list all of them in your final answer, before the RESULT line, under the heading 'Low findings for the owner'/
		);
	});

	it('lets only the script post the Low list, once, so the PR never holds two', () => {
		// The agents write the list in their answer; neither prompt tells them to post it.
		expect(workPrompt()).toMatch(/Do not post them yourself/);
		expect(workPrompt()).not.toMatch(/in one PR comment headed/);
		expect(finalPrompt()).toMatch(/posts this section as one PR comment/);
		// One call site for the PR comment, and it is the function that the ready path calls.
		expect(poller.match(/gh pr comment "\$pr"/g)).toHaveLength(1);
		expect(poller).toMatch(
			/post_low_report \|\| stuck[^\n]*\n\s*gh issue edit "\$issue"[^\n]*agent-review/
		);
	});

	it('takes the Low list from every round, before anything can stop the run', () => {
		const take = poller.indexOf('LOW_REPORT=$(low_findings_for_owner)');
		expect(take).toBeGreaterThan(-1);
		expect(take).toBeLessThan(
			poller.indexOf('result=$(final_result "$out") || stuck "round $round')
		);
	});

	it('copies the Low list into the ticket comment that says the PR is ready', () => {
		expect(poller).toMatch(/is ready for your review[\s\S]*\$LOW_REPORT/);
	});
});

/** Source of a shell function defined in agent-poller.sh, so its real code runs in the tests below. */
function shellFunction(name: string): string {
	const match = poller.match(new RegExp(`^${name}\\(\\) \\{\\n[\\s\\S]*?\\n\\}$`, 'm'));
	if (!match) throw new Error(`no function ${name}() in agent-poller.sh`);
	return match[0];
}

/** Runs `script` under the poller's own shell options, in a directory with a fake `gh` first on PATH. */
function runShell(script: string, ghBody: string, files: Record<string, string> = {}) {
	const dir = mkdtempSync(join(tmpdir(), 'quality-gate-'));
	try {
		writeFileSync(join(dir, 'gh'), `#!/usr/bin/env bash\n${ghBody}\n`);
		chmodSync(join(dir, 'gh'), 0o755);
		for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
		return spawnSync('bash', ['-c', `set -euo pipefail\n${script}`], {
			cwd: dir,
			env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, DIR: dir },
			encoding: 'utf8'
		});
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

describe('head_sha (the "pushed nothing" guard reads it)', () => {
	const script = () =>
		`${shellFunction('head_sha')}\npr=35 REPO=o/r\nhead_after=$(head_sha) || { echo FAILED; exit 3; }\necho "got:$head_after"`;

	it('returns the commit gh reports', () => {
		const run = runShell(script(), 'echo abc123');
		expect(run.stdout).toBe('got:abc123\n');
	});

	it.each([
		['gh fails', 'exit 1'],
		['gh prints nothing', 'true']
	])('fails instead of returning an empty head when %s', (_name, ghBody) => {
		const run = runShell(script(), ghBody);
		expect(run.status).toBe(3);
		expect(run.stdout).toBe('FAILED\n');
	});
});

describe('Low findings for the ticket comment', () => {
	const answer = [
		'Everything else fixed.',
		'',
		'Low findings for the owner',
		'- src/a.ts:3 naming',
		'- src/b.ts:9 comment',
		'',
		'RESULT: no-open-findings'
	].join('\n');
	const script = () =>
		`${shellFunction('low_findings_for_owner')}\nROOT=${new URL('..', import.meta.url).pathname}\nout="$DIR/answer.txt" log=/run/x.log LOW_LIMIT=60000\nlow_findings_for_owner`;

	it('copies the section, and stops before the RESULT line', () => {
		const run = runShell(script(), 'true', { 'answer.txt': answer });
		expect(run.stdout).toContain('- src/a.ts:3 naming');
		expect(run.stdout).toContain('- src/b.ts:9 comment');
		expect(run.stdout).not.toContain('RESULT:');
		expect(run.stdout).not.toContain('Everything else fixed');
	});

	it('says the list is missing, and does not claim there are none, when the section is absent', () => {
		const run = runShell(script(), 'true', {
			'answer.txt': 'All good.\n\nRESULT: no-open-findings\n'
		});
		expect(run.stdout).toContain('did not list its Low findings');
		expect(run.stdout).not.toMatch(/\bnone\b/i);
	});

	it.each([
		'Low findings for the owner',
		'## Low findings for the owner',
		'### Low findings for the owner:',
		'**Low findings for the owner**',
		'> - Low findings for the owner',
		'LOW FINDINGS FOR THE OWNER'
	])('finds the section when the heading is written as %j', (heading) => {
		const run = runShell(script(), 'true', {
			'answer.txt': `Fixed.\n\n${heading}\n- src/a.ts:3 naming\n\nRESULT: no-open-findings\n`
		});
		expect(run.stdout).toContain('- src/a.ts:3 naming');
		expect(run.stdout).not.toContain('did not list its Low findings');
	});

	it('does not take a sentence that only mentions the words for a heading', () => {
		const run = runShell(script(), 'true', {
			'answer.txt':
				'The Low findings for the owner are below the line.\n- src/a.ts:3 naming\n\nRESULT: no-open-findings\n'
		});
		expect(run.stdout).toContain('did not list its Low findings');
	});

	it('returns a section under the limit whole, with no cut notice', () => {
		const run = runShell(script(), 'true', { 'answer.txt': answer });
		expect(run.stdout).not.toContain('Cut at');
	});

	it('cuts a section over the limit with a notice that names the log, never silently', () => {
		const long = `Low findings for the owner\n${'- x.ts:1 note\n'.repeat(6000)}RESULT: no-open-findings\n`;
		const run = runShell(script(), 'true', { 'answer.txt': long });
		expect(run.stdout).toContain('- x.ts:1 note');
		expect(run.stdout).toContain(
			'[Cut at 60000 characters. The full list is in the run log: /run/x.log]'
		);
		expect(run.stdout.length).toBeLessThan(60200);
	});
});

describe('a stopped ticket keeps the Low list', () => {
	// Runs the real mark_stuck with the worktree cleanup stubbed and `gh` recording its arguments.
	const script = (low: string, pr = '') =>
		`${shellFunction('post_low_report')}
${shellFunction('mark_stuck')}
cleanup_worktree() { :; }
issue=7 REPO=o/r log=/run/x.log claimed=1 pr=${JSON.stringify(pr)}
LOW_REPORT=${JSON.stringify(low)}\nmark_stuck "an open High finding"\ncat "$DIR/calls"`;
	const ghRecorder = 'printf "%s\\n" "$*" >> "$DIR/calls"';

	it('adds the list to the stopped-ticket comment, after the blocker', () => {
		const run = runShell(script('Low findings for the owner\n- src/a.ts:3 naming'), ghRecorder);
		expect(run.stdout).toContain('an open High finding');
		expect(run.stdout).toContain('Low findings for the owner');
		expect(run.stdout).toContain('- src/a.ts:3 naming');
		expect(run.stdout.indexOf('an open High finding')).toBeLessThan(
			run.stdout.indexOf('Low findings for the owner')
		);
	});

	it('also posts the list as the one PR comment when the PR exists', () => {
		const run = runShell(
			script('Low findings for the owner\n- src/a.ts:3 naming', '35'),
			ghRecorder
		);
		const prComments = run.stdout.split('\n').filter((l) => l.startsWith('pr comment 35'));
		expect(prComments).toHaveLength(1);
		expect(prComments[0]).toContain('- src/a.ts:3 naming');
	});

	it('posts nothing on the PR when there is no PR yet or no list', () => {
		expect(
			runShell(script('Low findings for the owner\n- a', ''), ghRecorder).stdout
		).not.toContain('pr comment');
		expect(runShell(script('', '35'), ghRecorder).stdout).not.toContain('pr comment');
	});

	it('leaves the comment as it was when no round has produced a list yet', () => {
		const run = runShell(script(''), ghRecorder);
		expect(run.stdout).toContain('an open High finding');
		expect(run.stdout).not.toContain('Low findings');
	});
});
