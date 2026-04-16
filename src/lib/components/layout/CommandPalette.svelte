<script lang="ts">
	import { uiStore } from '$lib/stores/uiStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import Fuse from 'fuse.js';
	import { onMount } from 'svelte';

	interface CommandItem {
		name: string;
		type: 'page' | 'feature' | 'action' | 'history';
		href: string;
		icon: string;
		description?: string;
	}

	const { commandPaletteOpen } = $derived($uiStore);
	const { currentWorkspace } = $derived($workspaceStore);

	let query = $state('');
	let selectedIndex = $state(0);
	let inputElement = $state<HTMLInputElement>();
	let history = $state<CommandItem[]>([]);

	// Static base commands
	const baseItems: CommandItem[] = [
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
		}
	];

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

	let results = $derived.by(() => {
		if (!query) return history.length > 0 ? history : allItems;
		return fuse.search(query).map((r) => r.item);
	});

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
			goto(resolve(item.href as unknown as '/'));
			close();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % results.length;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + results.length) % results.length;
		}

		if (e.key === 'Enter' && results[selectedIndex]) {
			e.preventDefault();
			executeCommand(results[selectedIndex]);
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
			'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
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
				{#if results.length > 0}
					<div class="space-y-1">
						{#if !query && history.length > 0}
							<p class="px-3 py-2 text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
								Recent Results
							</p>
						{/if}

						{#each results as item, i (item.href + i)}
							<button
								class="group flex w-full items-center gap-4 rounded-xl p-3 text-left transition-all
									{i === selectedIndex ? 'bg-surface-dim ring-1 ring-stroke' : 'hover:bg-surface-dim/40'}"
								onclick={() => executeCommand(item)}
								onmouseenter={() => (selectedIndex = i)}
							>
								<div
									class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 transition-colors group-hover:bg-zinc-800 group-hover:text-brand-orange"
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
									<p class="text-sm leading-tight font-bold text-content">{item.name}</p>
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
				class="flex items-center justify-between border-t border-zinc-900 bg-zinc-900/30 px-4 py-3 text-[10px] text-zinc-500"
			>
				<div class="flex gap-4">
					<span class="flex items-center gap-1.5"
						><kbd class="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5">↑↓</kbd> navigate</span
					>
					<span class="flex items-center gap-1.5"
						><kbd class="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5">↵</kbd> select</span
					>
					<span class="flex items-center gap-1.5"
						><kbd class="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5">esc</kbd> close</span
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
