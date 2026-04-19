<script lang="ts">
	import { uiStore } from '$lib/stores/uiStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import Fuse from 'fuse.js';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/services/supabase';

	interface CommandItem {
		name: string;
		type: 'page' | 'feature' | 'action' | 'history' | 'semantic' | 'keyword';
		href: string;
		icon: string;
		description?: string;
		similarity?: number;
	}

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

	interface SemanticMessageResult {
		id: string;
		content: string;
		channel_id: string;
		user_id: string;
		similarity: number;
	}

	interface SemanticNoteResult {
		id: string;
		title: string;
		content_text: string;
		similarity: number;
	}

	const { commandPaletteOpen } = $derived($uiStore);
	const { currentWorkspace } = $derived($workspaceStore);

	let query = $state('');
	let selectedIndex = $state(0);
	let inputElement = $state<HTMLInputElement>();
	let history = $state<CommandItem[]>([]);

	// Static base commands
	const baseItems = $derived<CommandItem[]>([
		{
			name: 'Go to Dashboard',
			type: 'page',
			href: '/dashboard',
			icon: 'grid',
			description: 'View all your workspaces'
		},
		{
			name: 'Theme Settings',
			type: 'action',
			href: '#',
			icon: 'moon',
			description: 'Switch between light and dark modes'
		},
		{
			name: 'Invite Members',
			type: 'action',
			href: '#',
			icon: 'users',
			description: 'Add new people to this workspace'
		},
		{
			name: 'Advanced Search',
			type: 'page',
			href: currentWorkspace ? `/workspace/${currentWorkspace.slug}/search` : '#',
			icon: 'search',
			description: 'Detailed workspace-wide discovery'
		}
	]);

	// Workspace-specific commands
	const workspaceItems = $derived<CommandItem[]>(
		currentWorkspace
			? [
					{
						name: 'Chat Channels',
						type: 'feature',
						href: `/workspace/${currentWorkspace.slug}/chat`,
						icon: 'message',
						description: 'Discussion channels'
					},
					{
						name: 'Knowledge Base',
						type: 'feature',
						href: `/workspace/${currentWorkspace.slug}/notes`,
						icon: 'book',
						description: 'Docs and notes'
					},
					{
						name: 'Code Snippets',
						type: 'feature',
						href: `/workspace/${currentWorkspace.slug}/snippets`,
						icon: 'code',
						description: 'Reusable code blocks'
					},
					{
						name: 'API Workbench',
						type: 'feature',
						href: `/workspace/${currentWorkspace.slug}/snippets?tab=api`,
						icon: 'zap',
						description: 'Test and debug APIs'
					},
					{
						name: 'Code Sandbox',
						type: 'feature',
						href: `/workspace/${currentWorkspace.slug}/snippets?tab=sandbox`,
						icon: 'play',
						description: 'Interactive code scratchpad'
					},
					{
						name: 'JSON Utility',
						type: 'feature',
						href: `/workspace/${currentWorkspace.slug}/snippets?tab=json`,
						icon: 'database',
						description: 'Format and inspect JSON'
					},
					{
						name: 'Workspace Settings',
						type: 'page',
						href: `/workspace/${currentWorkspace.slug}/settings`,
						icon: 'settings',
						description: 'Manage this workspace'
					}
				]
			: []
	);

	const allItems = $derived([...baseItems, ...workspaceItems]);

	const fuse = $derived(
		new Fuse(allItems, {
			keys: ['name', 'type', 'description'],
			threshold: 0.4
		})
	);

	let results = $state<CommandItem[]>([]);
	let semanticResults = $state<CommandItem[]>([]);
	let keywordResults = $state<CommandItem[]>([]);
	let isSearchingSemantically = $state(false);
	let isSearchingKeywords = $state(false);

	$effect(() => {
		if (!query) {
			results = history.length > 0 ? history : allItems;
			semanticResults = [];
			return;
		}

		results = fuse.search(query).map((r) => r.item);
		performSemanticSearch(query);
		performKeywordSearch(query);
	});

	let searchTimeout: ReturnType<typeof setTimeout>;
	let keywordTimeout: ReturnType<typeof setTimeout>;

	async function performKeywordSearch(q: string) {
		if (q.length < 2 || !currentWorkspace) {
			keywordResults = [];
			return;
		}

		clearTimeout(keywordTimeout);
		keywordTimeout = setTimeout(async () => {
			isSearchingKeywords = true;
			try {
				const res = await fetch(
					`/api/workspace/${currentWorkspace.slug}/search?q=${encodeURIComponent(q)}&limit=5`
				);
				const data = await res.json();

				if (data.results) {
					keywordResults = data.results.map((r: SearchResult) => ({
						name: r.title,
						type: 'keyword',
						href:
							r.result_type === 'message'
								? `/workspace/${currentWorkspace.slug}/chat/${r.channel_id}`
								: r.result_type === 'note'
									? `/workspace/${currentWorkspace.slug}/notes/${r.id}`
									: `/workspace/${currentWorkspace.slug}/snippets`,
						icon:
							r.result_type === 'message' ? 'message' : r.result_type === 'note' ? 'book' : 'code',
						description: `${r.result_type.toUpperCase()} · ${r.preview
							.replace(/<mark>/g, '')
							.replace(/<\/mark>/g, '')
							.slice(0, 60)}...`
					}));
				}
			} catch (e) {
				console.error('Keyword search failed:', e);
			} finally {
				isSearchingKeywords = false;
			}
		}, 300);
	}
	async function performSemanticSearch(q: string) {
		if (q.length < 3 || !currentWorkspace) return;

		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(async () => {
			isSearchingSemantically = true;
			try {
				// 1. Generate Query Embedding via local API
				const embedRes = await fetch('/api/ai/embed', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text: q })
				})
					.then((r) => r.json())
					.catch(() => null);

				if (!embedRes?.embedding) return;
				const embedding = embedRes.embedding;

				// 2. Query Postgres Vector Functions
				const [msgRes, noteRes] = await Promise.all([
					supabase.rpc('match_messages', {
						query_embedding: embedding,
						match_threshold: 0.7,
						match_count: 3,
						p_workspace_id: currentWorkspace.id
					}),
					supabase.rpc('match_notes', {
						query_embedding: embedding,
						match_threshold: 0.7,
						match_count: 3,
						p_workspace_id: currentWorkspace.id
					})
				]);

				const newSemantics: CommandItem[] = [];

				((msgRes.data as unknown as SemanticMessageResult[]) || []).forEach((m) => {
					newSemantics.push({
						name: m.content.slice(0, 50),
						type: 'semantic',
						href: `/workspace/${currentWorkspace.slug}/chat/${m.channel_id}`,
						icon: 'message',
						description: `Message · ${Math.round(m.similarity * 100)}% match`,
						similarity: m.similarity
					});
				});

				((noteRes.data as unknown as SemanticNoteResult[]) || []).forEach((n) => {
					newSemantics.push({
						name: n.title,
						type: 'semantic',
						href: `/workspace/${currentWorkspace.slug}/notes/${n.id}`,
						icon: 'book',
						description: `Note · ${Math.round(n.similarity * 100)}% match`,
						similarity: n.similarity
					});
				});

				semanticResults = newSemantics.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
			} catch (e) {
				console.error('Semantic search failed:', e);
			} finally {
				isSearchingSemantically = false;
			}
		}, 600);
	}

	const combinedResults = $derived([...results, ...keywordResults, ...semanticResults]);

	// Reset index when query or results change
	$effect(() => {
		if (query !== undefined || results !== undefined) {
			selectedIndex = 0;
		}
	});

	// Focus management
	$effect(() => {
		if (commandPaletteOpen && inputElement) {
			inputElement.focus();
		}
	});

	onMount(() => {
		const stored = localStorage.getItem('neurohub-search-history');
		if (stored) {
			history = JSON.parse(stored);
		}
	});

	function close() {
		uiStore.setCommandPaletteOpen(false);
		query = '';
	}

	function executeCommand(item: CommandItem) {
		// Save to history (deduplicated)
		const newHistory = [
			{ ...item, type: 'history' as const },
			...history.filter((h) => h.href !== item.href)
		].slice(0, 5);

		history = newHistory;
		localStorage.setItem('neurohub-search-history', JSON.stringify(newHistory));

		if (item.type === 'action') {
			if (item.name === 'Invite Members') uiStore.setInviteModalOpen(true);
			close();
		} else {
			const targetHref = resolve(item.href as unknown as '/');

			// If it's a devtool tab, we might want to update the store directly if already on page
			if (item.href.includes('?tab=')) {
				const url = new URL(item.href, window.location.origin);
				const tab = url.searchParams.get('tab');
				if (tab) {
					import('$lib/stores/devToolsStore').then(({ activeTab }) => {
						activeTab.set(tab as 'snippets' | 'api' | 'sandbox' | 'json');
					});
				}
			}

			goto(targetHref);
			close();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % combinedResults.length;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + combinedResults.length) % combinedResults.length;
		}

		if (e.key === 'Enter' && combinedResults[selectedIndex]) {
			e.preventDefault();
			executeCommand(combinedResults[selectedIndex]);
		}
	}

	const iconPaths: Record<string, string> = {
		grid: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
		moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
		users:
			'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		message:
			'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
		book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
		code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
		settings:
			'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
		zap: 'M13 10V3L4 14h7v7l9-11h-7z',
		play: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
		database:
			'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
	};
</script>

<svelte:window onkeydown={(e) => commandPaletteOpen && handleKeydown(e)} />

{#if commandPaletteOpen}
	<!-- Overlay -->
	<div
		class="fixed inset-0 z-100 flex items-start justify-center bg-black/80 pt-[15vh] backdrop-blur-sm"
		onclick={close}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
	>
		<!-- Palette Surface -->
		<div
			class="glass w-full max-w-xl overflow-hidden rounded-2xl border border-stroke shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="none"
			transition:fly={{ y: -20, duration: 400, easing: cubicOut }}
		>
			<!-- Search Input -->
			<div class="flex items-center border-b border-zinc-900 px-4">
				<svg class="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					bind:this={inputElement}
					bind:value={query}
					type="text"
					placeholder="Search workspaces, channels, or commands..."
					class="w-full bg-transparent px-4 py-6 text-base text-content outline-none placeholder:text-content-dim/50"
				/>
			</div>

			<!-- Results List -->
			<div class="scrollbar-none max-h-[60vh] overflow-y-auto p-2">
				{#if combinedResults.length > 0}
					<div class="space-y-1">
						{#if !query && history.length > 0}
							<p class="px-3 py-2 text-[10px] font-bold tracking-widest text-content-dim uppercase">
								Recent Results
							</p>
						{/if}

						{#each combinedResults as item, i (item.href + i)}
							<button
								class="group flex w-full items-center gap-4 rounded-xl p-3 text-left transition-all
									{i === selectedIndex ? 'bg-surface-dim ring-1 ring-stroke' : 'hover:bg-surface-dim/40'}
									{item.type === 'semantic' ? 'border-l-2 border-brand-orange/40 bg-brand-orange/5' : ''}
									{item.type === 'keyword' ? 'border-l-2 border-brand-blue/40 bg-brand-blue/5' : ''}"
								onclick={() => executeCommand(item)}
								onmouseenter={() => (selectedIndex = i)}
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stroke/50 bg-surface-dim text-content-dim transition-colors group-hover:bg-surface-dim/80 group-hover:text-brand-orange"
								>
									<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d={iconPaths[item.icon] || 'M12 4v16m8-8H4'}
										/>
									</svg>
								</div>
								<div class="flex-1 overflow-hidden">
									<div class="flex items-center gap-2">
										<p class="text-sm leading-tight font-bold text-content">{item.name}</p>
										{#if item.type === 'semantic'}
											<span
												class="text-[9px] font-black tracking-tighter text-brand-orange uppercase"
												>AI Match</span
											>
										{:else if item.type === 'keyword'}
											<span class="text-[9px] font-black tracking-tighter text-brand-blue uppercase"
												>Found in Content</span
											>
										{/if}
									</div>
									<p class="truncate text-[11px] text-content-dim">{item.description}</p>
								</div>
								{#if i === selectedIndex}
									<div class="ml-auto text-zinc-600" transition:fade>
										<kbd
											class="rounded border border-stroke bg-surface-dim px-1.5 py-0.5 font-mono text-[10px]"
											>ENTER</kbd
										>
									</div>
								{/if}
							</button>
						{/each}

						{#if isSearchingKeywords}
							<div class="flex animate-pulse items-center gap-3 px-4 py-3 text-content-dim">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-brand-blue border-t-transparent"
								></div>
								<span class="text-xs italic">Scanning workspace index...</span>
							</div>
						{/if}

						{#if isSearchingSemantically}
							<div class="flex animate-pulse items-center gap-3 px-4 py-3 text-content-dim">
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-brand-orange border-t-transparent"
								></div>
								<span class="text-xs italic">NeuroAI is scanning workspace meaning...</span>
							</div>
						{/if}
					</div>
				{:else}
					<div class="py-12 text-center text-zinc-500">
						<div class="mb-2 flex justify-center text-zinc-700">
							<svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1"
									d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<p class="text-sm italic">" {query} " yielded no results.</p>
						<p class="mt-1 text-xs">Try searching for channels, notes, or settings.</p>
					</div>
				{/if}
			</div>

			<!-- Footer Tips -->
			<div
				class="flex items-center justify-between border-t border-stroke bg-surface-dim/30 px-4 py-3 text-[10px] text-content-dim"
			>
				<div class="flex gap-4">
					<span class="flex items-center gap-1.5"
						><kbd class="rounded border border-stroke bg-surface-dim px-1 py-0.5">↑↓</kbd> navigate</span
					>
					<span class="flex items-center gap-1.5"
						><kbd class="rounded border border-stroke bg-surface-dim px-1 py-0.5">↵</kbd> select</span
					>
					<span class="flex items-center gap-1.5"
						><kbd class="rounded border border-stroke bg-surface-dim px-1 py-0.5">esc</kbd> close</span
					>
				</div>
				<div class="flex items-center gap-1">
					<span class="font-medium text-zinc-400">NeuroHub AI</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
