import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Tests the pr-gate-check skill (.claude/skills/pr-gate-check): its script with a fake `gh`
 * that prints what the real one would after `--jq`, and the skill file's shape. The script
 * must fail closed (AGENTS.md rule 7): a fact it cannot read ends in `error=` and exit 1.
 */
const skillDir = fileURLToPath(new URL('../.claude/skills/pr-gate-check/', import.meta.url));
const script = join(skillDir, 'scripts/pr-state.sh');
const HEAD = 'a'.repeat(40);

let tmp: string | undefined;
afterEach(() => {
	if (tmp) rmSync(tmp, { recursive: true, force: true });
	tmp = undefined;
});

/** What the fake gh prints (or fails with) for each kind of call, found by a word in its arguments. */
type Fake = Partial<
	Record<
		'headRefOid' | 'state' | 'baseRefName' | 'statusCheckRollup' | 'rules' | 'comments',
		string | null | string[]
	>
>;

const GOOD: Fake = {
	headRefOid: HEAD,
	state: 'OPEN',
	baseRefName: 'main',
	statusCheckRollup: 'passed',
	rules: 'verify',
	comments: '1'
};

/**
 * Runs pr-state.sh with a fake gh. A `null` value makes that call exit 1, as a failed gh does; an
 * array gives one answer per call (the last one repeats), for facts that change between reads.
 * `calls` is every argument line the script sent to gh.
 */
function run(fake: Fake, pr = '40') {
	tmp = mkdtempSync(join(tmpdir(), 'pr-state-'));
	const gh = join(tmp, 'gh');
	const log = join(tmp, 'calls.log');
	// A call is told apart by its `--json <key> ` flag; the ruleset call has no such flag.
	const arms = Object.entries({ ...GOOD, ...fake })
		.map(([key, value]) => {
			const pattern = key === 'rules' ? '*rules/branches*' : `*"--json ${key} "*`;
			if (value === null) return `${pattern}) exit 1 ;;`;
			const answers = Array.isArray(value) ? value : [value];
			const list = answers.map((a) => `'${a}'`).join(' ');
			const counter = join(tmp!, `n.${key}`);
			return `${pattern}) n=$(cat ${counter} 2>/dev/null || echo 0); echo $((n+1)) > ${counter}; a=(${list}); printf '%s\\n' "\${a[$n]:-\${a[-1]}}" ;;`;
		})
		.join('\n\t');
	writeFileSync(
		gh,
		`#!/usr/bin/env bash\necho "$*" >> ${log}\ncase "$*" in\n\t${arms}\n\t*) exit 2 ;;\nesac\n`
	);
	chmodSync(gh, 0o755);
	const r = spawnSync('bash', [script, pr], {
		encoding: 'utf8',
		env: { ...process.env, GH: gh }
	});
	const out = Object.fromEntries(
		r.stdout
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
	);
	return { status: r.status, out, calls: existsSync(log) ? readFileSync(log, 'utf8') : '' };
}

describe('pr-state.sh', () => {
	it('prints every fact for a healthy PR', () => {
		const { status, out } = run({});
		expect(status).toBe(0);
		expect(out).toEqual({
			pr: '40',
			url: 'https://github.com/iwerksom/ngo-factory/pull/40',
			state: 'OPEN',
			base: 'main',
			head: HEAD,
			ci: 'passed',
			required_checks: 'verify',
			low_findings_comments: '1'
		});
	});

	it.each(['', 'abc', '4x0', '-1'])('refuses the PR number %j', (pr) => {
		const { status, out } = run({}, pr);
		expect(status).toBe(1);
		expect(out.error).toMatch(/usage/);
	});

	it('fails closed when the head cannot be read', () => {
		const { status, out } = run({ headRefOid: null });
		expect(status).toBe(1);
		expect(out.error).toMatch(/head/);
		expect(out.head).toBeUndefined();
	});

	it('fails closed when the head is empty or not a commit', () => {
		expect(run({ headRefOid: '' }).out.error).toMatch(/not a commit sha/);
		expect(run({ headRefOid: 'main' }).out.error).toMatch(/not a commit sha/);
	});

	it('fails closed when the checks cannot be read', () => {
		const { status, out } = run({ statusCheckRollup: null });
		expect(status).toBe(1);
		expect(out.error).toMatch(/checks/);
	});

	it('does not pass on a check state it does not know', () => {
		const { status, out } = run({ statusCheckRollup: 'looks-fine' });
		expect(status).toBe(1);
		expect(out.error).toMatch(/unknown check state/);
	});

	it.each(['none', 'pending', 'failed'])('reports ci=%s as it is, never as passed', (ci) => {
		expect(run({ statusCheckRollup: ci }).out.ci).toBe(ci);
	});

	it('fails closed when the required checks cannot be read', () => {
		expect(run({ rules: null }).out.error).toMatch(/required checks/);
	});

	it('fails closed when the comment count is not a number', () => {
		expect(run({ comments: 'many' }).out.error).toMatch(/not a number/);
	});

	it('reports zero Low-list comments', () => {
		expect(run({ comments: '0' }).out.low_findings_comments).toBe('0');
	});
});

describe('pr-state.sh, the gaps Qodo found on PR 42', () => {
	it('fails closed when the base branch requires no check', () => {
		const { status, out } = run({ rules: '' });
		expect(status).toBe(1);
		expect(out.error).toMatch(/no required status check/);
	});

	it("reads the rules of the PR's own base branch, not always main", () => {
		const { out, calls } = run({ baseRefName: 'release' });
		expect(out.base).toBe('release');
		expect(calls).toContain('rules/branches/release');
		expect(calls).not.toContain('rules/branches/main');
	});

	it('fails closed when the head moves while the facts are read', () => {
		const other = 'b'.repeat(40);
		const { status, out } = run({ headRefOid: [HEAD, other] });
		expect(status).toBe(1);
		expect(out.error).toMatch(/head moved/);
	});

	it('names the PR url from the repo it read, so Qodo is asked about the same PR', () => {
		expect(run({}, '7').out.url).toBe('https://github.com/iwerksom/ngo-factory/pull/7');
	});

	it('counts a Low-list comment only when the phrase heads it', () => {
		// The pattern is passed to gh's own jq engine (RE2); JavaScript reads this subset the same way.
		const source = readFileSync(script, 'utf8');
		const pattern = /test\("(\^[^"]+Low findings for the owner)"\)/.exec(source)?.[1];
		expect(pattern).toBeDefined();
		const re = new RegExp(String(pattern).replace(/\\\\/g, '\\'));
		for (const heading of [
			'Low findings for the owner',
			'## Low findings for the owner',
			'**Low findings for the owner**',
			'  ### Low findings for the owner (2)'
		]) {
			expect(re.test(`${heading}\n- one`), heading).toBe(true);
		}
		for (const stray of [
			'Please add the Low findings for the owner',
			'I will post Low findings for the owner later',
			''
		]) {
			expect(re.test(stray), stray).toBe(false);
		}
	});
});

describe('SKILL.md', () => {
	const text = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
	const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? '';
	const field = (name: string) => new RegExp(`^${name}: (.+)$`, 'm').exec(frontmatter)?.[1];

	it('has a name that matches its directory (Agent Skills format)', () => {
		expect(field('name')).toBe('pr-gate-check');
	});

	it('has a description that says when to use it, within the format limit', () => {
		const description = field('description') ?? '';
		expect(description).toMatch(/Use (before|when)/);
		expect(description.length).toBeLessThanOrEqual(1024);
	});

	it('tells the agent when to stop and which tool and script to use', () => {
		expect(text).toContain('get-pr-review-findings');
		expect(text).toContain('.claude/skills/pr-gate-check/scripts/pr-state.sh');
		expect(text).toMatch(/Stop and ask, do not guess/);
		expect(text).toMatch(/Any other value, or none, counts as High/);
		// Seen in real Qodo data on PR 35; leaving it out made closed findings count as open.
		expect(text).toMatch(/closed if `implemented`/);
		// Qodo on PR 42: an older Low finding still needs its list, and the list must be read.
		expect(text).toMatch(/Low, on any commit/);
		expect(text).toMatch(/find every Low finding's title in it/);
	});
});
