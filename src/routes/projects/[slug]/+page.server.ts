import { error } from '@sveltejs/kit';
import { getProject } from '#lib/data/projects.js';
import { fundingGoalUsd, fundingProgress, tokenCostUsd } from '#lib/estimate.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const project = getProject(params.slug);
	if (!project) error(404, 'Project not found');

	return {
		project,
		goalUsd: fundingGoalUsd(project),
		progress: fundingProgress(project),
		tokenCostLowUsd: Math.round(tokenCostUsd(project.estimate.tokensLow)),
		tokenCostHighUsd: Math.round(tokenCostUsd(project.estimate.tokensHigh))
	};
};
