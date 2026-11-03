import type { Submission } from './types';

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

export function parseSubmission(form: FormData): { value: Submission; errors: SubmissionErrors } {
	const value = {} as Submission;
	const errors: SubmissionErrors = {};

	for (const key of Object.keys(REQUIRED) as (keyof Submission)[]) {
		const raw = form.get(key);
		value[key] = typeof raw === 'string' ? raw.trim() : '';
		if (!value[key]) errors[key] = REQUIRED[key];
		else if (value[key].length > MAX_LENGTH[key]) {
			errors[key] = `Keep this under ${MAX_LENGTH[key]} characters (it is ${value[key].length}).`;
		}
	}

	return { value, errors };
}

/** The body of the GitHub issue a submission becomes. */
export function toIssueBody(s: Submission): string {
	return [
		`## Organisation`,
		`${s.ngo} (${s.region})`,
		``,
		`## Problem`,
		s.problem,
		``,
		`## Who benefits`,
		s.beneficiaries,
		``,
		`## Data`,
		s.data,
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
