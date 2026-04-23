<script lang="ts">
	import { fade } from 'svelte/transition';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { uiStore } from '$lib/stores/uiStore';
	import SimilarNotes from '../ai/SimilarNotes.svelte';
	import ContextPreview from '../ai/ContextPreview.svelte';
	import SidebarNoteView from './SidebarNoteView.svelte';
	import RecommendedDevelopers from '../social/RecommendedDevelopers.svelte';
	import TrendingSnippets from '../social/TrendingSnippets.svelte';
	import { page } from '$app/state';

	const { currentWorkspace } = $derived($workspaceStore);
	const { contextPanelCollapsed, selectedNoteId } = $derived($uiStore);
	const isNoteView = $derived(!!page.params.noteId);

	function toggle() {
		uiStore.setContextPanelCollapsed(!contextPanelCollapsed);
	}

	function clearSelection() {
		uiStore.setSelectedNoteId(null);
	}
</script>

<aside
	class="flex h-full flex-col border-l border-stroke bg-surface-dim transition-all duration-300"
>
	<!-- Header -->
	<div class="flex h-16 items-center justify-between border-b border-stroke/50 px-6">
		<h2 class="text-xs font-bold tracking-[2px] text-content-dim uppercase">Context</h2>
		<button
			onclick={toggle}
			class="rounded-lg p-1 text-content-dim transition-all hover:bg-surface hover:text-content"
			aria-label="Close context panel"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>

	<!-- Content -->
	<div class="scrollbar-hide flex-1 overflow-y-auto">
		{#if selectedNoteId}
			<SidebarNoteView noteId={selectedNoteId} onClose={clearSelection} />
		{:else}
			<div class="space-y-8 p-6" in:fade>
				<section>
					<h3 class="mb-2 text-sm leading-tight font-bold text-content">
						{currentWorkspace?.name || 'NeuroHub'}
					</h3>
					<p class="text-[11px] leading-relaxed text-content-dim">
						Intelligence hub active. NeuroAI is monitoring workspace signals to provide real-time
						support.
					</p>
				</section>

				<!-- AI Intelligence Section -->
				<section class="space-y-6">
					<ContextPreview />

					{#if isNoteView}
						<SimilarNotes />
					{/if}

					<RecommendedDevelopers />

					<TrendingSnippets />
				</section>

				<!-- Metadata Placeholder -->
				<section class="opacity-50">
					<p class="mb-3 text-[10px] font-bold tracking-wider text-content-dim uppercase">
						Active participants
					</p>
					<div class="flex -space-x-2">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-dim bg-orange-500/20 text-[10px] font-bold text-brand-orange"
						>
							JD
						</div>
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-dim bg-stroke text-[10px] font-bold text-content-dim"
						>
							+1
						</div>
					</div>
				</section>
			</div>
		{/if}
	</div>
</aside>
