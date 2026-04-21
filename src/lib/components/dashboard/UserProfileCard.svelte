<script lang="ts">
	import { onMount } from 'svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { profileService } from '$lib/services/profileService';
	import type { Database } from '$lib/types/db';

	type Profile = Database['public']['Tables']['profiles']['Row'];

	let { profile }: { profile: Profile } = $props();

	let stats = $state({ followers: 0, following: 0 });

	onMount(async () => {
		if (profile?.id) {
			try {
				stats = await profileService.getProfileStats(profile.id);
			} catch (err) {
				console.error('Failed to fetch profile stats:', err);
			}
		}
	});
</script>

<div class="overflow-hidden rounded-3xl border border-stroke bg-surface-dim shadow-2xl">
	<!-- Header / Banner -->
	<div class="relative h-24 w-full bg-linear-to-br from-orange-500/20 to-blue-500/20">
		{#if profile.header_url}
			<img src={profile.header_url} alt="Banner" class="h-full w-full object-cover" />
		{/if}
	</div>

	<!-- Content -->
	<div class="relative px-6 pb-6">
		<!-- Avatar Overlap -->
		<div class="absolute -top-12 left-6">
			<div class="rounded-2xl border-4 border-surface-dim bg-surface-dim p-1">
				<Avatar
					name={profile.username || 'User'}
					src={profile.avatar_url ?? undefined}
					size="xl"
					class="rounded-xl shadow-xl"
				/>
			</div>
		</div>

		<div class="pt-20">
			<div class="flex items-start justify-between">
				<div class="min-w-0 flex-1">
					<h3 class="truncate text-2xl font-black tracking-tight text-content">
						{profile.full_name || profile.username || 'Developer'}
					</h3>
					<p class="text-sm font-bold text-content-dim">@{profile.username}</p>
				</div>
				<button
					class="rounded-full border border-stroke bg-surface px-4 py-1.5 text-xs font-bold text-content transition-all hover:bg-surface-dim"
				>
					Edit Profile
				</button>
			</div>

			{#if profile.bio}
				<p class="mt-4 text-sm leading-relaxed text-content-dim">
					{profile.bio}
				</p>
			{/if}

			<div class="mt-6 flex items-center gap-6">
				<div class="flex cursor-pointer items-center gap-1.5 hover:underline">
					<span class="text-sm font-black text-content">{stats.following}</span>
					<span class="text-xs font-bold text-content-dim">Following</span>
				</div>
				<div class="flex cursor-pointer items-center gap-1.5 hover:underline">
					<span class="text-sm font-black text-content">{stats.followers}</span>
					<span class="text-xs font-bold text-content-dim">Followers</span>
				</div>
			</div>
		</div>
	</div>
</div>
