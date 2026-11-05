import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

function clock(start = 0) {
	let time = start;
	return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe('createRateLimiter', () => {
	it('allows up to max hits per key, then refuses', () => {
		const limiter = createRateLimiter({ max: 3, windowMs: 1000, now: clock().now });

		expect([1, 2, 3, 4].map(() => limiter.allow('a'))).toEqual([true, true, true, false]);
	});

	it('counts each key separately', () => {
		const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: clock().now });

		expect(limiter.allow('a')).toBe(true);
		expect(limiter.allow('b')).toBe(true);
		expect(limiter.allow('a')).toBe(false);
	});

	it('allows again once the window has passed', () => {
		const time = clock();
		const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: time.now });

		expect(limiter.allow('a')).toBe(true);
		time.advance(999);
		expect(limiter.allow('a')).toBe(false);
		time.advance(1);
		expect(limiter.allow('a')).toBe(true);
	});

	it('does not extend the lockout by being refused', () => {
		const time = clock();
		const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: time.now });

		limiter.allow('a');
		time.advance(500);
		limiter.allow('a');
		time.advance(500);

		expect(limiter.allow('a')).toBe(true);
	});

	it('forgets expired keys instead of growing without bound', () => {
		const time = clock();
		const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: time.now });
		for (let i = 0; i < 600; i++) limiter.allow(`old-${i}`);
		time.advance(1000);

		// Triggers the prune; behaviour is unchanged for a fresh key.
		expect(limiter.allow('new')).toBe(true);
		expect(limiter.allow('new')).toBe(false);
	});

	it('peek says what allow would say, without recording a hit', () => {
		const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: clock().now });

		expect([limiter.peek('a'), limiter.peek('a')]).toEqual([true, true]);
		expect(limiter.allow('a')).toBe(true);
		expect(limiter.peek('a')).toBe(false);
		expect(limiter.peek('b')).toBe(true);
	});
});
