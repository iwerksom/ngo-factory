import type { Decider, Gate, Project } from '#lib/types.js';

// Simulated data for the hackathon build. Replace with GitHub issues and labels (see SPEC.md).

const GATE_TEMPLATE: { id: string; name: string; description: string; decidedBy: Decider }[] = [
	{
		id: 'submitted',
		name: 'Submitted',
		description: 'The NGO described the problem.',
		decidedBy: 'human'
	},
	{
		id: 'vetted',
		name: 'Vetted',
		description: 'A maintainer confirmed the NGO is real and local.',
		decidedBy: 'human'
	},
	{
		id: 'refined',
		name: 'Refined',
		description: 'spec.md: problem, users, data, success measure, scope.',
		decidedBy: 'ai+human'
	},
	{
		id: 'estimated',
		name: 'Estimated',
		description: 'estimate.md: token and hour ranges, confidence, approach.',
		decidedBy: 'ai+human'
	},
	{
		id: 'safety',
		name: 'Safety review',
		description: 'A domain expert and the NGO sign off on risks and the disclaimer.',
		decidedBy: 'human'
	},
	{
		id: 'support',
		name: 'Support plan',
		description: 'Who runs it for the first 12 months, and the reserve to pay for it.',
		decidedBy: 'human'
	},
	{ id: 'funded', name: 'Funded', description: 'Funding goal reached.', decidedBy: 'platform' },
	{
		id: 'building',
		name: 'Building',
		description: 'Work in the project repo; PRs pass CI and Qodo review.',
		decidedBy: 'ai+human'
	},
	{
		id: 'delivered',
		name: 'Delivered',
		description: 'The NGO accepts the result; the repo is released.',
		decidedBy: 'human'
	}
];

/** Gates before `current` are passed, `current` is in progress, the rest are pending. */
function gatesAt(current: string, evidence: Record<string, Gate['evidence']> = {}): Gate[] {
	const index = GATE_TEMPLATE.findIndex((gate) => gate.id === current);
	return GATE_TEMPLATE.map((gate, i) => ({
		...gate,
		status: i < index ? 'passed' : i === index ? 'current' : 'pending',
		evidence: evidence[gate.id]
	}));
}

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
