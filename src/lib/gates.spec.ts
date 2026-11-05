import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	GATE_TEMPLATE,
	clearLabelCache,
	gatesAt,
	gatesFromLabels,
	loadTimeline
} from '#lib/gates.js';

const statuses = (labels: string[]) => gatesFromLabels(labels).gates.map((gate) => gate.status);

describe('gatesFromLabels', () => {
	it('puts Vetted next when no gate label is set', () => {
		expect(statuses(['submission'])).toEqual([
			'passed',
			'current',
			'pending',
			'pending',
			'pending',
			'pending',
			'pending',
			'pending',
			'pending'
		]);
	});

	it('marks the labelled gate current, earlier ones passed and later ones pending', () => {
		expect(statuses(['gate:estimated'])).toEqual([
			'passed',
			'passed',
			'passed',
			'current',
			'pending',
			'pending',
			'pending',
			'pending',
			'pending'
		]);
	});

	it('passes every gate once the project is delivered', () => {
		expect(new Set(statuses(['gate:delivered']))).toEqual(new Set(['passed']));
	});

	it('uses the earliest gate and reports a conflict when labels disagree', () => {
		const result = gatesFromLabels(['gate:building', 'gate:refined']);
		expect(result.conflict).toBe(true);
		expect(result.gates.find((gate) => gate.status === 'current')?.id).toBe('refined');
	});

	it('does not call the same label twice a conflict', () => {
		expect(gatesFromLabels(['gate:vetted', 'GATE:Vetted']).conflict).toBe(false);
	});

	it('ignores unknown gate labels and labels without the prefix', () => {
		const result = gatesFromLabels(['gate:foo', 'safety', 'gate:']);
		expect(result.conflict).toBe(false);
		expect(result.gates.find((gate) => gate.status === 'current')?.id).toBe('vetted');
	});

	it('does not let a label reset Submitted', () => {
		const result = gatesFromLabels(['gate:submitted']);
		expect(result.gates[0].status).toBe('passed');
		expect(result.gates[1].status).toBe('current');
	});

	it('keeps the nine gates of the template in order', () => {
		expect(gatesFromLabels([]).gates.map((gate) => gate.id)).toEqual(
			GATE_TEMPLATE.map((g) => g.id)
		);
	});
});

describe('loadTimeline', () => {
	const seeded = gatesAt('safety');
	beforeEach(clearLabelCache);
	const reply = (status: number, json: unknown) =>
		vi.fn(async () => new Response(JSON.stringify(json), { status })) as unknown as typeof fetch;

	it('keeps the seeded gates, without a GitHub call, when the project has no issue', async () => {
		const fetchFn = reply(200, {});
		const timeline = await loadTimeline(fetchFn, { gates: seeded }, 'o/r', undefined);
		expect(timeline).toEqual({ gates: seeded, source: 'simulated', conflict: false });
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('keeps the seeded gates when no repo is configured', async () => {
		const fetchFn = reply(200, {});
		const timeline = await loadTimeline(
			fetchFn,
			{ gates: seeded, issueNumber: 4 },
			undefined,
			undefined
		);
		expect(timeline.source).toBe('simulated');
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('builds the timeline from the issue labels and links the issue as evidence', async () => {
		const fetchFn = reply(200, { labels: [{ name: 'gate:refined' }] });
		const timeline = await loadTimeline(
			fetchFn,
			{ gates: seeded, issueNumber: 4 },
			'o/r',
			undefined
		);
		expect(timeline.source).toBe('github');
		expect(timeline.gates.find((gate) => gate.status === 'current')?.id).toBe('refined');
		expect(timeline.gates[0].evidence).toEqual({
			label: 'Issue #4',
			url: 'https://github.com/o/r/issues/4'
		});
	});

	it.each([
		['a non-200 reply', () => reply(503, {})],
		[
			'an unreadable reply',
			() => vi.fn(async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch
		],
		['a reply without labels', () => reply(200, { number: 4 })],
		[
			'a network error',
			() => vi.fn(async () => Promise.reject(new Error('offline'))) as unknown as typeof fetch
		]
	])('falls back to the seeded gates on %s', async (_name, makeFetch) => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const timeline = await loadTimeline(
			makeFetch(),
			{ gates: seeded, issueNumber: 4 },
			'o/r',
			undefined
		);
		expect(timeline.gates).toBe(seeded);
		expect(timeline.source).toBe('simulated');
		expect(timeline.note).toMatch(/could not be read/);
	});

	it('keeps real evidence links from the seed, but not its placeholder links', async () => {
		const withEvidence = gatesAt('safety', {
			submitted: { label: 'Issue #1', url: '#' },
			refined: { label: 'spec.md', url: 'https://example.org/spec.md' },
			estimated: { label: 'estimate.md', url: '#' }
		});
		const fetchFn = reply(200, { labels: [{ name: 'gate:estimated' }] });

		const { gates } = await loadTimeline(
			fetchFn,
			{ gates: withEvidence, issueNumber: 4 },
			'o/r',
			undefined
		);

		expect(gates.find((gate) => gate.id === 'refined')?.evidence?.url).toBe(
			'https://example.org/spec.md'
		);
		expect(gates.find((gate) => gate.id === 'estimated')?.evidence).toBeUndefined();
		expect(gates[0].evidence?.url).toBe('https://github.com/o/r/issues/4');
	});

	describe('cache', () => {
		const project = { gates: seeded, issueNumber: 4 };

		it('reads GitHub once for the same issue within 60 seconds', async () => {
			const fetchFn = reply(200, { labels: [{ name: 'gate:refined' }] });
			const first = await loadTimeline(fetchFn, project, 'o/r', undefined, 1000);
			const second = await loadTimeline(fetchFn, project, 'o/r', undefined, 60_999);
			expect(fetchFn).toHaveBeenCalledTimes(1);
			expect(second).toEqual(first);
		});

		it('reads GitHub again after 60 seconds', async () => {
			const fetchFn = reply(200, { labels: [{ name: 'gate:refined' }] });
			await loadTimeline(fetchFn, project, 'o/r', undefined, 1000);
			await loadTimeline(fetchFn, project, 'o/r', undefined, 61_000);
			expect(fetchFn).toHaveBeenCalledTimes(2);
		});

		it('caches different issues and repos separately', async () => {
			const fetchFn = reply(200, { labels: [] });
			await loadTimeline(fetchFn, project, 'o/r', undefined, 1000);
			await loadTimeline(fetchFn, { gates: seeded, issueNumber: 5 }, 'o/r', undefined, 1000);
			await loadTimeline(fetchFn, project, 'o/other', undefined, 1000);
			expect(fetchFn).toHaveBeenCalledTimes(3);
		});

		it('reads GitHub again when the clock has moved backward', async () => {
			const fetchFn = reply(200, { labels: [{ name: 'gate:refined' }] });
			await loadTimeline(fetchFn, project, 'o/r', undefined, 100_000);
			await loadTimeline(fetchFn, project, 'o/r', undefined, 1000);
			expect(fetchFn).toHaveBeenCalledTimes(2);
		});

		it('shares one read between overlapping calls for the same issue', async () => {
			const fetchFn = reply(200, { labels: [{ name: 'gate:refined' }] });
			await Promise.all([
				loadTimeline(fetchFn, project, 'o/r', undefined, 1000),
				loadTimeline(fetchFn, project, 'o/r', undefined, 1000),
				loadTimeline(fetchFn, project, 'o/r', undefined, 1000)
			]);
			expect(fetchFn).toHaveBeenCalledTimes(1);
		});

		it('retries after an overlapping read fails', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const failing = reply(404, {});
			const results = await Promise.all([
				loadTimeline(failing, project, 'o/r', undefined, 1000),
				loadTimeline(failing, project, 'o/r', undefined, 1000)
			]);
			expect(failing).toHaveBeenCalledTimes(1);
			expect(results.every((result) => result.note)).toBe(true);

			const working = reply(200, { labels: [] });
			await loadTimeline(working, project, 'o/r', undefined, 2000);
			expect(working).toHaveBeenCalledTimes(1);
		});

		it('does not cache a failed read, and tries again on the next call', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const failed = await loadTimeline(reply(404, {}), project, 'o/r', undefined, 1000);
			expect(failed.note).toMatch(/could not be read/);

			const working = reply(200, { labels: [{ name: 'gate:refined' }] });
			const ok = await loadTimeline(working, project, 'o/r', undefined, 2000);
			expect(working).toHaveBeenCalledTimes(1);
			expect(ok.source).toBe('github');
		});
	});
});
