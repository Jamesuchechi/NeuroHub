<script lang="ts">
	import { socialStore } from '$lib/stores/socialStore.svelte';
	import { authStore } from '$lib/stores/authStore';
	import { fade, slide } from 'svelte/transition';
	import Avatar from '../ui/Avatar.svelte';

	const { user } = $derived($authStore);

	$effect(() => {
		if (user?.id) {
			socialStore.fetchRecommendedDevelopers(user.id);
		}
	});
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<p class="text-[10px] font-bold tracking-wider text-content-dim uppercase">
			Recommended for You
		</p>
		<span
			class="rounded bg-brand-orange/10 px-1.5 py-0.5 text-[8px] font-bold text-brand-orange uppercase"
		>
			Expert Match
		</span>
	</div>

	{#if socialStore.isLoading}
		<div class="space-y-3">
			{#each Array(3) as _, i (i)}
				<div class="h-12 w-full animate-pulse rounded-lg bg-surface/30"></div>
			{/each}
		</div>
	{:else if socialStore.recommendedDevelopers.length > 0}
		<div class="space-y-2" in:fade>
			{#each socialStore.recommendedDevelopers as developer (developer.id)}
				<div
					class="group flex cursor-pointer items-center gap-3 rounded-lg border border-stroke bg-surface/30 p-3 transition-all hover:border-brand-orange/30 hover:bg-surface"
					in:slide={{ duration: 300 }}
				>
					<Avatar src={developer.avatar_url} name={developer.username} size="sm" />
					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between">
							<h4 class="truncate text-xs font-bold text-content group-hover:text-brand-orange">
								@{developer.username}
							</h4>
							<span class="text-[9px] font-medium text-brand-orange">
								{developer.overlap_count} overlap
							</span>
						</div>
						<div class="flex items-center justify-between">
							<p class="truncate text-[10px] text-content-dim">
								{developer.title || 'Software Engineer'}
							</p>
							<span class="text-[9px] font-bold text-brand-orange/70">
								{developer.influence_score} pts
							</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg border border-dashed border-stroke p-4 text-center">
			<p class="text-[10px] text-content-dim italic">
				No tech-stack matches found. Update your skills in settings to find collaborators!
			</p>
		</div>
	{/if}
</div>
