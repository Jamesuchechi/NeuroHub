<script lang="ts">
	import { onMount } from 'svelte';
	import {
		snippetFilters,
		starredIds,
		openSnippetId,
		toggleStarLocal
	} from '$lib/stores/devToolsStore';
	import { snippetService } from '$lib/services/snippets';
	import SnippetCard from './SnippetCard.svelte';
	import SnippetModal from './SnippetModal.svelte';
	import { authStore } from '$lib/stores/authStore';
	import { toast } from '$lib/stores/toastStore';
	import type { SnippetsTable } from '$lib/types/db';

	let { workspaceId, initialSnippets = [] } = $props<{
		workspaceId: string;
		initialSnippets?: (SnippetsTable['Row'] & {
			author?: { username: string | null; avatar_url: string | null };
			parent?: { id: string; title: string };
		})[];
	}>();

	let snippets = $state<
		(SnippetsTable['Row'] & {
			author?: { username: string | null; avatar_url: string | null };
			parent?: { id: string; title: string };
		})[]
	>([]);

	$effect(() => {
		snippets = [...initialSnippets];
	});
	let loading = $state(false);
	let hasMore = $state(true);
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	let modalMode = $state<'create' | 'edit' | 'view'>('view');
	let editingSnippet = $state<
		| (Partial<SnippetsTable['Row']> & {
				author?: { username: string | null; avatar_url: string | null };
				parent?: { id: string; title: string };
		  })
		| null
	>(null);

	let user = $derived($authStore.user);

	// Derive active snippet from ID
	let activeSnippet = $derived(
		$openSnippetId ? snippets.find((s) => s.id === $openSnippetId) : null
	);

	async function loadSnippets(reset = false) {
		loading = true;
		try {
			const cursor = reset ? undefined : snippets[snippets.length - 1]?.created_at;
			const res = await snippetService.list(workspaceId, {
				language: $snippetFilters.language || undefined,
				tags: $snippetFilters.tags.length > 0 ? $snippetFilters.tags : undefined,
				authorId: $snippetFilters.authorId || undefined,
				search: $snippetFilters.search || undefined,
				sort: $snippetFilters.sort,
				limit: 20,
				cursor
			});
			if (res.data) {
				snippets = reset ? res.data : [...snippets, ...res.data];
				hasMore = res.data.length === 20;
			}
		} catch {
			toast.show('Failed to load snippets', 'error');
		}
		loading = false;
	}

	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		$snippetFilters.search = target.value;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			loadSnippets(true);
		}, 300);
	}

	async function handleStar(id: string) {
		if (!user) return;
		toggleStarLocal(id);

		// Update local count optimistically
		snippets = snippets.map((s) => {
			if (s.id === id) {
				return {
					...s,
					star_count: $starredIds.has(id) ? s.star_count + 1 : Math.max(0, s.star_count - 1)
				};
			}
			return s;
		});

		try {
			await snippetService.toggleStar(id, user.id);
		} catch {
			// Revert optimistic
			toggleStarLocal(id);
			toast.show('Failed to star snippet', 'error');
		}
	}

	async function handleFork(id: string) {
		if (!user) return;
		try {
			const res = await snippetService.fork(id, user.id, workspaceId);
			if (res.data) {
				toast.show('Snippet forked successfully!', 'success');
				// Refresh or prepend
				snippets = [res.data, ...snippets];
			}
		} catch {
			toast.show('Failed to fork snippet', 'error');
		}
	}

	function handleCopy(code: string) {
		navigator.clipboard.writeText(code);
		toast.show('Copied to clipboard', 'success');
	}

	async function handleSaveModal(
		data: Omit<SnippetsTable['Insert'], 'workspace_id' | 'author_id'>
	) {
		if (!user) return;
		try {
			if (modalMode === 'create') {
				const res = await snippetService.create({
					workspace_id: workspaceId,
					author_id: user.id,
					...data
				});
				if (res.data) {
					toast.show('Snippet created', 'success');
					snippets = [res.data, ...snippets];
				}
			} else if (modalMode === 'edit' && editingSnippet?.id) {
				const snippetId = editingSnippet.id;
				const res = await snippetService.update(snippetId, data);
				if (res.data) {
					toast.show('Snippet updated', 'success');
					snippets = snippets.map((s) => (s.id === snippetId ? { ...s, ...res.data } : s));
				}
			}
			$openSnippetId = null;
			editingSnippet = null;
		} catch {
			toast.show('Failed to save snippet', 'error');
		}
	}

	function openCreateModal() {
		editingSnippet = {
			title: '',
			code: '',
			language: 'javascript',
			description: '',
			tags: [],
			visibility: 'workspace'
		};
		modalMode = 'create';
		$openSnippetId = 'new';
	}

	function openViewModal(snippet: SnippetsTable['Row']) {
		modalMode = 'view';
		$openSnippetId = snippet.id;
	}

	// Handle scroll for infinite load
	function handleScroll(e: Event) {
		const el = e.target as HTMLElement;
		if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && !loading && hasMore) {
			loadSnippets(false);
		}
	}

	onMount(() => {
		if (user) {
			snippetService.getStarredIds(user.id, workspaceId).then((ids) => {
				$starredIds = new Set(ids);
			});
		}
	});

	$effect(() => {
		// Re-fetch when sort changes
		const _sort = $snippetFilters.sort;
		if (typeof window !== 'undefined') {
			loadSnippets(true);
		}
	});
</script>

<div class="flex h-full flex-col pt-4">
	<!-- Top Bar -->
	<div class="mb-4 flex shrink-0 items-center justify-between gap-4 px-6">
		<div class="relative max-w-md flex-1">
			<svg
				class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				></path></svg
			>
			<input
				type="text"
				class="bg-muted/50 border-border focus:ring-primary w-full rounded-lg border py-2 pr-4 pl-9 text-sm focus:ring-1 focus:outline-none"
				placeholder="Search snippets..."
				value={$snippetFilters.search}
				oninput={handleSearchInput}
			/>
		</div>

		<div class="flex items-center gap-2">
			<select
				bind:value={$snippetFilters.sort}
				class="bg-card border-border focus:border-primary rounded-lg border px-3 py-2 text-sm outline-none"
			>
				<option value="recent">Recently Added</option>
				<option value="stars">Most Starred</option>
				<option value="forks">Most Forked</option>
			</select>

			<div class="bg-muted/50 border-border flex rounded-lg border p-1">
				<button
					class="rounded p-1.5 {$snippetFilters.view === 'grid'
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => ($snippetFilters.view = 'grid')}
					aria-label="Grid view"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
						></path></svg
					>
				</button>
				<button
					class="rounded p-1.5 {$snippetFilters.view === 'list'
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => ($snippetFilters.view = 'list')}
					aria-label="List view"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						></path></svg
					>
				</button>
			</div>

			<button
				class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
				onclick={openCreateModal}
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"
					></path></svg
				>
				New Snippet
			</button>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto px-6 pb-6" onscroll={handleScroll}>
		{#if snippets.length === 0 && !loading}
			<div
				class="text-muted-foreground flex h-full flex-col items-center justify-center py-20 text-center"
			>
				<svg class="mb-4 h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
					/></svg
				>
				<h3 class="text-foreground mb-1 text-lg font-semibold">No snippets found</h3>
				<p class="mb-6 max-w-sm text-sm">
					Create your first code snippet to start building your team's knowledge library.
				</p>
				<button
					class="border-border bg-card hover:bg-muted text-foreground rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition"
					onclick={openCreateModal}
				>
					Create Snippet
				</button>
			</div>
		{:else}
			<div
				class={$snippetFilters.view === 'grid'
					? 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
					: 'flex flex-col gap-3'}
			>
				{#each snippets as snippet (snippet.id)}
					<SnippetCard
						{snippet}
						isStarred={$starredIds.has(snippet.id)}
						view={$snippetFilters.view}
						onclick={() => openViewModal(snippet)}
						oncopy={handleCopy}
						onfork={handleFork}
						onstar={handleStar}
					/>
				{/each}

				{#if loading}
					{#each Array(4) as _, i (i)}
						<div
							class="border-border bg-card flex h-40 animate-pulse flex-col gap-3 rounded-xl border p-4"
						>
							<div class="bg-muted h-5 w-2/3 rounded"></div>
							<div class="bg-muted h-4 w-full rounded"></div>
							<div class="bg-muted h-4 w-4/5 rounded"></div>
							<div class="bg-muted mt-auto h-6 w-1/3 rounded"></div>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>

{#if $openSnippetId}
	<SnippetModal
		mode={modalMode}
		snippet={activeSnippet || editingSnippet || undefined}
		currentUserId={user?.id}
		isStarred={$starredIds.has($openSnippetId)}
		onclose={() => {
			$openSnippetId = null;
			editingSnippet = null;
		}}
		onsave={handleSaveModal}
		onedit={() => {
			editingSnippet = { ...activeSnippet };
			modalMode = 'edit';
		}}
		oncopy={handleCopy}
		onfork={handleFork}
		onstar={handleStar}
	/>
{/if}
