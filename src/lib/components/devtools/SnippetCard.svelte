<script lang="ts">
	import { relativeTime } from '$lib/utils/relativeTime';
	import type { SnippetsTable } from '$lib/types/db';

	let {
		snippet,
		isStarred = false,
		view = 'grid',
		onclick,
		oncopy,
		onfork,
		onstar
	} = $props<{
		snippet: SnippetsTable['Row'] & {
			author?: { username: string | null; avatar_url: string | null };
			parent?: { id: string; title: string };
		};
		isStarred?: boolean;
		view?: 'grid' | 'list';
		onclick?: (
			snippet: SnippetsTable['Row'] & {
				author?: { username: string | null; avatar_url: string | null };
				parent?: { id: string; title: string };
			}
		) => void;
		oncopy?: (code: string) => void;
		onfork?: (id: string) => void;
		onstar?: (id: string) => void;
	}>();

	function handleCardClick() {
		onclick?.(snippet);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleCardClick();
		}
	}
</script>

<div
	class="group border-border bg-card relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition duration-200 hover:shadow-md {view ===
	'list'
		? 'flex-row'
		: ''}"
	onclick={handleCardClick}
	onkeydown={handleKeyDown}
	role="button"
	tabindex="0"
	aria-label="View snippet: {snippet.title}"
>
	<div class="flex flex-1 flex-col gap-3 p-4">
		<!-- Header -->
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0">
				<h3 class="text-foreground flex items-center gap-2 truncate font-semibold">
					{snippet.title}
					{#if snippet.visibility === 'public'}
						<span
							class="rounded-full border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-xs font-normal text-green-600"
							>Public</span
						>
					{:else if snippet.visibility === 'private'}
						<span
							class="rounded-full border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-xs font-normal text-red-600"
							>Private</span
						>
					{/if}
				</h3>

				{#if snippet.parent}
					<div class="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
						<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7v8a2 2 0 002 2h6M8 7l4 4m-4-4l-4 4"
							/></svg
						>
						Forked from <span class="font-medium">{snippet.parent.title}</span>
					</div>
				{/if}
			</div>

			<!-- Actions initially hidden, show on hover -->
			<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				<button
					class="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 rounded p-1.5 text-xs"
					onclick={(e) => {
						e.stopPropagation();
						oncopy?.(snippet.code);
					}}
					title="Copy code"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/></svg
					>
				</button>
				<button
					class="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 rounded p-1.5 text-xs"
					onclick={(e) => {
						e.stopPropagation();
						onfork?.(snippet.id);
					}}
					title="Fork snippet"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7v8a2 2 0 002 2h6M8 7l4 4m-4-4l-4 4"
						/></svg
					>
				</button>
			</div>
		</div>

		<!-- Description -->
		{#if snippet.description}
			<p class="text-foreground/70 line-clamp-2 text-sm">{snippet.description}</p>
		{/if}

		<!-- Tags -->
		{#if snippet.tags && snippet.tags.length > 0}
			<div class="mt-auto flex flex-wrap gap-1.5">
				{#each snippet.tags.slice(0, 3) as tag (tag)}
					<span
						class="bg-muted text-muted-foreground border-border rounded-full border px-2 py-0.5 text-[11px]"
					>
						#{tag}
					</span>
				{/each}
				{#if snippet.tags.length > 3}
					<span
						class="bg-muted text-muted-foreground border-border rounded-full border px-2 py-0.5 text-[11px]"
					>
						+{snippet.tags.length - 3}
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div
		class="bg-muted/30 border-border flex items-center justify-between border-t p-3 {view === 'list'
			? 'min-w-[150px] flex-col justify-center border-t-0 border-l'
			: ''}"
	>
		<div class="flex items-center gap-2">
			{#if snippet.author}
				<img
					src={snippet.author.avatar_url ||
						`https://api.dicebear.com/7.x/initials/svg?seed=${snippet.author.username}`}
					alt=""
					class="h-5 w-5 rounded-full"
				/>
				<span class="text-muted-foreground text-xs font-medium">{snippet.author.username}</span>
			{/if}
		</div>

		<div class="text-muted-foreground flex items-center gap-3 text-xs">
			<span class="flex items-center gap-1">
				<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/></svg
				>
				{relativeTime(snippet.updated_at)}
			</span>

			<button
				class="flex items-center gap-1 transition-colors hover:text-amber-500 {isStarred
					? 'text-amber-500'
					: ''}"
				onclick={(e) => {
					e.stopPropagation();
					onstar?.(snippet.id);
				}}
			>
				<svg
					class="h-4 w-4"
					fill={isStarred ? 'currentColor' : 'none'}
					viewBox="0 0 24 24"
					stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
					/></svg
				>
				{snippet.star_count}
			</button>

			{#if snippet.fork_count > 0}
				<span class="flex items-center gap-1">
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7v8a2 2 0 002 2h6M8 7l4 4m-4-4l-4 4"
						/></svg
					>
					{snippet.fork_count}
				</span>
			{/if}
		</div>
	</div>
</div>
