export interface RateLimiter {
	/** Records a hit for `key` and returns true, or returns false when the key is over its limit. */
	allow(key: string): boolean;
}

const PRUNE_ABOVE = 500;

/**
 * Sliding window kept in memory: at most `max` hits per `windowMs` for each key.
 * It resets on restart and is per server instance, so it slows abuse down but does not stop a
 * determined attacker on its own.
 */
export function createRateLimiter(options: {
	max: number;
	windowMs: number;
	now?: () => number;
}): RateLimiter {
	const { max, windowMs, now = Date.now } = options;
	const hits = new Map<string, number[]>();

	return {
		allow(key) {
			const t = now();

			if (hits.size > PRUNE_ABOVE) {
				for (const [other, times] of hits) {
					if (times.every((time) => t - time >= windowMs)) hits.delete(other);
				}
			}

			const recent = (hits.get(key) ?? []).filter((time) => t - time < windowMs);
			if (recent.length >= max) {
				hits.set(key, recent);
				return false;
			}
			recent.push(t);
			hits.set(key, recent);
			return true;
		}
	};
}
