import { describe, expect, it, vi } from 'vitest';
import {
	countRecentSubmissions,
	createIssue,
	getIssueLabels,
	GitHubError,
	resolveTarget
} from '#lib/github.js';

const target = { repo: 'iwerksom/ngo-factory', token: 'secret-token' };
const issue = { title: 'Crop weather', body: 'Body', labels: ['submission'] };

function respond(status: number, json: unknown = {}): typeof fetch {
	return vi.fn(
		async () => new Response(JSON.stringify(json), { status })
	) as unknown as typeof fetch;
}

describe('createIssue', () => {
	it('posts the issue to the repo and returns its number and url', async () => {
		const fetchFn = respond(201, {
			number: 7,
			html_url: 'https://github.com/iwerksom/ngo-factory/issues/7'
		});

		const created = await createIssue(fetchFn, target, issue);

		expect(created).toEqual({ number: 7, url: 'https://github.com/iwerksom/ngo-factory/issues/7' });
		const [url, init] = vi.mocked(fetchFn).mock.calls[0];
		expect(url).toBe('https://api.github.com/repos/iwerksom/ngo-factory/issues');
		expect(init?.method).toBe('POST');
		expect(JSON.parse(init?.body as string)).toEqual(issue);
		expect((init?.headers as Record<string, string>).authorization).toBe('Bearer secret-token');
	});

	it('still succeeds, without a link, when GitHub created the issue but the reply is unreadable', async () => {
		const fetchFn = vi.fn(
			async () => new Response('<html>gateway hiccup</html>', { status: 201 })
		) as unknown as typeof fetch;

		await expect(createIssue(fetchFn, target, issue)).resolves.toEqual({ number: null, url: null });
	});

	it('ignores reply fields of the wrong type', async () => {
		const created = await createIssue(respond(201, { number: '7', html_url: 7 }), target, issue);

		expect(created).toEqual({ number: null, url: null });
	});

	it('throws with the status when GitHub rejects the request', async () => {
		const error = await createIssue(respond(403), target, issue).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(GitHubError);
		expect((error as GitHubError).status).toBe(403);
	});

	it('does not leak the token or response body in the error', async () => {
		const error = await createIssue(
			respond(401, { message: 'Bad credentials' }),
			target,
			issue
		).catch((e: unknown) => e);

		expect((error as Error).message).not.toContain('secret-token');
		expect((error as Error).message).not.toContain('Bad credentials');
	});

	it.each(['no-slash', 'a/b/c', '../x/y', 'owner/name?x=1', ''])(
		'rejects the malformed repo %j without calling GitHub',
		async (repo) => {
			const fetchFn = respond(201);

			await expect(createIssue(fetchFn, { ...target, repo }, issue)).rejects.toBeInstanceOf(
				GitHubError
			);
			expect(fetchFn).not.toHaveBeenCalled();
		}
	);
});

describe('resolveTarget', () => {
	it('is preview mode only when neither setting is present', () => {
		expect(resolveTarget(undefined, undefined)).toEqual({ mode: 'preview' });
	});

	it('is live when both are present and valid', () => {
		expect(resolveTarget('tok', 'iwerksom/ngo-factory')).toEqual({
			mode: 'live',
			target: { repo: 'iwerksom/ngo-factory', token: 'tok' }
		});
	});

	it('flags a token without a repo as misconfigured', () => {
		expect(resolveTarget('tok', undefined)).toEqual({
			mode: 'misconfigured',
			problem: 'GITHUB_ISSUES_REPO is not set'
		});
	});

	it('flags a repo without a token as misconfigured', () => {
		expect(resolveTarget(undefined, 'iwerksom/ngo-factory')).toEqual({
			mode: 'misconfigured',
			problem: 'GITHUB_TOKEN is not set'
		});
	});

	it('flags a malformed repo as misconfigured', () => {
		expect(resolveTarget('tok', 'not-a-repo').mode).toBe('misconfigured');
	});
});

describe('getIssueLabels', () => {
	it('returns label names, whether GitHub sends strings or objects', async () => {
		const fetchFn = respond(200, { labels: ['a', { name: 'b' }, { name: 3 }, null] });
		await expect(getIssueLabels(fetchFn, { repo: 'o/r' }, 4)).resolves.toEqual(['a', 'b']);
		expect(vi.mocked(fetchFn).mock.calls[0][0]).toBe('https://api.github.com/repos/o/r/issues/4');
	});

	it('sends no authorization header without a token and a bearer token with one', async () => {
		const open = respond(200, { labels: [] });
		await getIssueLabels(open, { repo: 'o/r' }, 4);
		expect(
			(vi.mocked(open).mock.calls[0][1]?.headers as Record<string, string>).authorization
		).toBeUndefined();

		const closed = respond(200, { labels: [] });
		await getIssueLabels(closed, { repo: 'o/r', token: 'secret-token' }, 4);
		expect(
			(vi.mocked(closed).mock.calls[0][1]?.headers as Record<string, string>).authorization
		).toBe('Bearer secret-token');
	});

	it('throws without echoing the reply when GitHub refuses', async () => {
		const error = await getIssueLabels(
			respond(404, { message: 'secret detail' }),
			{ repo: 'o/r' },
			4
		).catch((e) => e);
		expect(error).toBeInstanceOf(GitHubError);
		expect(error.message).toBe('GitHub returned 404');
	});

	it('rejects a bad repo or issue number before any request', async () => {
		const fetchFn = respond(200, { labels: [] });
		await expect(getIssueLabels(fetchFn, { repo: 'nope' }, 4)).rejects.toThrow(GitHubError);
		await expect(getIssueLabels(fetchFn, { repo: 'o/r' }, 0)).rejects.toThrow(GitHubError);
		expect(fetchFn).not.toHaveBeenCalled();
	});
});

describe('countRecentSubmissions', () => {
	const HOUR = 60 * 60 * 1000;
	const now = Date.parse('2026-11-04T12:00:00Z');
	const ago = (ms: number) => new Date(now - ms).toISOString();

	it('counts submission issues created inside the window and asks GitHub only for them', async () => {
		const fetchFn = respond(200, [{ created_at: ago(1000) }, { created_at: ago(30 * 60 * 1000) }]);

		await expect(countRecentSubmissions(fetchFn, target, HOUR, now)).resolves.toBe(2);

		const [url, init] = vi.mocked(fetchFn).mock.calls[0];
		const query = new URL(url as string).searchParams;
		expect(query.get('labels')).toBe('submission');
		expect(query.get('state')).toBe('all');
		expect(query.get('since')).toBe(ago(HOUR));
		expect((init?.headers as Record<string, string>).authorization).toBe('Bearer secret-token');
	});

	it('does not count an issue older than the window, even if it was updated inside it', async () => {
		const fetchFn = respond(200, [
			{ created_at: ago(HOUR - 1) },
			{ created_at: ago(HOUR) },
			{ created_at: ago(61 * 60 * 1000) }
		]);

		await expect(countRecentSubmissions(fetchFn, target, HOUR, now)).resolves.toBe(1);
	});

	it('does not count pull requests or malformed entries', async () => {
		const fetchFn = respond(200, [
			{ created_at: ago(1000), pull_request: {} },
			{ created_at: 'yesterday' },
			{},
			null,
			{ created_at: ago(1000) }
		]);

		await expect(countRecentSubmissions(fetchFn, target, HOUR, now)).resolves.toBe(1);
	});

	it('gives the same answer on every instance that reads the same GitHub', async () => {
		const issues = Array.from({ length: 29 }, () => ({ created_at: ago(1000) }));
		const a = await countRecentSubmissions(respond(200, issues), target, HOUR, now);
		const b = await countRecentSubmissions(respond(200, issues), target, HOUR, now);

		expect([a, b]).toEqual([29, 29]);
	});

	it.each([
		['a non-200 reply', () => respond(500, {})],
		['a reply that is not a list', () => respond(200, { message: 'nope' })],
		[
			'an unreadable reply',
			() => vi.fn(async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch
		]
	])('throws on %s', async (_name, makeFetch) => {
		await expect(countRecentSubmissions(makeFetch(), target, HOUR, now)).rejects.toThrow(
			GitHubError
		);
	});

	it('rejects a bad repo before any request', async () => {
		const fetchFn = respond(200, []);
		await expect(
			countRecentSubmissions(fetchFn, { ...target, repo: 'nope' }, HOUR, now)
		).rejects.toThrow(GitHubError);
		expect(fetchFn).not.toHaveBeenCalled();
	});
});
