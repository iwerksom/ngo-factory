import type { Gate, Project } from '#lib/types.js';

/** Blended price per million tokens across input, output and cache. A deliberately rough planning number. */
export const USD_PER_MILLION_TOKENS = 8;
/** Monthly cost of hosting and keeping a delivered project running. */
export const SUPPORT_USD_PER_MONTH = 40;
export const CONTINGENCY = 0.15;

export function tokenCostUsd(tokens: number): number {
	return (tokens / 1_000_000) * USD_PER_MILLION_TOKENS;
}

/** High token cost + support reserve + contingency, rounded up to whole dollars. Volunteer hours are unpaid. */
export function fundingGoalUsd(project: Pick<Project, 'estimate' | 'supportMonths'>): number {
	const base =
		tokenCostUsd(project.estimate.tokensHigh) + project.supportMonths * SUPPORT_USD_PER_MONTH;
	return Math.ceil(base * (1 + CONTINGENCY));
}

export function fundingProgress(project: Project): number {
	return Math.min(1, project.raisedUsd / fundingGoalUsd(project));
}

export function currentGate(gates: Gate[]): Gate | undefined {
	return gates.find((gate) => gate.status === 'current');
}

export type Verdict = 'under' | 'within' | 'over';

/** Where an actual value landed against an estimate range. Both ends of the range are inside it. */
export function verdict(actual: number, low: number, high: number): Verdict {
	if (!Number.isFinite(actual) || actual < 0) {
		throw new RangeError(`Actual must be a number of zero or more, got ${actual}`);
	}
	if (actual < low) return 'under';
	if (actual > high) return 'over';
	return 'within';
}

/** Delivered means every gate has passed, including Delivered itself. */
export function isDelivered(project: Pick<Project, 'gates'>): boolean {
	return project.gates.length > 0 && project.gates.every((gate) => gate.status === 'passed');
}

export interface ComparisonRow {
	label: string;
	low: number;
	high: number;
	actual: number;
	verdict: Verdict;
}

export type EstimateComparison =
	{ kind: 'none' } | { kind: 'missing' } | { kind: 'recorded'; rows: ComparisonRow[] };

/**
 * Estimate next to actual for a delivered project. `none` before delivery, `missing` when it is
 * delivered but nobody recorded actuals: that is not the same as an actual of zero.
 */
export function compareEstimate(
	project: Pick<Project, 'gates' | 'estimate' | 'actual'>
): EstimateComparison {
	if (!isDelivered(project)) return { kind: 'none' };
	if (!project.actual) return { kind: 'missing' };

	const { estimate, actual } = project;
	return {
		kind: 'recorded',
		rows: [
			{
				label: 'Tokens',
				low: estimate.tokensLow,
				high: estimate.tokensHigh,
				actual: actual.tokens,
				verdict: verdict(actual.tokens, estimate.tokensLow, estimate.tokensHigh)
			},
			{
				label: 'Human hours',
				low: estimate.humanHoursLow,
				high: estimate.humanHoursHigh,
				actual: actual.humanHours,
				verdict: verdict(actual.humanHours, estimate.humanHoursLow, estimate.humanHoursHigh)
			}
		]
	};
}
