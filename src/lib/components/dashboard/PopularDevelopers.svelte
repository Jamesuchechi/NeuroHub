<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { profileService } from '$lib/services/profileService';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { authStore } from '$lib/stores/authStore';
	import { toast } from '$lib/stores/toastStore';
	import type { DeveloperItem } from '$lib/types/discovery';

	let developers = $state<DeveloperItem[]>([]);
	let loading = $state(true);

	const { user } = $derived($authStore);

	onMount(async () => {
		try {
			developers = (await profileService.getPopularProfiles(
				5,
				user?.id
			)) as unknown as DeveloperItem[];
		} catch (err) {
			console.error('Failed to fetch popular developers:', err);
		} finally {
			loading = false;
		}
	});

	async function handleFollow(dev: DeveloperItem) {
		if (!user) {
			toast.show('Please sign in to follow developers.', 'error');
			return;
		}
		try {
			await profileService.followUser(user.id, dev.id);
			toast.show(`Followed @${dev.username}`);
		} catch (_err) {
			toast.show('Failed to follow developer.', 'error');
		}
	}
</script>

<div class="rounded-3xl border border-stroke bg-surface-dim/50 p-8 shadow-xl backdrop-blur-sm">
	<div class="mb-6 flex items-center justify-between">
		<h3 class="text-sm font-black tracking-tight text-content uppercase">Popular Developers</h3>
		<button class="text-[10px] font-bold text-content-dim transition-colors hover:text-brand-orange"
			>View All</button
		>
	</div>

	<div class="space-y-6">
		{#if loading}
			{#each Array.from({ length: 3 }) as _, i (i)}
				<div class="flex animate-pulse items-center gap-4">
					<div class="h-10 w-10 rounded-xl bg-surface"></div>
					<div class="flex-1 space-y-2">
						<div class="h-3 w-20 rounded bg-surface"></div>
						<div class="h-2 w-12 rounded bg-surface"></div>
					</div>
				</div>
			{/each}
		{:else if developers.length === 0}
			<p class="py-4 text-center text-xs text-content-dim italic">No developers found.</p>
		{:else}
			{#each developers as dev (dev.id)}
				<div
					class="flex items-center justify-between gap-4 rounded-2xl p-2 transition-colors hover:bg-surface-dim"
				>
					<a
						href={resolve(`/profile/${dev.username}`)}
						class="group/dev flex min-w-0 items-center gap-4"
					>
						<Avatar
							name={dev.username ?? 'D'}
							src={dev.avatar_url ?? undefined}
							size="md"
							class="shrink-0 rounded-xl transition-transform group-hover/dev:scale-105 active:scale-95"
						/>
						<div class="min-w-0">
							<p
								class="truncate text-sm font-black text-content decoration-brand-orange/30 underline-offset-2 transition-colors group-hover/dev:text-brand-orange group-hover/dev:underline"
							>
								{dev.full_name || dev.username || 'Developer'}
							</p>
							<p class="text-[10px] font-bold text-content-dim/60">@{dev.username ?? 'anon'}</p>
						</div>
					</a>
					<Button
						variant="primary"
						size="sm"
						onclick={() => handleFollow(dev)}
						class="shrink-0 rounded-full bg-content px-6 text-surface hover:bg-content/90"
					>
						Follow
					</Button>
				</div>
			{/each}
		{/if}
	</div>
</div>
