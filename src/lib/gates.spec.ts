import { describe, expect, it, vi } from 'vitest';
import { GATE_TEMPLATE, gatesAt, gatesFromLabels, loadTimeline } from './gates';

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
});
