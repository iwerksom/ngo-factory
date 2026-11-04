import { projects } from '#lib/data/projects.js';
import { currentGate, fundingGoalUsd, fundingProgress, isDelivered } from '#lib/estimate.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	projects: projects.map((project) => ({
		slug: project.slug,
		title: project.title,
		ngo: project.ngo,
		region: project.region,
		summary: project.summary,
		gate: currentGate(project.gates)?.name ?? 'Delivered',
		delivered: isDelivered(project),
		goalUsd: fundingGoalUsd(project),
		raisedUsd: project.raisedUsd,
		progress: fundingProgress(project)
	}))
});
