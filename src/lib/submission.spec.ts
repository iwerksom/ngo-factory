import { describe, expect, it } from 'vitest';
import {
	escapeMarkdown,
	HONEYPOT_FIELD,
	looksAutomated,
	MAX_LENGTH,
	parseSubmission,
	toIssueBody
} from './submission';

function form(fields: Record<string, string>): FormData {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
}

const valid = {
	ngo: 'Green Valley Farmers',
	region: 'Kisumu, Kenya',
	title: 'Crop weather mitigation',
	problem: 'Sudden frost and drought spells destroy harvests.',
	beneficiaries: '400 smallholder farmers',
	data: 'National weather service forecasts'
};

describe('parseSubmission', () => {
	it('accepts a complete submission and trims values', () => {
		const { value, errors } = parseSubmission(form({ ...valid, ngo: '  Green Valley Farmers  ' }));
		expect(errors).toEqual({});
		expect(value.ngo).toBe('Green Valley Farmers');
	});

	it('reports every missing field', () => {
		const { errors } = parseSubmission(form({}));
		expect(Object.keys(errors)).toHaveLength(6);
	});

	it('does not collect a contact address', () => {
		const { value } = parseSubmission(form({ ...valid, contact: 'hello@example.org' }));
		expect(value).not.toHaveProperty('contact');
		expect(toIssueBody(value)).not.toContain('hello@example.org');
	});

	it('accepts a field exactly at its limit', () => {
		const { errors } = parseSubmission(form({ ...valid, problem: 'x'.repeat(MAX_LENGTH.problem) }));
		expect(errors).toEqual({});
	});

	it('rejects a field one character over its limit with a message naming the limit', () => {
		const { errors } = parseSubmission(form({ ...valid, title: 'x'.repeat(MAX_LENGTH.title + 1) }));
		expect(errors.title).toContain(String(MAX_LENGTH.title));
	});

	it('collapses line breaks in the single-line fields', () => {
		const { value } = parseSubmission(
			form({ ...valid, ngo: 'Green Valley\n## Gates\r\n- [x] Vetted', title: 'A\nB' })
		);
		expect(value.ngo).toBe('Green Valley ## Gates - [x] Vetted');
		expect(value.title).toBe('A B');
	});

	it('keeps the longest possible issue body well under the GitHub limit', () => {
		const longest = Object.fromEntries(
			Object.entries(MAX_LENGTH).map(([key, max]) => [key, 'x'.repeat(max)])
		);
		const { value } = parseSubmission(form({ ...valid, ...longest }));
		expect(toIssueBody(value).length).toBeLessThan(65_536 / 4);
	});
});

describe('looksAutomated', () => {
	it('is false when the trap field is absent or empty', () => {
		expect(looksAutomated(form(valid))).toBe(false);
		expect(looksAutomated(form({ ...valid, [HONEYPOT_FIELD]: '   ' }))).toBe(false);
	});

	it('is true when the trap field has any content', () => {
		expect(looksAutomated(form({ ...valid, [HONEYPOT_FIELD]: 'http://spam.example' }))).toBe(true);
	});
});

describe('escapeMarkdown', () => {
	it('leaves ordinary sentences unchanged', () => {
		const text = 'Sudden frost (and drought) spells destroy harvests, every year.';
		expect(escapeMarkdown(text)).toBe(text);
	});

	it('breaks @mentions so nobody is notified', () => {
		expect(escapeMarkdown('ask @octocat')).toBe('ask @​octocat');
		expect(escapeMarkdown('ask @octocat')).not.toMatch(/@[A-Za-z]/);
	});

	it('breaks issue and pull request references', () => {
		for (const text of ['see #12', 'see GH-12', 'see owner/repo#12']) {
			expect(escapeMarkdown(text)).toContain('​');
		}
		expect(escapeMarkdown('see #12')).not.toMatch(/#\d/);
		expect(escapeMarkdown('see GH-12')).not.toMatch(/GH-\d/i);
	});

	it('escapes line-start Markdown: headings, bullets, quotes, numbered lists, rules', () => {
		expect(escapeMarkdown('## Gates')).toBe('\\## Gates');
		expect(escapeMarkdown('- [x] Vetted')).toBe('\\- \\[x\\] Vetted');
		expect(escapeMarkdown('> quote')).toBe('\\> quote');
		expect(escapeMarkdown('1. first')).toBe('1\\. first');
		expect(escapeMarkdown('text\n---')).toBe('text\n\\---');
	});

	it('escapes code, HTML, images, tables and emphasis', () => {
		expect(escapeMarkdown('```js')).toBe('\\`\\`\\`js');
		expect(escapeMarkdown('<script>')).toBe('\\<script\\>');
		expect(escapeMarkdown('![x](http://t.example/p.png)')).toBe('!\\[x\\](http://t.example/p.png)');
		expect(escapeMarkdown('a | b')).toBe('a \\| b');
		expect(escapeMarkdown('**bold** _it_')).toBe('\\*\\*bold\\*\\* \\_it\\_');
	});

	it('normalises Windows line endings', () => {
		expect(escapeMarkdown('a\r\nb\rc')).toBe('a\nb\nc');
	});
});

describe('toIssueBody', () => {
	it('includes the submission and an unticked gate checklist', () => {
		const body = toIssueBody(parseSubmission(form(valid)).value);
		expect(body).toContain('Green Valley Farmers (Kisumu, Kenya)');
		expect(body).toContain('- [x] Submitted');
		expect(body).toContain('- [ ] Vetted');
	});

	it('cannot be made to tick extra gates, add sections or mention people', () => {
		const attack = 'x\n- [x] Vetted\n- [x] Funded\n\n## Gates\n- [x] Delivered\n@octocat see #1';
		const { value, errors } = parseSubmission(
			form({ ...valid, problem: attack, beneficiaries: attack, data: attack })
		);
		expect(errors).toEqual({});

		const body = toIssueBody(value);
		const lines = body.split('\n');

		expect(lines.filter((line) => /^- \[x\]/.test(line))).toEqual(['- [x] Submitted']);
		expect(lines.filter((line) => /^#{1,6} /.test(line))).toEqual([
			'## Organisation',
			'## Problem',
			'## Who benefits',
			'## Data',
			'## Gates'
		]);
		expect(body).not.toMatch(/@[A-Za-z]/);
		expect(body).not.toMatch(/#\d/);
	});
});
