<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		snippetFilters,
		openInTab,
		activeSnippetId,
		refreshSnippetsTrigger
	} from '$lib/stores/devToolsStore';
	import { snippetService } from '$lib/services/snippets';
	import { toast } from '$lib/stores/toastStore';
	import type { SnippetsTable } from '$lib/types/db';

	let { workspaceId } = $props<{ workspaceId: string }>();

	let snippets = $state<
		(Omit<SnippetsTable['Row'], 'fts'> & {
			author?: { id: string; username: string | null; avatar_url: string | null };
		})[]
	>([]);
	let loading = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	async function loadSnippets() {
		if (!workspaceId) return;
		loading = true;
		try {
			// Sidebar shows ALL snippets — no toolbox filter here
			const res = await snippetService.list(workspaceId, {
				search: $snippetFilters.search || undefined,
				limit: 50,
				sort: 'recent'
			});
			if (res.data) {
				snippets = res.data;
			}
		} catch {
			toast.show('Failed to load snippets', 'error');
		}
		loading = false;
	}

	function handleSearch(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		$snippetFilters.search = val;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(loadSnippets, 300);
	}

	onMount(() => {
		loadSnippets();
	});

	// Reload when workspaceId changes or a manual refresh is triggered
	$effect(() => {
		const ws = workspaceId;
		const trigger = $refreshSnippetsTrigger;
		if (ws || trigger >= 0) {
			untrack(() => loadSnippets());
		}
	});
</script>

<div class="flex h-full flex-col">
	<div class="p-3">
		<div class="relative">
			<svg
				class="absolute top-2.5 left-3 h-4 w-4 text-content-dim/40"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
			<input
				type="text"
				placeholder="Search snippets..."
				class="w-full rounded-md border border-stroke bg-surface-dim py-2 pr-3 pl-9 text-xs text-content outline-none focus:border-orange-500/50"
				value={$snippetFilters.search}
				oninput={handleSearch}
			/>
		</div>
	</div>

	<div class="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
		{#if loading && snippets.length === 0}
			{#each Array(5) as _, i (i)}
				<div class="mb-1 h-10 animate-pulse rounded-md bg-surface-dim/50"></div>
			{/each}
		{:else if snippets.length === 0}
			<div class="py-10 text-center text-xs text-content-dim italic">No snippets found</div>
		{:else}
			{#each snippets as snippet (snippet.id)}
				<button
					class="group flex w-full flex-col gap-0.5 rounded-md p-2 text-left transition-colors
						{$activeSnippetId === snippet.id
						? 'bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20'
						: 'text-content-dim hover:bg-surface-dim/50 hover:text-content'}"
					onclick={() => openInTab(snippet.id)}
				>
					<div class="flex items-center justify-between">
						<span class="truncate text-xs font-semibold">{snippet.title}</span>
						<span class="text-[9px] tracking-tighter uppercase opacity-50">{snippet.language}</span>
					</div>
					{#if snippet.description}
						<span class="truncate text-[10px] opacity-60">
							{snippet.description}
						</span>
					{/if}
				</button>
			{/each}
		{/if}
	</div>

	<div class="border-t border-stroke p-3">
		<button
			class="flex w-full items-center justify-center gap-2 rounded-md border border-stroke bg-surface-dim py-2 text-xs font-bold text-content-dim transition-colors hover:bg-surface hover:text-content"
			onclick={() => openInTab('new')}
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			New Snippet
		</button>
	</div>
</div>
