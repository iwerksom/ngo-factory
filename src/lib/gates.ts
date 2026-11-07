import { getIssueLabels } from '#lib/github.js';
import type { Decider, Gate, Project } from '#lib/types.js';

export const GATE_TEMPLATE: {
	id: string;
	name: string;
	description: string;
	decidedBy: Decider;
}[] = [
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
export function gatesAt(current: string, evidence: Record<string, Gate['evidence']> = {}): Gate[] {
	const index = GATE_TEMPLATE.findIndex((gate) => gate.id === current);
	return GATE_TEMPLATE.map((gate, i) => ({
		...gate,
		status: i < index ? 'passed' : i === index ? 'current' : 'pending',
		evidence: evidence[gate.id]
	}));
}

const LABEL_PREFIX = 'gate:';

/**
 * Reads the gate timeline from an issue's labels. `gate:<id>` marks the gate in progress; the
 * gates before it are passed. Submitted is always passed (the issue exists) and cannot be set by a
 * label. Unknown labels are ignored. If labels disagree, the earliest gate wins so progress is
 * never overstated, and `conflict` says so. No gate label means Vetted is next.
 */
export function gatesFromLabels(labels: string[]): { gates: Gate[]; conflict: boolean } {
	const marked = new Set<number>();
	for (const label of labels) {
		const name = label.trim().toLowerCase();
		if (!name.startsWith(LABEL_PREFIX)) continue;
		const index = GATE_TEMPLATE.findIndex((gate) => gate.id === name.slice(LABEL_PREFIX.length));
		if (index > 0) marked.add(index);
	}

	const index = marked.size > 0 ? Math.min(...marked) : 1;
	const delivered = index === GATE_TEMPLATE.length - 1;
	const gates: Gate[] = GATE_TEMPLATE.map((gate, i) => ({
		...gate,
		status: delivered || i < index ? 'passed' : i === index ? 'current' : 'pending'
	}));

	return { gates, conflict: marked.size > 1 };
}

export interface Timeline {
	gates: Gate[];
	source: 'github' | 'simulated';
	/** Gate labels on the issue disagreed; the earliest one was used. */
	conflict: boolean;
	/** Why live data is not shown, when it was wanted. */
	note?: string;
}

const LABEL_CACHE_MS = 60_000;
const labelCache = new Map<string, { labels: string[]; readAt: number }>();

const inFlight = new Map<string, Promise<string[]>>();

/** Forgets cached label reads. For tests. */
export function clearLabelCache(): void {
	labelCache.clear();
	inFlight.clear();
}

/**
 * Labels cached for 60 seconds per repo and issue, in the memory of this instance only. Overlapping
 * calls for one issue share a single read. A failed read throws before anything is stored, so the
 * next call tries GitHub again.
 */
async function cachedIssueLabels(
	fetchFn: typeof fetch,
	repo: string,
	token: string | undefined,
	issueNumber: number,
	now: number
): Promise<string[]> {
	const key = `${repo}#${issueNumber}`;
	const hit = labelCache.get(key);
	// A negative age means the clock moved backward: treat it as stale.
	if (hit && now - hit.readAt >= 0 && now - hit.readAt < LABEL_CACHE_MS) return hit.labels;
	const pending = inFlight.get(key);
	if (pending) return pending;
	const read = getIssueLabels(fetchFn, { repo, token }, issueNumber)
		.then((labels) => {
			labelCache.set(key, { labels, readAt: now });
			return labels;
		})
		.finally(() => inFlight.delete(key));
	inFlight.set(key, read);
	return read;
}

/**
 * The live timeline for a project that has an issue, or its seeded one. A GitHub failure falls
 * back to the seeded timeline: the page must not break because GitHub is slow or down.
 */
export async function loadTimeline(
	fetchFn: typeof fetch,
	project: Pick<Project, 'gates' | 'issueNumber'>,
	repo: string | undefined,
	token: string | undefined,
	now: number = Date.now()
): Promise<Timeline> {
	const simulated: Timeline = { gates: project.gates, source: 'simulated', conflict: false };
	if (project.issueNumber === undefined || !repo) return simulated;

	try {
		const labels = await cachedIssueLabels(fetchFn, repo, token, project.issueNumber, now);
		const { gates, conflict } = gatesFromLabels(labels);
		// Keep real links the seed already has. The seed's '#' links are placeholders.
		for (const gate of gates) {
			const known = project.gates.find((seeded) => seeded.id === gate.id)?.evidence;
			if (known?.url.startsWith('https://')) gate.evidence = known;
		}
		gates[0].evidence = {
			label: `Issue #${project.issueNumber}`,
			url: `https://github.com/${repo}/issues/${project.issueNumber}`
		};
		return { gates, source: 'github', conflict };
	} catch (error) {
		console.error('Could not read gate labels', error);
		return { ...simulated, note: 'Live status could not be read from GitHub right now.' };
	}
}
