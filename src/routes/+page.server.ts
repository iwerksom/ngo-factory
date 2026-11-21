import { GITHUB_ISSUES_REPO, GITHUB_TOKEN } from '$app/env/private';
import { projects } from '#lib/data/projects.js';
import {
	currentGate,
	deliveredNote,
	fundingGoalUsd,
	fundingProgress,
	hasComparison,
	isDelivered
} from '#lib/estimate.js';
import { loadTimeline } from '#lib/gates.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => ({
	// Same timeline as the project page, so a card never disagrees with the page it links to.
	projects: await Promise.all(
		projects.map(async (project) => {
			const timeline = await loadTimeline(fetch, project, GITHUB_ISSUES_REPO, GITHUB_TOKEN);
			return {
				slug: project.slug,
				title: project.title,
				ngo: project.ngo,
				region: project.region,
				summary: project.summary,
				gate: currentGate(timeline.gates)?.name ?? 'Delivered',
				// What the card says about delivery, from the same timeline the project page uses: it
				// points to a comparison only when that page has one.
				deliveredNote: deliveredNote({
					delivered: isDelivered(timeline),
					hasComparison: hasComparison({ ...project, gates: timeline.gates })
				}),
				goalUsd: fundingGoalUsd(project),
				raisedUsd: project.raisedUsd,
				progress: fundingProgress(project)
			};
		})
	)
});
