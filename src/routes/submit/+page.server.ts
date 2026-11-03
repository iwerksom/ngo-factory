import { GITHUB_ISSUES_REPO, GITHUB_TOKEN } from '$app/env/private';
import { fail } from '@sveltejs/kit';
import { createIssue, resolveTarget } from '#lib/github.js';
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
		const target = resolveTarget(GITHUB_TOKEN, GITHUB_ISSUES_REPO);

		// Preview mode is for neither setting present. It files nothing.
		if (target.mode === 'preview') {
			return { errors: noErrors, issueTitle, issueBody };
		}

		if (target.mode === 'misconfigured') {
			console.error(`Submissions are misconfigured: ${target.problem}`);
			return fail(503, {
				value,
				errors: noErrors,
				message: 'Submissions are not available right now. Please try again later.'
			});
		}

		try {
			const issue = await createIssue(fetch, target.target, {
				title: `[Submission] ${issueTitle}`,
				body: issueBody,
				labels: ['submission']
			});
			return {
				errors: noErrors,
				issueTitle,
				issueBody,
				filed: true,
				issueUrl: issue.url ?? undefined
			};
		} catch (error) {
			console.error('Could not file submission', error);
			// The request may have reached GitHub, so do not tell the applicant to simply retry.
			return fail(502, {
				value,
				errors: noErrors,
				message:
					'We could not confirm that your project was filed. Check the GitHub issues before you submit it again.'
			});
		}
	}
};
