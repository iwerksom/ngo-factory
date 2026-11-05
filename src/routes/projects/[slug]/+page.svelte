<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Decider } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let project = $derived(data.project);
	let estimate = $derived(project.estimate);

	const million = (n: number) => `${n / 1_000_000}M`;
	const decider: Record<Decider, string> = {
		ai: 'AI',
		human: 'Human',
		'ai+human': 'AI + human',
		platform: 'Platform'
	};
</script>

<svelte:head>
	<title>{project.title} · NGO Factory</title>
</svelte:head>

<p><a href={resolve('/')}>&larr; All projects</a></p>
<h1>{project.title}</h1>
<p class="meta">{project.ngo} · {project.region}</p>
<p>{project.problem}</p>

<h2>Estimate</h2>
<dl>
	<dt>Tokens</dt>
	<dd>{million(estimate.tokensLow)} to {million(estimate.tokensHigh)}</dd>
	<dt>Token cost</dt>
	<dd>${data.tokenCostLowUsd} to ${data.tokenCostHighUsd}</dd>
	<dt>Human time</dt>
	<dd>{estimate.humanHoursLow} to {estimate.humanHoursHigh} hours (volunteer)</dd>
	<dt>Confidence</dt>
	<dd>{estimate.confidence}</dd>
</dl>
<p><strong>Approach.</strong> {estimate.approach}</p>

<h2>Funding <small>(simulated)</small></h2>
<progress value={data.progress} max="1" aria-label="Funding progress"></progress>
<p class="meta">
	${project.raisedUsd} of ${data.goalUsd}: high token cost, {project.supportMonths} months of support
	and 15% contingency.
</p>

<h2>
	Harness <small>({data.timeline.source === 'github' ? 'from GitHub labels' : 'simulated'})</small>
</h2>
{#if data.timeline.note}
	<p class="meta">{data.timeline.note} Showing simulated data.</p>
{/if}
{#if data.timeline.conflict}
	<p class="meta">
		The issue has more than one gate label. The earliest gate is shown until a maintainer fixes it.
	</p>
{/if}
<ol class="gates">
	{#each data.timeline.gates as gate (gate.id)}
		<li class={gate.status}>
			<span class="dot" aria-hidden="true"></span>
			<div>
				<strong>{gate.name}</strong>
				<span class="meta">{decider[gate.decidedBy]} · {gate.status}</span>
				<div class="meta">{gate.description}</div>
				{#if gate.evidence}
					<a href={gate.evidence.url} rel="external">{gate.evidence.label}</a>
				{/if}
			</div>
		</li>
	{/each}
</ol>

<p class="disclaimer">
	Decision support, not professional advice. Anything high-stakes is reviewed by a person before it
	reaches the public.
</p>

<style>
	.meta {
		color: var(--muted);
		font-size: 0.875rem;
	}

	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.25rem 1rem;
	}

	dt {
		color: var(--muted);
	}

	dd {
		margin: 0;
	}

	progress {
		width: 100%;
		accent-color: var(--accent);
	}

	.gates {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}

	.gates li {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.dot {
		flex: none;
		width: 0.875rem;
		height: 0.875rem;
		margin-top: 0.35rem;
		border-radius: 50%;
		border: 2px solid var(--line);
	}

	.passed .dot {
		background: var(--accent);
		border-color: var(--accent);
	}

	.current .dot {
		border-color: var(--warn);
		background: var(--warn);
	}

	.pending {
		opacity: 0.6;
	}

	.disclaimer {
		margin-top: 2rem;
		padding: 0.75rem 1rem;
		border-left: 4px solid var(--warn);
		background: var(--card);
	}
</style>
