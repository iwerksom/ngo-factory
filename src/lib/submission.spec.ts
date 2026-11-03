import { describe, expect, it } from 'vitest';
import { parseSubmission, toIssueBody } from './submission';

function form(fields: Record<string, string>): FormData {
	const data = new FormData();
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
}

const valid = {
	ngo: 'Green Valley Farmers',
	contact: 'hello@example.org',
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
		expect(Object.keys(errors)).toHaveLength(7);
	});

	it('rejects an invalid email', () => {
		const { errors } = parseSubmission(form({ ...valid, contact: 'not-an-email' }));
		expect(errors.contact).toMatch(/email/);
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
