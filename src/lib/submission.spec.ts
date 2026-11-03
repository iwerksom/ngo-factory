import { describe, expect, it } from 'vitest';
import {
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

describe('toIssueBody', () => {
	it('includes the submission and an unticked gate checklist', () => {
		const body = toIssueBody(parseSubmission(form(valid)).value);
		expect(body).toContain('Green Valley Farmers (Kisumu, Kenya)');
		expect(body).toContain('- [x] Submitted');
		expect(body).toContain('- [ ] Vetted');
	});
});
