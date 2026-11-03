<script lang="ts">
	import { MAX_LENGTH } from '#lib/submission.js';
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
		{#if form.filed}
			<h2>Thanks, your project is filed</h2>
			{#if form.issueUrl}
				<p>
					Follow it as a public GitHub issue: <a href={form.issueUrl} rel="external"
						>{form.issueUrl}</a
					>
				</p>
			{:else}
				<p>GitHub accepted it but did not send back a link. Look for it in the project's issues.</p>
			{/if}
		{:else}
			<h2>Thanks, this is what would be filed</h2>
			<p>
				Filing is switched off on this server, so nothing was filed. The issue would look like this:
			</p>
		{/if}
		<h3>{form.issueTitle}</h3>
		<pre>{form.issueBody}</pre>
	</section>
{:else}
	<p>
		Describe a problem in your community where AI could help. Volunteers and AI will refine it with
		you before anything is built. Your project is published as a public GitHub issue. Your contact
		email is not published, and this build does not store it.
	</p>

	{#if form && 'message' in form}
		<p class="error" role="alert">{form.message}</p>
	{/if}

	<form method="POST">
		{#each fields as field (field.name)}
			<label>
				{field.label}
				{#if field.multiline}
					<textarea
						name={field.name}
						rows="3"
						maxlength={MAX_LENGTH[field.name]}
						value={form?.value?.[field.name] ?? ''}></textarea>
				{:else}
					<input
						name={field.name}
						maxlength={MAX_LENGTH[field.name]}
						value={form?.value?.[field.name] ?? ''}
					/>
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
