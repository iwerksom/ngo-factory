import type { RateLimiter } from '#lib/rate-limit.js';

export interface SubmissionCap {
	/**
	 * True when this submission may be filed. The caller must then call `release` once it has
	 * finished filing, whether or not that worked.
	 */
	admit(visitor: string, countRecent: () => Promise<number | null>): Promise<boolean>;
	release(): void;
}

/**
 * Decides whether a submission may be filed. Order matters:
 * 1. The in-memory limits are only looked at first, so a visitor who is already over their limit
 *    never makes us call GitHub with our token.
 * 2. GitHub's count of recent submissions is the shared, restart-proof cap. When it cannot be read
 *    (`null`) only the in-memory limits apply.
 * 3. Only an admitted submission records a hit, so a refusal does not use up anyone's allowance.
 *
 * `inFlight` counts submissions on this instance that were admitted but are not filed yet, so two
 * overlapping requests cannot both read the same count just below the cap. It cannot do that
 * across instances: a strict cap there needs a shared lock, which we do not have.
 */
export function createSubmissionCap(options: {
	perVisitor: RateLimiter;
	overall: RateLimiter;
	max: number;
}): SubmissionCap {
	const { perVisitor, overall, max } = options;
	let inFlight = 0;

	return {
		async admit(visitor, countRecent) {
			if (!overall.peek('all') || !perVisitor.peek(visitor)) return false;

			const recent = await countRecent();
			if (recent !== null && recent + inFlight >= max) return false;

			// The limits may have filled up while we waited for GitHub. Look at both before recording
			// either, so a refusal never uses up the other limit. There is no await from here to
			// the end, so nothing can slip in between the look and the recording.
			if (!overall.peek('all') || !perVisitor.peek(visitor)) return false;
			overall.allow('all');
			perVisitor.allow(visitor);

			inFlight += 1;
			return true;
		},

		release() {
			inFlight = Math.max(0, inFlight - 1);
		}
	};
}
