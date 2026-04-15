<script lang="ts">
	import type { FormEventHandler } from 'svelte/elements';

	let {
		label = '',
		type = 'text' as 'text' | 'email' | 'password' | 'url',
		value = $bindable(''),
		placeholder = '' as string | null | undefined,
		required = false,
		id = Math.random().toString(36).substring(2, 9),
		error = '',
		oninput = (() => {}) as FormEventHandler<HTMLInputElement>
	} = $props();
</script>

<div class="field-group mb-4.5">
	{#if label}
		<label for={id} class="mb-2 block text-[10px] font-bold tracking-[1px] text-zinc-500 uppercase"
			>{label}</label
		>
	{/if}
	<input
		{id}
		{type}
		bind:value
		{placeholder}
		{required}
		{oninput}
		class="w-full rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3.5 text-sm text-white transition-all outline-none placeholder:text-zinc-700 focus:border-orange-500"
	/>
	{#if error}
		<p class="mt-1.5 text-xs text-red-500">{error}</p>
	{/if}
</div>
