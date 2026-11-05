import { GITHUB_ISSUES_REPO, GITHUB_TOKEN } from '$app/env/private';
import { error } from '@sveltejs/kit';
import { getProject } from '#lib/data/projects.js';
import { loadTimeline } from '#lib/gates.js';
import { compareEstimate, fundingGoalUsd, fundingProgress, tokenCostUsd } from '#lib/estimate.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const project = getProject(params.slug);
	if (!project) error(404, 'Project not found');

	const timeline = await loadTimeline(fetch, project, GITHUB_ISSUES_REPO, GITHUB_TOKEN);

	return {
		project,
		// Delivered follows the timeline shown on the page, live or simulated.
		comparison: compareEstimate({ ...project, gates: timeline.gates }),
		timeline,
		goalUsd: fundingGoalUsd(project),
		progress: fundingProgress(project),
		tokenCostLowUsd: Math.round(tokenCostUsd(project.estimate.tokensLow)),
		tokenCostHighUsd: Math.round(tokenCostUsd(project.estimate.tokensHigh))
	};
};
