<script lang="ts">
	let {
		label = '',
		value = $bindable(''),
		placeholder = '',
		rows = 4,
		id = Math.random().toString(36).substring(2, 9),
		error = ''
	} = $props();
</script>

<div class="field-group mb-6">
	{#if label}
		<label
			for={id}
			class="mb-2 block text-[10px] font-bold tracking-[1px] text-content-dim uppercase"
			>{label}</label
		>
	{/if}
	<textarea
		{id}
		bind:value
		{placeholder}
		{rows}
		class="w-full resize-none rounded-xl border border-stroke bg-surface-dim px-4 py-3.5 text-sm text-content transition-all outline-none placeholder:text-content-dim/30 focus:border-brand-orange"
	></textarea>
	{#if error}
		<p class="mt-1.5 text-xs text-red-500">{error}</p>
	{/if}
</div>
