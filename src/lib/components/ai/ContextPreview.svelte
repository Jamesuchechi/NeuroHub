<script lang="ts">
	import { page } from '$app/state';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { contextBuilder, type WorkspaceContext } from '$lib/utils/contextBuilder';
	import { fade } from 'svelte/transition';

	let activeContext = $state<WorkspaceContext | null>(null);

	const workspaceId = $derived($workspaceStore.currentWorkspace?.id);
	const channelId = $derived(page.params.channelId);

	$effect(() => {
		if (workspaceId) {
			const timer = setInterval(async () => {
				activeContext = await contextBuilder.buildWorkspaceContext(workspaceId, channelId);
			}, 5000);
			// Initial fetch
			contextBuilder
				.buildWorkspaceContext(workspaceId, channelId)
				.then((ctx) => (activeContext = ctx));
			return () => clearInterval(timer);
		}
	});
</script>

<div class="rounded-xl border border-brand-orange/10 bg-brand-orange/5 p-4 shadow-sm">
	<div class="mb-3 flex items-center justify-between">
		<h4 class="text-[10px] font-bold tracking-widest text-brand-orange uppercase">
			Active Context
		</h4>
		<div class="flex items-center gap-1.5">
			<span class="flex h-1.5 w-1.5 animate-pulse rounded-full bg-brand-orange"></span>
			<span class="text-[8px] font-medium text-brand-orange/60">LIVE</span>
		</div>
	</div>

	{#if activeContext}
		<div class="space-y-3" in:fade>
			<div class="flex items-center justify-between border-b border-brand-orange/10 pb-2">
				<span class="text-[9px] text-content-dim">Memory Tokens</span>
				<span class="text-[9px] font-bold text-content"
					>~{Math.round(JSON.stringify(activeContext).length / 4)}</span
				>
			</div>

			<div class="grid grid-cols-2 gap-2">
				<div class="rounded border border-stroke/50 bg-surface/50 p-2">
					<p class="mb-0.5 text-[8px] font-bold text-content-dim uppercase">Messages</p>
					<p class="text-xs font-bold text-content">{activeContext.recentMessages.length}</p>
				</div>
				<div class="rounded border border-stroke/50 bg-surface/50 p-2">
					<p class="mb-0.5 text-[8px] font-bold text-content-dim uppercase">Notes</p>
					<p class="text-xs font-bold text-content">{activeContext.recentNotes.length}</p>
				</div>
				<div class="rounded border border-stroke/50 bg-surface/50 p-2">
					<p class="mb-0.5 text-[8px] font-bold text-content-dim uppercase">Snippets</p>
					<p class="text-xs font-bold text-content">{activeContext.pinnedSnippets.length}</p>
				</div>
				<div class="rounded border border-stroke/50 bg-surface/50 p-2">
					<p class="mb-0.5 text-[8px] font-bold text-content-dim uppercase">Knowledge</p>
					<p class="line-clamp-1 text-[8px] font-medium text-brand-orange uppercase">
						{activeContext.workspaceName}
					</p>
				</div>
			</div>

			<p class="text-[9px] leading-snug text-content-dim italic">
				NeuroAI is currently indexing these signals to prioritize your queries.
			</p>
		</div>
	{:else}
		<p class="text-[10px] text-content-dim">Gathering workspace signals...</p>
	{/if}
</div>
