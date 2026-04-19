<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import SearchFilters from '$lib/components/search/SearchFilters.svelte';
	import SearchHighlight from '$lib/components/search/SearchHighlight.svelte';
	import { fade, slide } from 'svelte/transition';
	import { onMount } from 'svelte';

	/**
	 * Advanced Search Page
	 * Implements Phase 8 Search & Discovery features.
	 */

	interface SearchResult {
		id: string;
		result_type: 'message' | 'note' | 'snippet';
		title: string;
		preview: string;
		author_name: string;
		author_avatar: string;
		workspace_name: string;
		channel_name?: string;
		channel_id?: string;
		created_at: string;
		rank: number;
	}

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let isLoading = $state(false);
	let searchHistory = $state<string[]>([]);
	let selectedIndex = $state(-1);
	let filters = $state({
		type: 'all',
		authorId: '',
		channelId: '',
		dateRange: 'all'
	});

	let searchInput = $state<HTMLInputElement>();

	const slug = $derived(page.params.slug);

	async function performSearch() {
		if (!query.trim()) {
			results = [];
			return;
		}

		isLoading = true;
		try {
			const searchParams = new URLSearchParams({
				q: query,
				type: filters.type,
				authorId: filters.authorId,
				channelId: filters.channelId,
				dateRange: filters.dateRange
			});

			const res = await fetch(`/api/workspace/${slug}/search?${searchParams.toString()}`);
			if (!res.ok) throw new Error('Search request failed');

			const data = await res.json();
			results = data.results || [];
			selectedIndex = -1; // Reset selection on new search
			if (results.length > 0) {
				saveToHistory(query);
			}
		} catch (err) {
			console.error('[Search Page] Search failed:', err);
		} finally {
			isLoading = false;
		}
	}

	function saveToHistory(q: string) {
		if (!q.trim() || q.length < 3) return;
		searchHistory = [q, ...searchHistory.filter((h) => h !== q)].slice(0, 8);
		localStorage.setItem(`neurohub-search-history-${slug}`, JSON.stringify(searchHistory));
	}

	function clearHistory() {
		searchHistory = [];
		localStorage.removeItem(`neurohub-search-history-${slug}`);
	}

	// Debounce search to prevent excessive API calls
	let timeout: ReturnType<typeof setTimeout>;
	$effect(() => {
		// Reactive to query or filters change
		const _q = query;
		const _f = filters.type + filters.authorId + filters.channelId + filters.dateRange;

		clearTimeout(timeout);
		timeout = setTimeout(performSearch, 300);
	});

	onMount(() => {
		const stored = localStorage.getItem(`neurohub-search-history-${slug}`);
		if (stored) {
			searchHistory = JSON.parse(stored);
		}
		// Programmatically focus the search input for better UX
		searchInput?.focus();
	});

	function getResultHref(result: SearchResult) {
		switch (result.result_type) {
			case 'message':
				return `/workspace/${slug}/chat/${result.channel_id}`;
			case 'note':
				return `/workspace/${slug}/notes/${result.id}`;
			case 'snippet':
				return `/workspace/${slug}/snippets`;
			default:
				return `/workspace/${slug}`;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (results.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter' && selectedIndex >= 0) {
			e.preventDefault();
			const href = getResultHref(results[selectedIndex]);
			window.location.href = href;
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="flex h-full flex-col overflow-hidden bg-surface">
	<!-- Search Header: Prominent Input Area -->
	<header class="border-b border-stroke bg-surface-dim/30 px-8 py-12">
		<div class="mx-auto max-w-5xl">
			<div class="mb-8 flex items-end justify-between">
				<div>
					<h1 class="text-4xl font-black tracking-tighter text-content">Discovery Engine</h1>
					<p class="mt-2 text-sm font-medium text-zinc-500 italic">
						Searching in <span class="font-bold text-brand-orange"
							>{$workspaceStore.currentWorkspace?.name}</span
						>
					</p>
				</div>
				<div class="hidden text-right md:block">
					<p class="text-[10px] font-black tracking-[4px] text-zinc-700 uppercase">NeuroHub v1.0</p>
				</div>
			</div>

			<div class="group relative">
				<div
					class="absolute inset-y-0 left-6 flex items-center text-zinc-600 transition-colors group-focus-within:text-brand-orange"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
				<input
					bind:this={searchInput}
					bind:value={query}
					type="text"
					placeholder="Search for messages, notes, code snippets..."
					class="w-full rounded-2xl border border-stroke bg-surface-dim/40 py-6 pr-8 pl-16 text-2xl font-medium text-content transition-all outline-none placeholder:text-content-dim/50 focus:border-brand-orange/50 focus:bg-surface-dim focus:ring-8 focus:ring-brand-orange/5"
				/>
				{#if isLoading}
					<div class="absolute top-1/2 right-6 -translate-y-1/2" in:fade>
						<div
							class="h-7 w-7 animate-spin rounded-full border-2 border-brand-orange border-t-transparent shadow-neon-orange"
						></div>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<!-- Search Body: Sidebar + Main Stream -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar Filters: Precise control -->
		<aside class="scrollbar-none w-85 overflow-y-auto border-r border-stroke bg-surface p-10">
			<SearchFilters bind:activeFilters={filters} />

			{#if searchHistory.length > 0}
				<div class="mt-12 border-t border-stroke pt-8" transition:slide>
					<div class="mb-4 flex items-center justify-between">
						<p class="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
							Recent Queries
						</p>
						<button
							onclick={clearHistory}
							class="text-[9px] font-bold text-zinc-700 uppercase hover:text-brand-orange"
							>Clear</button
						>
					</div>
					<div class="space-y-1">
						{#each searchHistory as h (h)}
							<button
								onclick={() => (query = h)}
								class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition-all hover:bg-zinc-900 hover:text-white"
							>
								<svg
									class="h-3 w-3 opacity-50"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span class="truncate">{h}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</aside>

		<!-- Main Results Stream -->
		<main
			class="scrollbar-none flex-1 overflow-y-auto bg-linear-to-b from-surface-dim/20 to-surface px-10 py-12"
		>
			<div class="mx-auto max-w-4xl">
				{#if results.length > 0}
					<div class="mb-8 flex items-center justify-between border-b border-stroke pb-4">
						<p class="text-xs font-black tracking-[2px] text-zinc-500 uppercase">
							{results.length} Matches Found
						</p>
						<div class="flex gap-2">
							<span class="rounded bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-600"
								>RANKED BY RELEVANCE</span
							>
						</div>
					</div>

					<div class="grid gap-6">
						{#each results as result, i (result.id + result.result_type)}
							<a
								href={resolve(getResultHref(result) as unknown as '/')}
								class="group relative block overflow-hidden rounded-3xl border transition-all
									{i === selectedIndex
									? 'border-brand-orange bg-surface-dim shadow-neon-orange ring-2 ring-brand-orange/20'
									: 'border-stroke bg-surface-dim/40'} 
									p-8 hover:border-brand-orange/40 hover:bg-surface-dim hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
								in:fade={{ duration: 300 }}
								onmouseenter={() => (selectedIndex = i)}
							>
								<!-- Hover Glow Decor -->
								<div
									class="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-brand-orange/5 opacity-0 blur-3xl transition-opacity group-hover:opacity-100"
								></div>

								<div class="relative flex items-start justify-between">
									<div class="flex items-start gap-5">
										<!-- Typed Icon -->
										<div
											class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500 transition-all group-hover:bg-brand-orange group-hover:text-white group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]"
										>
											{#if result.result_type === 'message'}
												<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="1.5"
														d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
													/>
												</svg>
											{:else if result.result_type === 'note'}
												<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="1.5"
														d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
													/>
												</svg>
											{:else}
												<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="1.5"
														d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
													/>
												</svg>
											{/if}
										</div>

										<div class="overflow-hidden">
											<div class="flex items-center gap-3">
												<h3
													class="truncate text-lg font-black text-content transition-all group-hover:text-brand-orange"
												>
													{result.title}
												</h3>
												<span
													class="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[9px] font-black tracking-tighter text-zinc-500 uppercase"
												>
													{result.result_type}
												</span>
											</div>
											<div
												class="mt-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-zinc-600 uppercase"
											>
												{#if result.channel_name}
													<span class="text-brand-blue">#{result.channel_name}</span>
													<span>·</span>
												{/if}
												<span>{result.author_name}</span>
												<span>·</span>
												<span
													>{new Date(result.created_at).toLocaleDateString(undefined, {
														month: 'short',
														day: 'numeric',
														year: 'numeric'
													})}</span
												>
											</div>
										</div>
									</div>
								</div>

								<div
									class="mt-6 border-l-2 border-stroke pl-6 transition-colors group-hover:border-brand-orange/30"
								>
									<SearchHighlight
										text={result.preview}
										class="text-sm leading-relaxed font-medium"
									/>
								</div>

								<div class="mt-6 flex justify-end">
									<span
										class="flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-700 uppercase transition-colors group-hover:text-brand-orange"
									>
										View Details
										<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M14 5l7 7m0 0l-7 7m7-7H3"
											/>
										</svg>
									</span>
								</div>
							</a>
						{/each}
					</div>
				{:else if query && !isLoading}
					<div
						class="flex flex-col items-center justify-center py-32 text-center"
						in:fade={{ duration: 400 }}
					>
						<div
							class="mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-surface-dim text-content-dim shadow-inner"
						>
							<svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1"
									d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h3 class="text-3xl font-black tracking-tight text-content italic">
							" {query} " yielded nothing.
						</h3>
						<p class="mt-3 max-w-sm text-lg leading-relaxed font-medium text-zinc-600">
							NeuroHub scanned through all vectors and keywords, but couldn't find a match in the
							current index.
						</p>
						<button
							onclick={() =>
								(filters = { type: 'all', authorId: '', channelId: '', dateRange: 'all' })}
							class="mt-10 rounded-xl bg-zinc-900 px-8 py-3 text-xs font-black tracking-[3px] text-zinc-400 uppercase transition-all hover:bg-zinc-800 hover:text-brand-orange"
						>
							Reset All Filters
						</button>
					</div>
				{:else if !query}
					<div
						class="flex flex-col items-center justify-center py-32 text-center text-zinc-700"
						in:fade
					>
						<div class="mb-8 flex h-40 w-40 items-center justify-center opacity-20">
							<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="0.5"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<p class="max-w-xs text-xl leading-relaxed font-medium italic">
							Search is indexed and ready. Enter keyword above to begin workspace-wide exploration.
						</p>
						<div class="mt-8 flex gap-6">
							<div
								class="flex items-center gap-2 text-[10px] font-black tracking-widest text-content-dim uppercase"
							>
								<span class="rounded bg-surface-dim px-2 py-1">ALL MESSAGES</span>
							</div>
							<div
								class="flex items-center gap-2 text-[10px] font-black tracking-widest text-content-dim uppercase"
							>
								<span class="rounded bg-surface-dim px-2 py-1">ALL NOTES</span>
							</div>
							<div
								class="flex items-center gap-2 text-[10px] font-black tracking-widest text-content-dim uppercase"
							>
								<span class="rounded bg-surface-dim px-2 py-1">ALL SNIPPETS</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</main>
	</div>
</div>

<style>
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
