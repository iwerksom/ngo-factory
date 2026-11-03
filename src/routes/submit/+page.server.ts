import { fail } from '@sveltejs/kit';
import { parseSubmission, toIssueBody } from '#lib/submission.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const { value, errors } = parseSubmission(await request.formData());

		if (Object.keys(errors).length > 0) {
			return fail(400, { value, errors });
		}

		// Simulated: the real build creates a GitHub issue from this body (see SPEC.md).
		return { value, errors: {}, issueTitle: value.title, issueBody: toIssueBody(value) };
	}
};
