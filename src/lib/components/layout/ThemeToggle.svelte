<script lang="ts">
	import { uiStore, type Theme } from '$lib/stores/uiStore';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { collapsed = false } = $props<{ collapsed?: boolean }>();
	const { theme } = $derived($uiStore);

	const themes: { id: Theme; icon: string; label: string }[] = [
		{
			id: 'light',
			icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z',
			label: 'Light'
		},
		{
			id: 'dark',
			icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
			label: 'Dark'
		},
		{
			id: 'system',
			icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
			label: 'System'
		}
	];

	function selectTheme(t: Theme) {
		uiStore.setTheme(t);
	}
</script>

<div
	class="flex gap-1 rounded-xl border border-zinc-900 bg-zinc-950/50 p-1 transition-all duration-300 {collapsed
		? 'flex-col'
		: 'items-center'}"
>
	{#each themes as t (t.id)}
		<button
			onclick={() => selectTheme(t.id)}
			class="relative flex h-8 w-full items-center justify-center rounded-lg transition-all duration-300 hover:text-white
				{theme === t.id ? 'text-white' : 'text-zinc-500'}"
			aria-label={t.label}
			title={t.label}
		>
			{#if theme === t.id}
				<div
					data-layout-id="active-theme"
					class="absolute inset-0 rounded-lg bg-zinc-800 shadow-sm"
					transition:fly={{ y: 2, duration: 300, easing: cubicOut }}
				></div>
			{/if}

			<svg class="relative z-10 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={t.icon} />
			</svg>
		</button>
	{/each}
</div>
