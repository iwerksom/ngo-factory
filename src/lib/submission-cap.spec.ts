import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from '#lib/rate-limit.js';
import { createSubmissionCap } from '#lib/submission-cap.js';

const HOUR = 60 * 60 * 1000;

function setup(options: { perVisitor?: number; overall?: number; max?: number } = {}) {
	const perVisitor = createRateLimiter({ max: options.perVisitor ?? 3, windowMs: HOUR });
	const overall = createRateLimiter({ max: options.overall ?? 30, windowMs: HOUR });
	const cap = createSubmissionCap({ perVisitor, overall, max: options.max ?? 30 });
	return { cap, perVisitor, overall };
}

const counting = (n: number | null) => vi.fn(async () => n);

describe('createSubmissionCap', () => {
	it('admits while GitHub reports fewer than the cap, and refuses at the cap', async () => {
		expect(await setup().cap.admit('a', counting(29))).toBe(true);
		expect(await setup().cap.admit('a', counting(30))).toBe(false);
		expect(await setup().cap.admit('a', counting(31))).toBe(false);
	});

	it('does not call GitHub for a visitor who is already over their limit', async () => {
		const { cap } = setup({ perVisitor: 1 });
		expect(await cap.admit('a', counting(0))).toBe(true);
		cap.release();

		const countRecent = counting(0);
		for (let i = 0; i < 5; i++) expect(await cap.admit('a', countRecent)).toBe(false);
		expect(countRecent).not.toHaveBeenCalled();
	});

	it('does not call GitHub once the in-memory overall cap is used up', async () => {
		const { cap } = setup({ overall: 1 });
		expect(await cap.admit('a', counting(0))).toBe(true);
		cap.release();

		const countRecent = counting(0);
		expect(await cap.admit('b', countRecent)).toBe(false);
		expect(countRecent).not.toHaveBeenCalled();
	});

	it('does not use up anyone allowance when GitHub refuses', async () => {
		const { cap, perVisitor, overall } = setup({ perVisitor: 1, overall: 1 });

		expect(await cap.admit('a', counting(30))).toBe(false);

		expect(perVisitor.peek('a')).toBe(true);
		expect(overall.peek('all')).toBe(true);
	});

	it('falls back to the in-memory limits when the count cannot be read', async () => {
		const { cap } = setup({ perVisitor: 1 });

		expect(await cap.admit('a', counting(null))).toBe(true);
		cap.release();
		expect(await cap.admit('a', counting(null))).toBe(false);
	});

	it('lets only one of two overlapping submissions through when GitHub reports 29', async () => {
		const { cap } = setup();
		// Both ask GitHub before either has filed, so both read 29.
		const [first, second] = await Promise.all([
			cap.admit('a', async () => 29),
			cap.admit('b', async () => 29)
		]);

		expect([first, second]).toEqual([true, false]);
	});

	it('counts a submission as in flight until it is released', async () => {
		const { cap } = setup();

		expect(await cap.admit('a', counting(29))).toBe(true);
		expect(await cap.admit('b', counting(29))).toBe(false);
		cap.release();
		// Once filed it shows up in GitHub's count, so a fresh count of 29 means 29 again.
		expect(await cap.admit('b', counting(29))).toBe(true);
	});

	it('never lets release take the in-flight count below zero', async () => {
		const { cap } = setup();
		cap.release();
		cap.release();

		expect(await cap.admit('a', counting(29))).toBe(true);
		expect(await cap.admit('b', counting(29))).toBe(false);
	});

	it('lets one visitor sending many requests at once use up only their own allowance', async () => {
		const { cap, overall } = setup({ perVisitor: 3, overall: 30 });

		// All 30 pass the first look, then wait for GitHub together.
		const results = await Promise.all(
			Array.from({ length: 30 }, () => cap.admit('a', async () => 0))
		);

		expect(results.filter(Boolean)).toHaveLength(3);
		// 3 admitted, so 27 of the 30 overall slots are still there for other visitors.
		for (let i = 0; i < 27; i++) expect(overall.allow('all')).toBe(true);
		expect(overall.allow('all')).toBe(false);
		expect(await setup().cap.admit('b', async () => 0)).toBe(true);
	});
});
