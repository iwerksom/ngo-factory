<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<nav>
		<a class="brand" href={resolve('/')}>NGO Factory</a>
		<a href={resolve('/submit')}>Submit a project</a>
	</nav>
</header>

<main>
	{@render children()}
</main>

<footer>
	<p>
		Hackathon build. Funding and project data are <strong>simulated</strong>. Nothing here is advice
		to the public.
	</p>
</footer>

<style>
	:global(:root) {
		--ink: #1b2a24;
		--muted: #5d6b64;
		--line: #d9e1dc;
		--bg: #f7faf8;
		--card: #ffffff;
		--accent: #1f7a4d;
		--warn: #b45309;
		color-scheme: light;
	}

	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		line-height: 1.5;
		color: var(--ink);
		background: var(--bg);
	}

	:global(a) {
		color: var(--accent);
	}

	header {
		border-bottom: 1px solid var(--line);
		background: var(--card);
	}

	nav,
	main,
	footer {
		max-width: 56rem;
		margin: 0 auto;
		padding: 1rem;
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.brand {
		font-weight: 700;
		text-decoration: none;
		color: var(--ink);
	}

	footer {
		color: var(--muted);
		font-size: 0.875rem;
	}
</style>
