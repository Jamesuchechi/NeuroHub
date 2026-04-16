<script lang="ts">
	import { uiStore, type Theme } from '$lib/stores/uiStore';

	const { theme } = $derived($uiStore);

	const themes: { value: Theme; icon: string; label: string }[] = [
		{
			value: 'light',
			icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z',
			label: 'Light'
		},
		{
			value: 'dark',
			icon: 'M20.354 15.354A9 9 0 118.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
			label: 'Dark'
		},
		{
			value: 'system',
			icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
			label: 'System'
		}
	];

	function toggle() {
		const currentIndex = themes.findIndex((t) => t.value === theme);
		const nextIndex = (currentIndex + 1) % themes.length;
		uiStore.setTheme(themes[nextIndex].value);
	}
</script>

<button
	onclick={toggle}
	class="group relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-900 bg-zinc-950/50 text-zinc-500 transition-all hover:bg-zinc-900 hover:text-white"
	title="Switch theme (Current: {theme})"
>
	<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
		{#each themes as t (t.value)}
			{#if t.value === theme}
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={t.icon} />
			{/if}
		{/each}
	</svg>
</button>
