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

/** Label that marks an issue as a submission. */
export const SUBMISSION_LABEL = 'submission';

/**
 * How many submission issues were created in the last `windowMs`. GitHub is the record, so every
 * server instance, and a restarted one, gives the same answer. Pull requests are not counted
 * (GitHub lists them as issues). Throws a GitHubError when GitHub does not answer with a list.
 */
export async function countRecentSubmissions(
	fetchFn: typeof fetch,
	target: IssueTarget,
	windowMs: number,
	now: number = Date.now()
): Promise<number> {
	if (!REPO_PATTERN.test(target.repo)) {
		throw new GitHubError(`Invalid repo "${target.repo}", expected owner/name`);
	}

	const since = new Date(now - windowMs).toISOString();
	// `since` filters on last update, not on creation, so created_at is checked below. Newest first,
	// and one page of 100 is far more than the cap.
	const query = new URLSearchParams({
		labels: SUBMISSION_LABEL,
		state: 'all',
		sort: 'created',
		direction: 'desc',
		per_page: '100',
		since
	});
	const response = await fetchFn(`https://api.github.com/repos/${target.repo}/issues?${query}`, {
		headers: {
			accept: 'application/vnd.github+json',
			authorization: `Bearer ${target.token}`,
			'x-github-api-version': '2022-11-28'
		},
		signal: AbortSignal.timeout(5000)
	});
	if (!response.ok) {
		throw new GitHubError(`GitHub returned ${response.status}`, response.status);
	}

	const issues: unknown = await response.json().catch(() => null);
	if (!Array.isArray(issues)) throw new GitHubError('GitHub reply was not a list of issues');

	const cutoff = now - windowMs;
	return issues.filter((issue: { pull_request?: unknown; created_at?: unknown } | null) => {
		if (!issue || issue.pull_request) return false;
		const created = typeof issue.created_at === 'string' ? Date.parse(issue.created_at) : NaN;
		return created > cutoff;
	}).length;
}
