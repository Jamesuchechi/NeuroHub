<script lang="ts">
	import { socialStore } from '$lib/stores/socialStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { fade, slide } from 'svelte/transition';
	import { resolve } from '$app/paths';

	const workspace = $derived($workspaceStore.currentWorkspace);
	let filter = $state<'global' | 'workspace'>('workspace');

	$effect(() => {
		socialStore.fetchTrendingSnippets(filter === 'workspace' ? workspace?.id : null);
	});
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<p class="text-[10px] font-bold tracking-wider text-content-dim uppercase">Trending Snippets</p>
		<div
			class="flex items-center gap-1.5 rounded-full border border-stroke/50 bg-surface-dim p-0.5"
		>
			<button
				class="rounded-full px-2 py-0.5 text-[8px] font-bold transition-all {filter === 'workspace'
					? 'bg-brand-orange text-white shadow-sm'
					: 'text-content-dim hover:text-content'}"
				onclick={() => (filter = 'workspace')}
			>
				Team
			</button>
			<button
				class="rounded-full px-2 py-0.5 text-[8px] font-bold transition-all {filter === 'global'
					? 'bg-brand-orange text-white shadow-sm'
					: 'text-content-dim hover:text-content'}"
				onclick={() => (filter = 'global')}
			>
				Global
			</button>
		</div>
	</div>

	{#if socialStore.isTrendingLoading}
		<div class="space-y-3">
			{#each Array(2) as _, i (i)}
				<div class="h-16 w-full animate-pulse rounded-lg bg-surface/30"></div>
			{/each}
		</div>
	{:else if socialStore.trendingSnippets.length > 0}
		<div class="space-y-2" in:fade>
			{#each socialStore.trendingSnippets as snippet (snippet.id)}
				<a
					href={resolve(`/workspace/${workspace?.slug}/snippets/${snippet.id}` as unknown as '/')}
					class="group block rounded-lg border border-stroke bg-surface/30 p-3 transition-all hover:border-brand-orange/30 hover:bg-surface"
					in:slide={{ duration: 300 }}
				>
					<div class="mb-1 flex items-center justify-between">
						<h4
							class="truncate text-xs font-bold text-content transition-colors group-hover:text-brand-orange"
						>
							{snippet.title}
						</h4>
						<div class="flex items-center gap-2">
							<span class="flex items-center gap-0.5 text-[9px] font-medium text-brand-orange">
								<svg class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
									<path
										d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
									/>
								</svg>
								{snippet.star_count}
							</span>
						</div>
					</div>
					<div class="flex items-center justify-between">
						<p class="text-[10px] text-content-dim">
							by @{snippet.author_username}
						</p>
						<span class="rounded bg-surface px-1.5 py-0.5 font-mono text-[8px] text-content-dim">
							{snippet.language}
						</span>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg border border-dashed border-stroke p-4 text-center">
			<p class="text-[10px] text-content-dim italic">No trending snippets yet.</p>
		</div>
	{/if}
</div>
