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

export interface CreatedIssue {
	number: number;
	url: string;
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

	const created = (await response.json()) as { number: number; html_url: string };
	return { number: created.number, url: created.html_url };
}
