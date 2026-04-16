<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { isOpen, onClose }: { isOpen: boolean; onClose: () => void } = $props();

	const shortcuts = [
		{ keys: ['⌘', 'K'], label: 'Open Command Palette', description: 'Search everything' },
		{ keys: ['⌘', '/'], label: 'Show Shortcuts', description: 'View this help modal' },
		{ keys: ['esc'], label: 'Close', description: 'Close modals or overlays' },
		{ keys: ['↑', '↓'], label: 'Navigate', description: 'Move through lists' },
		{ keys: ['↵'], label: 'Select', description: 'Execute selected command' }
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={(e) => isOpen && handleKeydown(e)} />

{#if isOpen}
	<div
		class="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm"
		onclick={onClose}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
	>
		<div
			class="glass w-full max-w-lg overflow-hidden rounded-2xl border border-stroke p-6 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="none"
			transition:fly={{ y: 20, duration: 400, easing: cubicOut }}
		>
			<div class="mb-6 border-b border-zinc-900 pb-4">
				<h2 class="text-xl font-bold text-white">Keyboard Shortcuts</h2>
				<p class="text-sm text-zinc-500">Master NeuroHub with these powerful shortcuts.</p>
			</div>

			<div class="grid gap-4">
				{#each shortcuts as s (s.label)}
					<div class="group flex items-center justify-between">
						<div class="flex flex-col">
							<span
								class="text-sm font-medium text-white transition-colors group-hover:text-brand-orange"
								>{s.label}</span
							>
							<span class="text-xs text-zinc-600">{s.description}</span>
						</div>
						<div class="flex gap-1">
							{#each s.keys as key, i (key + i)}
								<kbd
									class="flex min-w-[24px] items-center justify-center rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 font-mono text-xs font-bold text-zinc-400"
								>
									{key}
								</kbd>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<div class="mt-8 text-center text-[10px] tracking-widest text-zinc-600 uppercase">
				Press <kbd class="rounded border border-zinc-900 bg-zinc-900 px-1">ESC</kbd> to close
			</div>
		</div>
	</div>
{/if}
