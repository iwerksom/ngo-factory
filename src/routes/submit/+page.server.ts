import { GITHUB_ISSUES_REPO, GITHUB_TOKEN } from '$app/env/private';
import { fail } from '@sveltejs/kit';
import { createIssue } from '#lib/github.js';
import { parseSubmission, toIssueBody, type SubmissionErrors } from '#lib/submission.js';
import type { Actions } from './$types';

const noErrors: SubmissionErrors = {};

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const { value, errors } = parseSubmission(await request.formData());

		if (Object.keys(errors).length > 0) {
			return fail(400, { value, errors });
		}

		const issueTitle = value.title;
		const issueBody = toIssueBody(value);

		// Without a token and a target repo the form runs in preview mode and files nothing.
		if (!GITHUB_TOKEN || !GITHUB_ISSUES_REPO) {
			return { errors: noErrors, issueTitle, issueBody };
		}

		try {
			const issue = await createIssue(
				fetch,
				{ repo: GITHUB_ISSUES_REPO, token: GITHUB_TOKEN },
				{ title: `[Submission] ${issueTitle}`, body: issueBody, labels: ['submission'] }
			);
			return { errors: noErrors, issueTitle, issueBody, issueUrl: issue.url };
		} catch (error) {
			console.error('Could not file submission', error);
			return fail(502, {
				value,
				errors: noErrors,
				message: 'We could not file your project just now. Please try again later.'
			});
		}
	}
};
