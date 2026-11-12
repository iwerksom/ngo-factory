import type { Submission } from '#lib/types.js';

export type SubmissionErrors = Partial<Record<keyof Submission, string>>;

const REQUIRED: Record<keyof Submission, string> = {
	ngo: 'Tell us who you are.',
	region: 'Say where the project is.',
	title: 'Give the project a short title.',
	problem: 'Describe the problem in a few sentences.',
	beneficiaries: 'Say who benefits.',
	data: 'List the data you have or expect to use.'
};

/** Per-field limits. The longest possible issue body stays far below GitHub's 65,536 characters. */
export const MAX_LENGTH: Record<keyof Submission, number> = {
	ngo: 120,
	region: 120,
	title: 120,
	problem: 2000,
	beneficiaries: 2000,
	data: 2000
};

/** A form field people never see. Browsers leave it empty; many bots fill in every input they find. */
export const HONEYPOT_FIELD = 'website';

export function looksAutomated(form: FormData): boolean {
	const trap = form.get(HONEYPOT_FIELD);
	return typeof trap === 'string' && trap.trim() !== '';
}

/** Fields that are one line in the form. A crafted request can still put line breaks in them. */
const SINGLE_LINE = new Set<keyof Submission>(['ngo', 'region', 'title']);

export function parseSubmission(form: FormData): { value: Submission; errors: SubmissionErrors } {
	const value = {} as Submission;
	const errors: SubmissionErrors = {};

	for (const key of Object.keys(REQUIRED) as (keyof Submission)[]) {
		const raw = form.get(key);
		value[key] = typeof raw === 'string' ? raw.trim() : '';
		if (SINGLE_LINE.has(key)) value[key] = value[key].replace(/\s+/g, ' ');
		if (!value[key]) errors[key] = REQUIRED[key];
		else if (value[key].length > MAX_LENGTH[key]) {
			errors[key] = `Keep this under ${MAX_LENGTH[key]} characters (it is ${value[key].length}).`;
		}
	}

	return { value, errors };
}

const ZERO_WIDTH_SPACE = '\u200b';

/**
 * Makes text a stranger typed show up as plain text in a public GitHub issue: no mentions, issue
 * links, task-list boxes, headings, lists, links, images, tables or code. Bare URLs still link.
 * The escapes are invisible once GitHub renders the issue.
 */
export function escapeMarkdown(text: string): string {
	return (
		text
			.replace(/\r\n?/g, '\n')
			// Leading indentation means nothing in plain text, and four spaces would start a code block.
			.replace(/^[ \t]+/gm, '')
			// Characters that start inline Markdown: emphasis, code, links, images, HTML, tables.
			.replace(/[\\`*_[\]<>|~]/g, '\\$&')
			// Block starts at the beginning of a line: headings, quotes, bullets, rules.
			.replace(/^([#>+\-=])/gm, '\\$1')
			// Numbered lists.
			.replace(/^(\d+)([.)])/gm, '$1\\$2')
			// A zero-width space after the trigger stops GitHub from linking or notifying.
			.replace(/@/g, `@${ZERO_WIDTH_SPACE}`)
			.replace(/#(?=\d)/g, `#${ZERO_WIDTH_SPACE}`)
			.replace(/\bGH-(?=\d)/gi, (match) => `${match}${ZERO_WIDTH_SPACE}`)
	);
}

/** The body of the GitHub issue a submission becomes. */
export function toIssueBody(s: Submission): string {
	return [
		`## Organisation`,
		`${escapeMarkdown(s.ngo)} (${escapeMarkdown(s.region)})`,
		``,
		`## Problem`,
		escapeMarkdown(s.problem),
		``,
		`## Who benefits`,
		escapeMarkdown(s.beneficiaries),
		``,
		`## Data`,
		escapeMarkdown(s.data),
		``,
		`## Gates`,
		`- [x] Submitted`,
		`- [ ] Vetted`,
		`- [ ] Refined`,
		`- [ ] Estimated`,
		`- [ ] Safety review`,
		`- [ ] Support plan`,
		`- [ ] Funded`,
		`- [ ] Building`,
		`- [ ] Delivered`
	].join('\n');
}
