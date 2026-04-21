<script lang="ts">
	import Fuse from 'fuse.js';
	import { fade, fly } from 'svelte/transition';
	import Avatar from '../ui/Avatar.svelte';
	import type { ListItem } from '$lib/services/resourceService';

	let {
		trigger = '@',
		items = [],
		onSelect,
		onClose
	} = $props<{
		trigger: string;
		items: ListItem[];
		onSelect: (item: ListItem) => void;
		onClose: () => void;
	}>();

	let searchQuery = $state('');
	let selectedIndex = $state(0);
	let fuse: Fuse<ListItem> | null = $state(null);

	// Derived filtered items based on fuzzy search
	const filteredItems = $derived.by(() => {
		if (!searchQuery) return items.slice(0, 8);
		if (!fuse)
			return items
				.filter((i: ListItem) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
				.slice(0, 8);

		return fuse
			.search(searchQuery)
			.map((r) => r.item)
			.slice(0, 8);
	});

	$effect(() => {
		if (items.length > 0) {
			fuse = new Fuse(items, {
				keys: ['name', 'subtitle'],
				threshold: 0.3
			});
		}
	});

	$effect(() => {
		// Reset selection when results change
		if (filteredItems.length > 0) {
			selectedIndex = Math.min(selectedIndex, filteredItems.length - 1);
		}
	});

	export function handleKeydown(e: KeyboardEvent) {
		if (filteredItems.length === 0) return false;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % filteredItems.length;
			return true;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
			return true;
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			e.preventDefault();
			if (filteredItems[selectedIndex]) {
				onSelect(filteredItems[selectedIndex]);
			}
			return true;
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return true;
		}
		return false;
	}

	export function updateSearch(query: string) {
		searchQuery = query;
		selectedIndex = 0;
	}
</script>

<div
	transition:fly={{ y: 10, duration: 200 }}
	class="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-xl border border-stroke bg-surface shadow-2xl backdrop-blur-md"
>
	<div class="flex items-center justify-between border-b border-stroke bg-surface-dim/50 px-3 py-2">
		<span class="text-[10px] font-black tracking-widest text-content-dim uppercase">
			Mentioning {trigger === '@'
				? 'People'
				: trigger === '#'
					? 'Channels'
					: trigger === '!'
						? 'Snippets'
						: 'Notes'}
		</span>
		{#if searchQuery}
			<span class="animate-pulse text-[10px] text-brand-orange">Searching: {searchQuery}...</span>
		{/if}
	</div>

	<div class="scrollbar-hide max-h-64 overflow-y-auto p-1">
		{#if filteredItems.length === 0}
			<div class="px-4 py-8 text-center">
				<p class="text-xs text-content-dim">No matches found for "{searchQuery}"</p>
			</div>
		{:else}
			{#each filteredItems as item, i (item.id)}
				<button
					onclick={() => onSelect(item)}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all {i ===
					selectedIndex
						? 'bg-brand-orange/10 text-brand-orange shadow-inner ring-1 ring-brand-orange/20'
						: 'text-content-dim hover:bg-surface-dim hover:text-content'}"
				>
					<div class="relative shrink-0">
						{#if item.type === 'user'}
							<Avatar name={item.name} src={item.avatar} size="xs" />
						{:else}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-dim text-lg"
							>
								{item.icon || (item.type === 'note' ? '📝' : item.type === 'snip' ? '✂️' : '#')}
							</div>
						{/if}
					</div>

					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="truncate text-xs font-bold">{item.name}</span>
							{#if item.type === 'snip' && item.subtitle}
								<span
									class="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[8px] font-black text-zinc-400 uppercase"
								>
									{item.subtitle}
								</span>
							{/if}
						</div>
						{#if item.subtitle && item.type !== 'snip'}
							<span class="truncate text-[10px] opacity-60">{item.subtitle}</span>
						{/if}
					</div>

					{#if i === selectedIndex}
						<div in:fade class="text-[10px] font-bold text-brand-orange/40">Enter ↩</div>
					{/if}
				</button>
			{/each}
		{/if}
	</div>
</div>
