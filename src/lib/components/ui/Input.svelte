<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
		error?: string;
	}

	let {
		label = '',
		value = $bindable(''),
		id = Math.random().toString(36).substring(2, 9),
		error = '',
		class: className = '',
		...rest
	}: Props = $props();
</script>

<div class="field-group mb-4.5">
	{#if label}
		<label
			for={id}
			class="mb-2 block text-[10px] font-bold tracking-[1px] text-content-dim uppercase"
		>
			{label}
		</label>
	{/if}
	<input
		{id}
		bind:value
		{...rest}
		class="w-full rounded-xl border border-stroke bg-surface-dim px-4 py-3.5 text-sm text-content transition-all outline-none placeholder:text-content-dim/30 focus:border-brand-orange disabled:cursor-not-allowed disabled:opacity-50 {className}"
	/>
	{#if error}
		<p class="mt-1.5 text-xs text-red-500">{error}</p>
	{/if}
</div>
