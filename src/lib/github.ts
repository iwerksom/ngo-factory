export interface IssueTarget {
	/** `owner/name` of the repo that receives submissions. */
	repo: string;
	/** Fine-grained token with Issues: write on that repo only. */
	token: string;
}

export interface NewIssue {
	title: string;
	body: string;
	labels?: string[];
}

/** GitHub accepted the issue. A field is null when the reply did not include it in a readable form. */
export interface CreatedIssue {
	number: number | null;
	url: string | null;
}

export class GitHubError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = 'GitHubError';
	}
}

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

export type TargetResult =
	| { mode: 'preview' }
	| { mode: 'live'; target: IssueTarget }
	| { mode: 'misconfigured'; problem: string };

/** Preview mode is only for neither setting present. A half-configured pair is an error, not a preview. */
export function resolveTarget(token: string | undefined, repo: string | undefined): TargetResult {
	if (!token && !repo) return { mode: 'preview' };
	if (!token) return { mode: 'misconfigured', problem: 'GITHUB_TOKEN is not set' };
	if (!repo) return { mode: 'misconfigured', problem: 'GITHUB_ISSUES_REPO is not set' };
	if (!REPO_PATTERN.test(repo)) {
		return { mode: 'misconfigured', problem: 'GITHUB_ISSUES_REPO must look like owner/name' };
	}
	return { mode: 'live', target: { repo, token } };
}

/** Files a GitHub issue. `fetchFn` is injected so tests do not touch the network. */
export async function createIssue(
	fetchFn: typeof fetch,
	target: IssueTarget,
	issue: NewIssue
): Promise<CreatedIssue> {
	if (!REPO_PATTERN.test(target.repo)) {
		throw new GitHubError(`Invalid repo "${target.repo}", expected owner/name`);
	}

	const response = await fetchFn(`https://api.github.com/repos/${target.repo}/issues`, {
		method: 'POST',
		headers: {
			accept: 'application/vnd.github+json',
			authorization: `Bearer ${target.token}`,
			'content-type': 'application/json',
			'x-github-api-version': '2022-11-28'
		},
		body: JSON.stringify(issue)
	});

	// The response body is not included: it can echo request details.
	if (!response.ok) {
		throw new GitHubError(`GitHub returned ${response.status}`, response.status);
	}

	// From here GitHub has created the issue. An unreadable reply must not look like a failure,
	// or the applicant retries and files a duplicate.
	const created: { number?: unknown; html_url?: unknown } | null = await response
		.json()
		.catch(() => null);

	return {
		number: typeof created?.number === 'number' ? created.number : null,
		url: typeof created?.html_url === 'string' ? created.html_url : null
	};
}

export interface IssueSource {
	/** `owner/name`. */
	repo: string;
	/** Only needed for a private repo; a public issue can be read without one. */
	token?: string;
}

/** Label names on one issue. Throws a GitHubError when GitHub does not answer with them. */
export async function getIssueLabels(
	fetchFn: typeof fetch,
	source: IssueSource,
	number: number
): Promise<string[]> {
	if (!REPO_PATTERN.test(source.repo)) {
		throw new GitHubError(`Invalid repo "${source.repo}", expected owner/name`);
	}
	if (!Number.isInteger(number) || number < 1) {
		throw new GitHubError(`Invalid issue number ${number}`);
	}

	const headers: Record<string, string> = {
		accept: 'application/vnd.github+json',
		'x-github-api-version': '2022-11-28'
	};
	if (source.token) headers.authorization = `Bearer ${source.token}`;

	const response = await fetchFn(`https://api.github.com/repos/${source.repo}/issues/${number}`, {
		headers,
		signal: AbortSignal.timeout(5000)
	});
	if (!response.ok) {
		throw new GitHubError(`GitHub returned ${response.status}`, response.status);
	}

	const issue: { labels?: unknown } | null = await response.json().catch(() => null);
	if (!Array.isArray(issue?.labels)) throw new GitHubError('GitHub reply had no labels');

	return issue.labels.flatMap((label: unknown) => {
		if (typeof label === 'string') return [label];
		const name = (label as { name?: unknown } | null)?.name;
		return typeof name === 'string' ? [name] : [];
	});
}
