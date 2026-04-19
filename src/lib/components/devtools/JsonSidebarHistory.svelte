<script lang="ts">
	import { jsonStore } from '$lib/stores/jsonStore';
	import { slide, fade } from 'svelte/transition';
	import { formatDistanceToNow } from 'date-fns';

	let { onSelect } = $props<{ onSelect: (data: string) => void }>();

	function handleClearAll() {
		if (confirm('Are you sure you want to clear all JSON history?')) {
			jsonStore.clear();
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden bg-surface">
	<div class="flex h-12 shrink-0 items-center justify-between border-b border-stroke px-4">
		<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase">History</span>
		{#if $jsonStore.length > 0}
			<button
				class="text-[10px] font-bold text-content-dim hover:text-red-500"
				onclick={handleClearAll}
			>
				Clear ALL
			</button>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto">
		{#each $jsonStore as item (item.id)}
			<div
				class="group relative overflow-hidden border-b border-stroke/50 transition-all hover:bg-surface-dim/50"
				transition:slide|local={{ duration: 150 }}
			>
				<button
					class="w-full p-3 pr-10 text-left transition-colors"
					onclick={() => onSelect(item.data)}
					aria-label="Load {item.name} from history"
				>
					<div class="min-w-0 flex-1">
						<h4
							class="truncate text-xs font-bold text-content transition-colors group-hover:text-brand-orange"
						>
							{item.name}
						</h4>
						<p class="mt-1 text-[10px] text-content-dim/70">
							{formatDistanceToNow(item.timestamp)} ago
						</p>
					</div>
				</button>

				<button
					class="absolute top-3 right-2 z-10 p-1 text-content-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
					onclick={(e) => {
						e.stopPropagation();
						jsonStore.remove(item.id);
					}}
					aria-label="Delete history item"
				>
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>

				<div
					class="absolute top-0 bottom-0 left-0 w-1 bg-brand-orange opacity-0 transition-opacity group-hover:opacity-100"
				></div>
			</div>
		{:else}
			<div
				class="flex h-full flex-col items-center justify-center p-8 text-center text-content-dim opacity-30"
				in:fade
			>
				<svg class="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<p class="text-xs italic">No history yet</p>
			</div>
		{/each}
	</div>
</div>
