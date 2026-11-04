<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Verdict } from '#lib/estimate.js';
	import type { Decider } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let project = $derived(data.project);
	let estimate = $derived(project.estimate);

	const million = (n: number) => `${n / 1_000_000}M`;
	const verdictText: Record<Verdict, string> = {
		under: 'Under the estimate',
		within: 'Within the estimate',
		over: 'Over the estimate'
	};
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

{#if data.comparison.kind !== 'none'}
	<h2>Estimate versus actual <small>(simulated)</small></h2>
	{#if data.comparison.kind === 'missing'}
		<p class="meta">Actuals not recorded yet.</p>
	{:else}
		<table>
			<thead>
				<tr><th>Measure</th><th>Estimate</th><th>Actual</th><th>Result</th></tr>
			</thead>
			<tbody>
				{#each data.comparison.rows as row (row.label)}
					<tr>
						<td>{row.label}</td>
						<td>{row.low.toLocaleString('en')} to {row.high.toLocaleString('en')}</td>
						<td>{row.actual.toLocaleString('en')}</td>
						<td class={row.verdict}>{verdictText[row.verdict]}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
{/if}

<h2>Funding <small>(simulated)</small></h2>
<progress value={data.progress} max="1" aria-label="Funding progress"></progress>
<p class="meta">
	${project.raisedUsd} of ${data.goalUsd}: high token cost, {project.supportMonths} months of support
	and 15% contingency.
</p>

<h2>Harness</h2>
<ol class="gates">
	{#each project.gates as gate (gate.id)}
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

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		text-align: left;
		padding: 0.25rem 0.5rem 0.25rem 0;
		border-bottom: 1px solid var(--line);
	}

	.over {
		color: var(--warn);
		font-weight: 600;
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
