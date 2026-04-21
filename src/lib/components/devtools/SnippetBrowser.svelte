<script lang="ts">
	import { activeSnippetId, starredIds, toggleStarLocal } from '$lib/stores/devToolsStore';
	import { snippetService } from '$lib/services/snippets';
	import { toolboxStore } from '$lib/stores/toolboxStore.svelte';
	import { authStore } from '$lib/stores/authStore';
	import { toast } from '$lib/stores/toastStore';
	import type { SnippetsTable } from '$lib/types/db';
	import type { Language } from '$lib/types/devtools';
	import { fade } from 'svelte/transition';

	import SnippetTabs from './SnippetTabs.svelte';
	import SnippetEditor from './SnippetEditor.svelte';
	import LanguageSelector from './LanguageSelector.svelte';

	let { workspaceId } = $props<{ workspaceId: string }>();

	let user = $derived($authStore.user);

	let snippetData = $state<SnippetsTable['Row'] | null>(null);
	let loading = $state(false);
	let isSaving = $state(false);

	// Form state for active snippet
	let title = $state('');
	let description = $state('');
	let code = $state('');
	let language = $state<Language>('javascript');
	let tags = $state<string[]>([]);
	let visibility = $state<'workspace' | 'public'>('workspace');

	async function loadActiveSnippet(id: string) {
		if (id === 'new') {
			snippetData = null;
			title = 'New Snippet';
			description = '';
			code = '';
			language = 'javascript';
			tags = [];
			visibility = 'workspace';
			return;
		}

		loading = true;
		try {
			const res = await snippetService.getById(id);
			if (res.data) {
				snippetData = res.data;
				title = res.data.title;
				description = res.data.description || '';
				code = res.data.code;
				language = res.data.language as Language;
				tags = res.data.tags || [];
				visibility = res.data.visibility as 'workspace' | 'public';
			}
		} catch {
			toast.show('Failed to load snippet', 'error');
		}
		loading = false;
	}

	async function handleSave() {
		if (!user) return;
		isSaving = true;
		try {
			const data = {
				title,
				description,
				code,
				language,
				tags,
				visibility
			};

			if ($activeSnippetId === 'new') {
				const res = await snippetService.create({
					workspace_id: workspaceId,
					author_id: user.id,
					toolbox_id: toolboxStore.selectedToolboxId,
					...data
				});
				if (res.data) {
					toast.show('Snippet created', 'success');
					// Replace 'new' tab with the actual ID
					import('$lib/stores/devToolsStore').then(({ openInTab, closeTab }) => {
						closeTab('new');
						openInTab(res.data.id);
					});
				}
			} else if ($activeSnippetId) {
				const res = await snippetService.update($activeSnippetId, data);
				if (res.data) {
					toast.show('Snippet updated', 'success');
					snippetData = { ...snippetData, ...res.data };
				}
			}
		} catch {
			toast.show('Failed to save changes', 'error');
		}
		isSaving = false;
	}

	async function handleStar() {
		if (!$activeSnippetId || $activeSnippetId === 'new' || !user) return;
		toggleStarLocal($activeSnippetId);
		try {
			await snippetService.toggleStar($activeSnippetId, user.id);
		} catch {
			toggleStarLocal($activeSnippetId);
			toast.show('Failed to star snippet', 'error');
		}
	}

	$effect(() => {
		if ($activeSnippetId) {
			loadActiveSnippet($activeSnippetId);
		} else {
			snippetData = null;
		}
	});

	function handleCopy() {
		navigator.clipboard.writeText(code);
		toast.show('Code copied', 'success');
	}
</script>

<div class="flex h-full flex-col overflow-hidden bg-surface">
	<SnippetTabs />

	<div class="flex-1 overflow-hidden">
		{#if $activeSnippetId}
			<div class="flex h-full flex-col overflow-hidden">
				<!-- Header / Metadata Area -->
				<div class="no-print border-b border-stroke bg-surface-dim/30 px-6 py-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex flex-1 flex-col gap-2">
							<input
								bind:value={title}
								class="w-full bg-transparent text-xl font-bold text-content outline-none placeholder:text-content-dim/30"
								placeholder="Snippet Title"
							/>
							<input
								bind:value={description}
								class="w-full bg-transparent text-sm text-content-dim outline-none placeholder:text-content-dim/20"
								placeholder="Add a description..."
							/>
						</div>

						<div class="flex items-center gap-2">
							<button
								class="flex h-9 items-center gap-2 rounded-lg border border-stroke bg-surface px-4 text-sm font-medium text-content-dim transition-colors hover:bg-surface-dim hover:text-content"
								onclick={handleCopy}
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-1 4h.01M9 16h.01"
									/>
								</svg>
								Copy
							</button>

							<button
								class="flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
								onclick={handleSave}
								disabled={isSaving}
							>
								{#if isSaving}
									<div
										class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
									></div>
								{:else}
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
										/>
									</svg>
								{/if}
								Save
							</button>
						</div>
					</div>

					<div class="mt-4 flex items-center gap-6 border-t border-stroke pt-4">
						<div class="flex items-center gap-2">
							<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase"
								>Language</span
							>
							<LanguageSelector bind:value={language} />
						</div>

						<div class="flex items-center gap-2">
							<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase"
								>Visibility</span
							>
							<select
								bind:value={visibility}
								class="bg-transparent text-xs font-medium text-content-dim outline-none"
							>
								<option value="workspace">Workspace</option>
								<option value="public">Public</option>
							</select>
						</div>

						{#if $activeSnippetId !== 'new'}
							<button
								class="ml-auto flex items-center gap-1.5 text-xs transition-colors {$starredIds.has(
									$activeSnippetId
								)
									? 'text-orange-500'
									: 'text-content-dim hover:text-content'}"
								onclick={handleStar}
							>
								<svg
									class="h-4 w-4"
									fill={$starredIds.has($activeSnippetId) ? 'currentColor' : 'none'}
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
									/>
								</svg>
								{$starredIds.has($activeSnippetId) ? 'Starred' : 'Star'}
							</button>
						{/if}
					</div>
				</div>

				<!-- Editor Area -->
				<div class="flex-1 overflow-hidden bg-surface">
					{#if loading}
						<div class="flex h-full items-center justify-center">
							<div
								class="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"
							></div>
						</div>
					{:else}
						<SnippetEditor
							bind:code
							{language}
							class="h-full rounded-none border-none"
							minHeight="100%"
						/>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Empty State / Welcome Screen -->
			<div class="flex h-full flex-col items-center justify-center p-12 text-center" in:fade>
				<div
					class="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-surface-dim shadow-2xl"
				>
					<svg
						class="h-12 w-12 text-orange-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1"
							d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
						/>
					</svg>
				</div>
				<h2 class="mb-2 text-2xl font-bold text-content">DevHub Workbench</h2>
				<p class="mb-8 max-w-sm text-content-dim">
					Select a snippet from the sidebar or press <kbd
						class="mx-1 rounded bg-surface-dim px-1.5 py-0.5 font-mono text-content-dim">Cmd+K</kbd
					> to find tools and resources.
				</p>

				<div class="grid w-full max-w-lg grid-cols-2 gap-4">
					<button
						class="flex flex-col items-start gap-3 rounded-xl border border-stroke bg-surface-dim/50 p-6 text-left transition-all hover:border-stroke hover:bg-surface-dim"
						onclick={() =>
							import('$lib/stores/devToolsStore').then(({ openInTab }) => openInTab('new'))}
					>
						<div class="rounded-lg bg-orange-500/10 p-2 text-orange-500">
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</div>
						<div>
							<p class="font-bold text-content">New Snippet</p>
							<p class="text-xs text-content-dim">Create a reusable code block</p>
						</div>
					</button>

					<button
						class="flex flex-col items-start gap-3 rounded-xl border border-stroke bg-surface-dim/50 p-6 text-left transition-all hover:border-stroke hover:bg-surface-dim"
						onclick={() =>
							import('$lib/stores/devToolsStore').then(({ activeTab }) => activeTab.set('api'))}
					>
						<div class="rounded-lg bg-blue-500/10 p-2 text-blue-500">
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
						<div>
							<p class="font-bold text-content">API Tester</p>
							<p class="text-xs text-content-dim">Debug and test HTTP requests</p>
						</div>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.cm-editor) {
		font-size: 14px !important;
	}
</style>
