<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>NGO Factory</title>
</svelte:head>

<h1>Local AI projects, built in the open</h1>
<p class="lead">
	NGOs submit a problem. AI and volunteers refine it, estimate it and build it. Every step passes a
	gate you can follow.
</p>

<ul>
	{#each data.projects as project (project.slug)}
		<li>
			<h2><a href={resolve('/projects/[slug]', { slug: project.slug })}>{project.title}</a></h2>
			<p class="meta">{project.ngo} · {project.region}</p>
			<p>{project.summary}</p>
			<p class="gate">Now at gate: <strong>{project.gate}</strong></p>
			<progress value={project.progress} max="1" aria-label="Funding progress"></progress>
			<p class="meta">${project.raisedUsd} of ${project.goalUsd} (simulated)</p>
		</li>
	{/each}
</ul>

<style>
	.lead {
		color: var(--muted);
		font-size: 1.125rem;
	}

	ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 1rem;
	}

	li {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 0.5rem;
		padding: 1rem 1.25rem;
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
	}

	.meta {
		color: var(--muted);
		font-size: 0.875rem;
		margin: 0.25rem 0;
	}

	progress {
		width: 100%;
		accent-color: var(--accent);
	}
</style>
