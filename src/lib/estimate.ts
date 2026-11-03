import type { Gate, Project } from './types';

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
