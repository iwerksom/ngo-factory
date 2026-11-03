import { describe, expect, it } from 'vitest';
import { currentGate, fundingGoalUsd, fundingProgress, tokenCostUsd } from './estimate';
import type { Gate, Project } from './types';

const project = {
	estimate: { tokensHigh: 10_000_000 },
	supportMonths: 12,
	raisedUsd: 100
} as Project;

describe('tokenCostUsd', () => {
	it('prices one million tokens at the blended rate', () => {
		expect(tokenCostUsd(1_000_000)).toBe(8);
	});
});

describe('fundingGoalUsd', () => {
	it('adds token cost and support reserve, then 15% contingency', () => {
		// (10M tokens = 80) + (12 months * 40 = 480) = 560, * 1.15 = 644
		expect(fundingGoalUsd(project)).toBe(644);
	});
});

describe('fundingProgress', () => {
	it('is the share of the goal raised', () => {
		expect(fundingProgress(project)).toBeCloseTo(100 / 644);
	});

	it('never exceeds 1', () => {
		expect(fundingProgress({ ...project, raisedUsd: 10_000 })).toBe(1);
	});
});

describe('currentGate', () => {
	it('returns the gate in progress', () => {
		const gates = [
			{ id: 'a', status: 'passed' },
			{ id: 'b', status: 'current' },
			{ id: 'c', status: 'pending' }
		] as Gate[];
		expect(currentGate(gates)?.id).toBe('b');
	});

	it('returns undefined when nothing is in progress', () => {
		expect(currentGate([{ id: 'a', status: 'passed' }] as Gate[])).toBeUndefined();
	});
});
