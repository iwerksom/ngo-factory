import { describe, expect, it, vi } from 'vitest';
import { createIssue, GitHubError } from './github';

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
