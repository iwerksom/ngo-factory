import { describe, expect, it } from 'vitest';
import {
	compareEstimate,
	currentGate,
	fundingGoalUsd,
	fundingProgress,
	isDelivered,
	tokenCostUsd,
	verdict
} from '#lib/estimate.js';
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

describe('verdict', () => {
	it('is under below the range, within it and over above it', () => {
		expect([verdict(9, 10, 20), verdict(15, 10, 20), verdict(21, 10, 20)]).toEqual([
			'under',
			'within',
			'over'
		]);
	});

	it('counts both ends of the range as within', () => {
		expect([verdict(10, 10, 20), verdict(20, 10, 20)]).toEqual(['within', 'within']);
	});

	it('judges a recorded zero as under, not as missing', () => {
		expect(verdict(0, 10, 20)).toBe('under');
	});

	it.each([-1, NaN, Infinity, -Infinity])('rejects %s', (actual) => {
		expect(() => verdict(actual, 10, 20)).toThrow(RangeError);
	});
});

describe('isDelivered', () => {
	it('needs every gate passed', () => {
		const passed = { status: 'passed' } as Gate;
		expect(isDelivered({ gates: [passed, passed] })).toBe(true);
		expect(isDelivered({ gates: [passed, { status: 'current' } as Gate] })).toBe(false);
		expect(isDelivered({ gates: [] })).toBe(false);
	});
});

describe('compareEstimate', () => {
	const delivered = [{ status: 'passed' }] as Gate[];
	const estimate = {
		tokensLow: 3_000_000,
		tokensHigh: 6_000_000,
		humanHoursLow: 30,
		humanHoursHigh: 50
	} as Project['estimate'];

	it('shows nothing before delivery, even if actuals are present', () => {
		const inProgress = [{ status: 'current' }] as Gate[];
		const actual = { tokens: 1, humanHours: 1 };
		expect(compareEstimate({ gates: inProgress, estimate, actual })).toEqual({ kind: 'none' });
	});

	it('says actuals are missing for a delivered project without them', () => {
		expect(compareEstimate({ gates: delivered, estimate })).toEqual({ kind: 'missing' });
	});

	it('compares tokens and hours against their ranges', () => {
		const result = compareEstimate({
			gates: delivered,
			estimate,
			actual: { tokens: 7_200_000, humanHours: 42 }
		});

		expect(result).toEqual({
			kind: 'recorded',
			rows: [
				{ label: 'Tokens', low: 3_000_000, high: 6_000_000, actual: 7_200_000, verdict: 'over' },
				{ label: 'Human hours', low: 30, high: 50, actual: 42, verdict: 'within' }
			]
		});
	});

	it('shows a recorded zero as zero, under the estimate', () => {
		const result = compareEstimate({
			gates: delivered,
			estimate,
			actual: { tokens: 0, humanHours: 0 }
		});

		expect(result.kind).toBe('recorded');
		if (result.kind === 'recorded') {
			expect(result.rows.map((row) => [row.actual, row.verdict])).toEqual([
				[0, 'under'],
				[0, 'under']
			]);
		}
	});

	it('refuses a negative actual instead of rendering it', () => {
		expect(() =>
			compareEstimate({ gates: delivered, estimate, actual: { tokens: -5, humanHours: 1 } })
		).toThrow(RangeError);
	});
});

describe('the seeded delivered example', () => {
	it('is delivered, has actuals and keeps funding progress within 0 to 1', async () => {
		const { getProject } = await import('#lib/data/projects.js');
		const seeded = getProject('seed-bank-inventory')!;

		expect(isDelivered(seeded)).toBe(true);
		expect(compareEstimate(seeded).kind).toBe('recorded');
		expect(fundingProgress(seeded)).toBeGreaterThanOrEqual(0);
		expect(fundingProgress(seeded)).toBeLessThanOrEqual(1);
	});
});
