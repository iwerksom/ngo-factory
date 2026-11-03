import { GITHUB_ISSUES_REPO, GITHUB_TOKEN } from '$app/env/private';
import { fail } from '@sveltejs/kit';
import { createIssue, resolveTarget } from '#lib/github.js';
import { createRateLimiter } from '#lib/rate-limit.js';
import {
	looksAutomated,
	parseSubmission,
	toIssueBody,
	type SubmissionErrors
} from '#lib/submission.js';
import type { Actions } from './$types';

const noErrors: SubmissionErrors = {};

// Limits only apply when the form really files issues. Per server instance, in memory.
const HOUR = 60 * 60 * 1000;
const perVisitor = createRateLimiter({ max: 3, windowMs: HOUR });
const overall = createRateLimiter({ max: 30, windowMs: HOUR });

export const actions: Actions = {
	default: async ({ request, fetch, getClientAddress }) => {
		const form = await request.formData();
		const { value, errors } = parseSubmission(form);
		const issueTitle = value.title;
		const issueBody = toIssueBody(value);

		// A filled-in trap field means a bot. Answer as if it worked and file nothing.
		if (looksAutomated(form)) {
			return { errors: noErrors, issueTitle, issueBody, filed: true };
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, { value, errors });
		}

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

		// Behind a proxy this is the proxy's address unless the adapter is told which header to trust.
		let visitor = 'unknown';
		try {
			visitor = getClientAddress();
		} catch {
			// Keep the shared 'unknown' bucket: unidentifiable visitors share one small allowance.
		}

		if (!overall.allow('all') || !perVisitor.allow(visitor)) {
			return fail(429, {
				value,
				errors: noErrors,
				message: 'Too many submissions just now. Please try again in an hour.'
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
