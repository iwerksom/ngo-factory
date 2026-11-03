import type { Submission } from './types';

export type SubmissionErrors = Partial<Record<keyof Submission, string>>;

const REQUIRED: Record<keyof Submission, string> = {
	ngo: 'Tell us who you are.',
	contact: 'Add a contact email.',
	region: 'Say where the project is.',
	title: 'Give the project a short title.',
	problem: 'Describe the problem in a few sentences.',
	beneficiaries: 'Say who benefits.',
	data: 'List the data you have or expect to use.'
};

export function parseSubmission(form: FormData): { value: Submission; errors: SubmissionErrors } {
	const value = {} as Submission;
	const errors: SubmissionErrors = {};

	for (const key of Object.keys(REQUIRED) as (keyof Submission)[]) {
		const raw = form.get(key);
		value[key] = typeof raw === 'string' ? raw.trim() : '';
		if (!value[key]) errors[key] = REQUIRED[key];
	}

	if (value.contact && !/^\S+@\S+\.\S+$/.test(value.contact)) {
		errors.contact = 'That does not look like an email address.';
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
