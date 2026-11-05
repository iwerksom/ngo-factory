import { gatesAt } from '#lib/gates.js';
import type { Project } from '#lib/types.js';

// Simulated data for the hackathon build. Replace with GitHub issues and labels (see SPEC.md).

export const projects: Project[] = [
	{
		slug: 'crop-weather-mitigation',
		title: 'Crop weather mitigation',
		ngo: 'Green Valley Farmers Cooperative',
		region: 'Kisumu, Kenya',
		summary: 'Turn a local forecast into crop-specific actions for frost, drought and heavy rain.',
		problem:
			'Smallholder farmers lose harvests to sudden weather spells. Forecasts exist, but they say nothing about what to do for maize, beans or tomatoes at a given growth stage. The cooperative wants short, local-language SMS advice, with a person in the loop for anything high-stakes.',
		estimate: {
			tokensLow: 6_000_000,
			tokensHigh: 14_000_000,
			humanHoursLow: 60,
			humanHoursHigh: 110,
			confidence: 'medium',
			approach:
				'Forecast API plus a reviewed rule base per crop and growth stage; an LLM drafts the SMS text from the rules, never invents actions. Agronomist reviews the rule base.'
		},
		raisedUsd: 0,
		supportMonths: 12,
		gates: gatesAt('safety', {
			submitted: { label: 'Issue #1', url: '#' },
			refined: { label: 'spec.md', url: '#' },
			estimated: { label: 'estimate.md', url: '#' }
		})
	},
	{
		slug: 'river-flood-sms-alerts',
		title: 'River flood SMS alerts',
		ngo: 'Mekong Riverside Community Network',
		region: 'Can Tho, Vietnam',
		summary: 'Turn upstream gauge readings into early flood alerts for riverside villages.',
		problem:
			'Villages learn about floods when the water arrives. Upstream gauge data is public, but nobody turns it into a warning that arrives in time to move livestock and equipment.',
		estimate: {
			tokensLow: 4_000_000,
			tokensHigh: 9_000_000,
			humanHoursLow: 40,
			humanHoursHigh: 80,
			confidence: 'high',
			approach:
				'Poll public gauge data, compare against thresholds set with local officials, send SMS through a provider. The model only helps write and translate the messages.'
		},
		raisedUsd: 635,
		supportMonths: 12,
		gates: gatesAt('building', {
			submitted: { label: 'Issue #2', url: '#' },
			refined: { label: 'spec.md', url: '#' },
			estimated: { label: 'estimate.md', url: '#' },
			building: { label: 'PR #14: threshold engine', url: '#' }
		})
	}
];

export function getProject(slug: string): Project | undefined {
	return projects.find((project) => project.slug === slug);
}
