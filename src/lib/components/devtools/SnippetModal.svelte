<script lang="ts">
	import SnippetEditor from './SnippetEditor.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import type { SnippetsTable } from '$lib/types/db';
	import type { Language } from '$lib/types/devtools';
	import { pendingSnippet, openInSandbox } from '$lib/stores/devToolsStore';
	import { toast } from '$lib/stores/toastStore';
	import { aiStore } from '$lib/stores/aiStore.svelte';

	let {
		mode = 'view',
		snippet = {},
		currentUserId = '',
		isStarred = false,
		onclose,
		onsave,
		onedit,
		oncopy,
		onfork,
		onstar
	} = $props<{
		mode?: 'create' | 'edit' | 'view';
		snippet?: Partial<SnippetsTable['Row']> & {
			author?: { username: string | null; avatar_url: string | null };
			parent?: { id: string; title: string };
		};
		currentUserId?: string;
		isStarred?: boolean;
		onclose?: () => void;
		onsave?: (data: {
			title: string;
			description: string;
			code: string;
			language: Language;
			visibility: 'private' | 'workspace' | 'public';
			tags: string[];
		}) => void;
		onedit?: () => void;
		oncopy?: (code: string) => void;
		onfork?: (id: string) => void;
		onstar?: (id: string) => void;
	}>();

	let title = $state('');
	let description = $state('');
	let code = $state('');
	let language = $state<Language>('javascript');
	let visibility = $state('workspace');
	let tags = $state<string[]>([]);
	let newTag = $state('');
	let titleInput = $state<HTMLInputElement | null>(null);

	// Update local state when snippet prop changes OR when a pending snippet is injected
	$effect(() => {
		if ($pendingSnippet && mode === 'create') {
			title = $pendingSnippet.title || '';
			description = $pendingSnippet.description || '';
			code = $pendingSnippet.code || '';
			language = $pendingSnippet.language || 'javascript';
			pendingSnippet.set(null); // Clear once consumed
		} else {
			title = snippet.title || '';
			description = snippet.description || '';
			code = snippet.code || '';
			language = (snippet.language as Language) || 'javascript';
			visibility = snippet.visibility || 'workspace';
			tags = snippet.tags ? [...snippet.tags] : [];
		}
	});

	// Focus title input when it appears (on create/edit)
	$effect(() => {
		if (titleInput && (mode === 'create' || mode === 'edit')) {
			titleInput.focus();
		}
	});

	function addTag(e: KeyboardEvent) {
		if (e.key === 'Enter' && newTag.trim()) {
			e.preventDefault();
			const t = newTag
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9-]/g, '');
			if (t && !tags.includes(t)) {
				tags = [...tags, t];
			}
			newTag = '';
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	function handleSave() {
		if (!title.trim()) {
			toast.show('Please enter a title', 'error');
			return;
		}
		onsave?.({ title, description, code, language, visibility, tags: $state.snapshot(tags) });
	}

	function handleRunInSandbox() {
		openInSandbox(code, language);
		handleClose();
	}

	function handleClose() {
		onclose?.();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') handleClose();
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			if (mode !== 'view') handleSave();
		}
	}

	async function aiSuggestTitle() {
		if (!code.trim()) {
			toast.show('Please write or paste code first', 'error');
			return;
		}
		const suggestedTitle = await aiStore.suggestSnippetTitle(code, language);
		if (suggestedTitle) {
			title = suggestedTitle;
			toast.show('Title suggested ✨', 'success');
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div
	role="button"
	tabindex="-1"
	class="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
	onclick={handleClose}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') handleClose();
	}}
>
	<div
		role="presentation"
		class="bg-card border-border flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-2xl"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<!-- Header -->
		<div class="border-border bg-muted/20 flex items-center justify-between border-b p-4">
			<div class="mr-4 flex min-w-0 flex-1 items-center gap-3">
				{#if mode === 'view'}
					<h2 class="truncate text-lg font-semibold">{title}</h2>
					{#if snippet.visibility === 'public'}
						<span
							class="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs text-green-600"
							>Public</span
						>
					{:else if snippet.visibility === 'private'}
						<span
							class="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs text-red-600"
							>Private</span
						>
					{/if}
				{:else}
					<div class="flex flex-1 items-center gap-2">
						<input
							type="text"
							bind:this={titleInput}
							bind:value={title}
							placeholder="Snippet title..."
							class="placeholder:text-muted-foreground w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-semibold focus:ring-0"
						/>
						<button
							onclick={aiSuggestTitle}
							disabled={aiStore.isGenerating}
							class="rounded-lg p-1.5 text-brand-orange transition-all hover:bg-brand-orange/10 disabled:opacity-50"
							title="✨ Suggest Title"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</button>
					</div>
				{/if}
			</div>

			<div class="flex shrink-0 items-center gap-3">
				{#if mode !== 'view'}
					<select
						bind:value={visibility}
						class="border-border focus:ring-primary rounded border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1"
					>
						<option value="private">Private</option>
						<option value="workspace">Workspace</option>
						<option value="public">Public</option>
					</select>
				{/if}

				<LanguageSelector bind:value={language} disabled={mode === 'view'} />

				<div class="bg-border mx-1 h-5 w-px"></div>
				<button
					class="text-muted-foreground hover:text-foreground p-1 transition"
					onclick={handleClose}
					aria-label="Close"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path></svg
					>
				</button>
			</div>
		</div>

		<!-- Body -->
		<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
			{#if snippet.parent && snippet.parent.title}
				<div
					class="text-muted-foreground bg-muted/50 border-border/50 flex w-fit items-center gap-1.5 rounded-lg border p-2 text-sm"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7v8a2 2 0 002 2h6M8 7l4 4m-4-4l-4 4"
						/></svg
					>
					Forked from <span class="text-foreground font-medium">{snippet.parent.title}</span>
				</div>
			{/if}

			<div class="flex flex-col gap-1">
				<SnippetEditor
					bind:code
					{language}
					readonly={mode === 'view'}
					minHeight="300px"
					class="min-h-[300px] flex-1"
				/>
			</div>

			<div class="flex flex-col gap-2">
				<label
					class="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
					for="snippet-desc">Description</label
				>
				{#if mode === 'view'}
					<p class="text-sm {description ? 'text-foreground' : 'text-muted-foreground italic'}">
						{description || 'No description provided.'}
					</p>
				{:else}
					<textarea
						id="snippet-desc"
						bind:value={description}
						placeholder="What does this snippet do?"
						class="bg-background border-border focus:ring-primary min-h-[80px] w-full rounded-lg border p-3 text-sm focus:ring-1 focus:outline-none"
					></textarea>
				{/if}
			</div>

			<div class="flex flex-col gap-2">
				<label
					class="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
					for="snippet-tags">Tags</label
				>
				<div class="flex flex-wrap items-center gap-2">
					{#each tags as tag (tag)}
						<span
							class="bg-muted text-foreground border-border flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
						>
							#{tag}
							{#if mode !== 'view'}
								<button
									class="hover:text-red-400 focus:outline-none"
									onclick={() => removeTag(tag)}
									aria-label="Remove tag"
								>
									×
								</button>
							{/if}
						</span>
					{/each}

					{#if mode !== 'view'}
						<input
							id="snippet-tags"
							type="text"
							bind:value={newTag}
							onkeydown={addTag}
							placeholder="Add tag and press Enter..."
							class="placeholder:text-muted-foreground/60 w-48 border-none bg-transparent p-1 text-sm focus:ring-0"
						/>
					{/if}
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="border-border bg-muted/10 flex items-center justify-between border-t p-4">
			<div class="flex items-center gap-3">
				{#if mode === 'view' && snippet.author}
					<div class="flex items-center gap-2">
						<img
							src={snippet.author.avatar_url ||
								`https://api.dicebear.com/7.x/initials/svg?seed=${snippet.author.username}`}
							alt=""
							class="h-6 w-6 rounded-full"
						/>
						<span class="text-foreground text-sm">
							By <span class="font-medium">{snippet.author.username}</span>
						</span>
					</div>
				{/if}
			</div>

			<div class="flex gap-2">
				{#if mode === 'view'}
					<div class="flex gap-2">
						{#if ['javascript', 'typescript'].includes(language)}
							<button
								class="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600"
								onclick={handleRunInSandbox}
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
									></path></svg
								>
								Run
							</button>
						{/if}

						{#if snippet.author_id === currentUserId}
							<button
								class="border-border bg-card hover:bg-muted rounded-lg border px-4 py-1.5 text-sm font-medium transition"
								onclick={() => onedit?.()}
							>
								Edit
							</button>
						{/if}
						<button
							class="border-border bg-card hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition"
							onclick={() => oncopy?.(code)}
							title="Copy Code"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								></path></svg
							>
						</button>
						<button
							class="border-border bg-card hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition"
							onclick={() => onfork?.(snippet.id!)}
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 7v8a2 2 0 002 2h6M8 7l4 4m-4-4l-4 4"
								></path></svg
							>
							{snippet.fork_count || 0}
						</button>
						<button
							class="border px-3 py-1.5 {isStarred
								? 'border-amber-500 bg-amber-500/10 text-amber-500'
								: 'border-border bg-card hover:bg-muted text-foreground'} flex items-center gap-1.5 rounded-lg text-sm font-medium transition"
							onclick={() => onstar?.(snippet.id!)}
						>
							<svg
								class="h-4 w-4"
								fill={isStarred ? 'currentColor' : 'none'}
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
								></path></svg
							>
							{snippet.star_count || 0}
						</button>
					</div>
				{:else}
					<button
						class="border-border bg-muted hover:bg-muted/80 text-foreground rounded-lg border px-4 py-2 text-sm font-semibold transition"
						onclick={handleClose}
					>
						Cancel
					</button>
					<button
						class="bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 rounded-lg px-6 py-2 text-sm font-bold shadow-lg transition active:scale-95"
						onclick={handleSave}
					>
						Save Snippet
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
