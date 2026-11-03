<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	const fields = [
		{ name: 'ngo', label: 'Organisation', multiline: false },
		{ name: 'contact', label: 'Contact email', multiline: false },
		{ name: 'region', label: 'Region', multiline: false },
		{ name: 'title', label: 'Project title', multiline: false },
		{ name: 'problem', label: 'The problem', multiline: true },
		{ name: 'beneficiaries', label: 'Who benefits', multiline: true },
		{ name: 'data', label: 'Data you have or expect to use', multiline: true }
	] as const;
</script>

<svelte:head>
	<title>Submit a project · NGO Factory</title>
</svelte:head>

<h1>Submit a project</h1>

{#if form && 'issueBody' in form}
	<section class="done">
		<h2>Thanks, this is what would be filed</h2>
		<p>In this hackathon build nothing is stored. The real build opens this GitHub issue:</p>
		<h3>{form.issueTitle}</h3>
		<pre>{form.issueBody}</pre>
	</section>
{:else}
	<p>
		Describe a problem in your community where AI could help. Volunteers and AI will refine it with
		you before anything is built.
	</p>

	<form method="POST">
		{#each fields as field (field.name)}
			<label>
				{field.label}
				{#if field.multiline}
					<textarea name={field.name} rows="3" value={form?.value?.[field.name] ?? ''}></textarea>
				{:else}
					<input name={field.name} value={form?.value?.[field.name] ?? ''} />
				{/if}
				{#if form?.errors?.[field.name]}
					<span class="error">{form.errors[field.name]}</span>
				{/if}
			</label>
		{/each}
		<button type="submit">Submit</button>
	</form>
{/if}

<style>
	form {
		display: grid;
		gap: 1rem;
		max-width: 36rem;
	}

	label {
		display: grid;
		gap: 0.25rem;
		font-weight: 600;
	}

	input,
	textarea {
		font: inherit;
		padding: 0.5rem;
		border: 1px solid var(--line);
		border-radius: 0.375rem;
	}

	.error {
		color: var(--warn);
		font-weight: 400;
		font-size: 0.875rem;
	}

	button {
		justify-self: start;
		font: inherit;
		padding: 0.5rem 1.25rem;
		border: 0;
		border-radius: 0.375rem;
		background: var(--accent);
		color: #fff;
		cursor: pointer;
	}

	pre {
		white-space: pre-wrap;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 0.5rem;
		padding: 1rem;
	}
</style>
