<script lang="ts">
	let { items, command } = $props<{
		items: Array<{ id: string; title: string }>;
		command: (props: { id: string; label: string }) => void;
	}>();

	let selectedIndex = $state(0);

	export function onKeyDown({ event }: { event: KeyboardEvent }) {
		if (event.key === 'ArrowUp') {
			selectedIndex = (selectedIndex + items.length - 1) % items.length;
			return true;
		}
		if (event.key === 'ArrowDown') {
			selectedIndex = (selectedIndex + 1) % items.length;
			return true;
		}
		if (event.key === 'Enter') {
			selectItem(selectedIndex);
			return true;
		}
		return false;
	}

	function selectItem(index: number) {
		const item = items[index];
		if (item) {
			command({ id: item.id, label: item.title });
		}
	}
</script>

<div
	class="z-50 min-w-[200px] overflow-hidden rounded-xl border border-stroke bg-surface shadow-2xl ring-1 ring-white/5"
>
	{#if items.length > 0}
		<div class="flex flex-col p-1">
			{#each items as item, index (item.id)}
				<button
					class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors {index ===
					selectedIndex
						? 'bg-brand-orange/10 text-brand-orange'
						: 'text-content-dim hover:bg-surface-dim'}"
					onclick={() => selectItem(index)}
				>
					<svg
						class="h-4 w-4 shrink-0 opacity-50"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
					<span class="truncate">{item.title}</span>
				</button>
			{/each}
		</div>
	{:else}
		<div class="px-3 py-4 text-center">
			<p class="text-xs text-content-dim/40">No matching notes found</p>
		</div>
	{/if}
</div>
