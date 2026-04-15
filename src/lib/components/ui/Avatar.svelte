<script lang="ts">
	const sizes = {
		xs: 'w-6 h-6 text-[10px]',
		sm: 'w-8 h-8 text-[12px]',
		md: 'w-10 h-10 text-[14px]',
		lg: 'w-16 h-16 text-[20px]',
		xl: 'w-24 h-24 text-[32px]'
	};

	let {
		src = '' as string | null,
		name = '',
		size = 'md' as keyof typeof sizes,
		class: className = ''
	} = $props();

	const initials = $derived(
		name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	);
</script>

<div
	class="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 {sizes[
		size
	]} {className}"
>
	{#if src}
		<img {src} alt={name} class="h-full w-full object-cover" />
	{:else}
		<span class="font-bold text-zinc-500">{initials || '?'}</span>
	{/if}
</div>
