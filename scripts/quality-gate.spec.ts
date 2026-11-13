import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

	it('stops a fix round that pushed no new commit', () => {
		expect(poller).toMatch(/head_before=\$\(head_sha\)/);
		expect(poller).toMatch(/\[ "\$\(head_sha\)" != "\$head_before" \] \|\| stuck/);
	});
});
