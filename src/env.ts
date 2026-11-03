import { defineEnvVars } from '@sveltejs/kit/env';

/** Empty or unset means "not configured". */
const optional = (value: string | undefined) => value?.trim() || undefined;

export const variables = defineEnvVars({
	GITHUB_ISSUES_REPO: {
		schema: optional,
		description: 'owner/name of the repo that receives submissions as issues'
	},
	GITHUB_TOKEN: {
		schema: optional,
		description: 'Fine-grained token limited to that repo with Issues: write'
	}
});
