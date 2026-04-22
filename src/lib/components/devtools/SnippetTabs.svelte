<script lang="ts">
	import { openSnippetTabs, activeSnippetId, closeTab } from '$lib/stores/devToolsStore';
	import { snippetService } from '$lib/services/snippets';
	import { untrack, onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	// We need titles for the tabs, so we might need a local cache of snippet metadata
	let tabMetadata = $state<Record<string, { title: string; language: string }>>({});

	async function fetchMetadata(id: string) {
		if (id === 'new') {
			untrack(() => {
				tabMetadata = { ...tabMetadata, [id]: { title: 'New Snippet', language: 'javascript' } };
			});
			return;
		}
		// Guard: don't re-fetch if we already have this metadata
		if (untrack(() => tabMetadata[id])) return;
		try {
			const res = await snippetService.getById(id);
			if (res.data) {
				untrack(() => {
					tabMetadata = {
						...tabMetadata,
						[id]: { title: res.data!.title, language: res.data!.language }
					};
				});
			}
		} catch {
			untrack(() => {
				tabMetadata = { ...tabMetadata, [id]: { title: 'Unknown', language: 'txt' } };
			});
		}
	}

	$effect(() => {
		for (const id of $openSnippetTabs) {
			fetchMetadata(id);
		}
	});

	// Handle real-time updates from the browser
	onMount(() => {
		const handler = (e: CustomEvent<{ id: string; title: string; language: string }>) => {
			const { id, title, language } = e.detail;
			untrack(() => {
				tabMetadata = { ...tabMetadata, [id]: { title, language } };
			});
		};
		window.addEventListener('snippet-updated', handler as EventListener);
		return () => window.removeEventListener('snippet-updated', handler as EventListener);
	});

	function selectTab(id: string) {
		activeSnippetId.set(id);
	}

	function handleClose(e: MouseEvent, id: string) {
		e.stopPropagation();
		closeTab(id);
	}
</script>

<div
	class="scrollbar-none no-print flex h-9 w-full overflow-x-auto border-b border-stroke bg-surface-dim"
>
	{#each $openSnippetTabs as id (id)}
		<div
			role="tab"
			tabindex="0"
			class="group relative flex h-full max-w-[200px] min-w-[120px] cursor-pointer items-center gap-2 border-r border-stroke px-3 transition-colors
				{$activeSnippetId === id
				? 'bg-surface text-content'
				: 'text-content-dim hover:bg-surface/50 hover:text-content'}"
			onclick={() => selectTab(id)}
			onkeydown={(e) => e.key === 'Enter' && selectTab(id)}
		>
			<span class="flex-1 truncate text-left text-[11px] font-medium">
				{tabMetadata[id]?.title || 'Loading...'}
			</span>

			<button
				type="button"
				class="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface-dim"
				onclick={(e) => handleClose(e, id)}
				aria-label="Close tab"
			>
				<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>

			{#if $activeSnippetId === id}
				<div class="absolute right-0 bottom-0 left-0 h-0.5 bg-orange-500" in:fade></div>
			{/if}
		</div>
	{/each}
</div>

<style>
	::-webkit-scrollbar {
		display: none;
	}
</style>
