<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StoriesBar from '$lib/components/social/StoriesBar.svelte';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import { profileStore } from '$lib/stores/profileStore';
	import { profileService } from '$lib/services/profileService';

	let { data } = $props();
	const profile = $derived(data.profile);
	const activities = $derived(data.activities ?? []);
	const isOwnProfile = $derived($profileStore.profile?.id === profile.id);

	let activeTab = $state('activity');
	let isFollowing = $state(false);
	let followersCount = $state(0);
	let followingCount = $state(0);

	// Sync stats and follow status when data changes or user switches
	$effect(() => {
		// These sync whenever the server data (props) change
		followersCount = data.stats.followers;
		followingCount = data.stats.following;

		if ($profileStore.profile && profile && !isOwnProfile) {
			profileService
				.isFollowing($profileStore.profile.id, profile.id)
				.then((res) => (isFollowing = res));
		} else {
			isFollowing = false;
		}
	});

	async function toggleFollow() {
		if (!$profileStore.profile) return;

		const wasFollowing = isFollowing;

		// Optimistic Update
		isFollowing = !isFollowing;
		followersCount += isFollowing ? 1 : -1;

		try {
			if (wasFollowing) {
				await profileService.unfollowUser($profileStore.profile.id, profile.id);
			} else {
				await profileService.followUser($profileStore.profile.id, profile.id);
			}
		} catch (err) {
			// Rollback
			isFollowing = wasFollowing;
			followersCount += isFollowing ? 1 : -1;
			console.error('[Profile] Follow toggle failed:', err);
		}
	}

	const joinedDate = $derived(
		new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
			new Date(profile.created_at)
		)
	);

	const tabs = [
		{ id: 'activity', name: 'Activity', icon: 'zap' },
		{ id: 'snippets', name: 'Snippets', icon: 'code' },
		{ id: 'media', name: 'Media', icon: 'image' }
	];
</script>

<AppShell>
	<div class="h-full w-full bg-surface pb-20">
		<!-- Profile Content Container -->
		<div class="relative h-48 w-full bg-surface-dim md:h-64 lg:h-80">
			{#if profile.header_url}
				<img src={profile.header_url} alt="Header" class="h-full w-full object-cover" />
			{:else}
				<div
					class="h-full w-full bg-linear-to-br from-brand-orange/20 via-surface-dim to-brand-blue/20"
				></div>
			{/if}

			<!-- Avatar Overlap -->
			<div class="absolute -bottom-16 left-6 md:left-10 lg:left-12">
				<div class="rounded-full bg-surface p-1.5 shadow-2xl">
					<div class="h-32 w-32 md:h-40 md:w-40">
						<Avatar
							name={profile.username ?? ''}
							src={profile.avatar_url ?? undefined}
							class="h-full w-full ring-4 ring-surface"
						/>
					</div>
				</div>
			</div>
		</div>

		<!-- Profile Content Container -->
		<div class="mx-auto max-w-5xl px-6 pt-20 md:px-10 lg:px-12">
			<!-- Action Buttons -->
			<div class="flex justify-end gap-3 pb-8">
				{#if isOwnProfile}
					<Button
						variant="secondary"
						size="md"
						width="auto"
						onclick={() => goto(resolve('/settings/profile' as unknown as '/'))}
					>
						Edit Profile
					</Button>
				{:else}
					<Button variant="secondary" size="md" width="auto">Message</Button>
					<Button
						variant={isFollowing ? 'secondary' : 'primary'}
						size="md"
						width="auto"
						onclick={toggleFollow}
					>
						{isFollowing ? 'Following' : 'Follow'}
					</Button>
				{/if}
			</div>

			<!-- Bio Section -->
			<div in:fly={{ y: 20, duration: 800, easing: cubicOut }} class="mb-10">
				<h1 class="text-3xl font-black tracking-tight text-content">
					{profile.full_name || profile.username}
				</h1>

				<div class="mb-4 flex flex-wrap items-center gap-2">
					<p class="text-sm font-medium text-content-dim">@{profile.username}</p>
					{#if profile.title}
						<span class="h-1 w-1 rounded-full bg-zinc-800"></span>
						<p class="text-sm font-bold text-brand-orange">{profile.title}</p>
					{/if}
				</div>

				{#if profile.bio}
					<p class="mb-6 max-w-2xl text-base leading-relaxed text-content/80">
						{profile.bio}
					</p>
				{:else}
					<p class="mb-6 text-content-dim italic">No bio yet.</p>
				{/if}

				<!-- Skills Cloud -->
				{#if profile.skills && profile.skills.length > 0}
					<div class="mb-8 flex flex-wrap gap-2">
						{#each profile.skills as skill (skill)}
							<span
								class="rounded-lg border border-white/5 bg-surface-dim/40 px-3 py-1 text-xs font-bold text-content/80 transition-colors hover:bg-surface-dim/60"
							>
								{skill}
							</span>
						{/each}
					</div>
				{/if}

				<div class="flex flex-wrap gap-5 text-sm font-medium text-content-dim">
					{#if profile.location}
						<div class="flex items-center gap-1.5">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							{profile.location}
						</div>
					{/if}
					{#if profile.website}
						<a
							href={resolve(profile.website as unknown as '/')}
							target="_blank"
							class="flex items-center gap-1.5 text-brand-orange hover:underline"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.827a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.101 1.101"
								/>
							</svg>
							{profile.website.replace(/^https?:\/\//, '')}
						</a>
					{/if}
					<div class="flex items-center gap-1.5">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z"
							/>
						</svg>
						Joined {joinedDate}
					</div>
				</div>

				<div class="mt-6 flex gap-6 text-sm">
					<button class="hover:underline">
						<span class="font-black text-content">{followingCount}</span>
						<span class="text-content-dim">Following</span>
					</button>
					<button class="hover:underline">
						<span class="font-black text-content">{followersCount}</span>
						<span class="text-content-dim">Followers</span>
					</button>
				</div>
			</div>

			<!-- IG-Style Stories Bar -->
			<div class="mb-12 border-y border-stroke py-6">
				<StoriesBar />
			</div>

			<!-- X-Style Tabs -->
			<div class="sticky top-0 z-10 border-b border-stroke bg-surface/80 backdrop-blur-md">
				<div class="flex w-full">
					{#each tabs as tab (tab.id)}
						<button
							class="relative flex-1 py-4 text-sm font-bold transition-colors {activeTab === tab.id
								? 'text-content'
								: 'text-content-dim hover:bg-surface-dim/40'}"
							onclick={() => (activeTab = tab.id)}
						>
							{tab.name}
							{#if activeTab === tab.id}
								<div
									in:fade={{ duration: 200 }}
									class="absolute bottom-0 left-0 h-1 w-full rounded-t-full bg-brand-orange shadow-neon-orange"
								></div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- Tab Content -->
			<div class="pt-8">
				{#if activeTab === 'activity'}
					<div in:fade={{ duration: 400 }} class="space-y-8">
						{#if activities.length > 0}
							{#each activities as activity (activity.id)}
								<div
									class="group relative rounded-3xl border border-stroke bg-surface-dim/20 p-8 transition-all hover:bg-surface-dim/40"
								>
									<div class="mb-4 flex items-center justify-between">
										<div class="flex items-center gap-3">
											<Avatar
												name={profile.username ?? ''}
												src={profile.avatar_url ?? undefined}
												size="sm"
											/>
											<div>
												<p class="text-sm font-bold text-content">
													{profile.full_name || profile.username}
												</p>
												<p class="text-[10px] font-bold text-content-dim uppercase">
													{new Date(activity.created_at).toLocaleDateString()}
												</p>
											</div>
										</div>
										<div
											class="rounded-full bg-brand-orange/10 px-3 py-1 text-[10px] font-bold text-brand-orange uppercase"
										>
											{activity.type}
										</div>
									</div>
									<div class="mb-6 text-base leading-relaxed text-content/90">
										{#if activity.payload && typeof activity.payload === 'object' && 'content' in activity.payload}
											{activity.payload.content}
										{:else}
											Performed a {activity.type} action.
										{/if}
									</div>
								</div>
							{/each}
						{:else}
							<div class="flex flex-col items-center justify-center py-20 text-center">
								<div class="mb-4 text-zinc-800">
									<svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1"
											d="M13 10V3L4 14h7v7l9-11h-7z"
										/>
									</svg>
								</div>
								<h3 class="mb-2 text-xl font-black text-content">Quiet for now</h3>
								<p class="text-sm text-content-dim">
									Activity from {profile.username} will appear here.
								</p>
							</div>
						{/if}
					</div>
				{/if}
				{#if activeTab === 'snippets'}
					<div
						in:fly={{ y: 20, duration: 600 }}
						class="flex flex-col items-center justify-center py-20 text-center"
					>
						<div class="mb-4 text-brand-orange">
							<svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1"
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-black text-content">No snippets shared yet</h3>
						<p class="text-sm text-content-dim">
							Snippets shared by {profile.username} will appear here.
						</p>
					</div>
				{/if}
				{#if activeTab === 'media'}
					<div in:fly={{ y: 20, duration: 600 }} class="grid grid-cols-2 gap-4 md:grid-cols-3">
						{#each Array.from({ length: 6 }) as _, i (i)}
							<div
								class="group relative aspect-square overflow-hidden rounded-2xl border border-stroke bg-surface-dim"
							>
								<div
									class="absolute inset-0 flex items-end bg-linear-to-t from-black/50 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<span class="text-[10px] font-bold tracking-wider text-white uppercase"
										>Project Preview</span
									>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</AppShell>

<style>
	:global(body) {
		background-color: var(--color-surface);
	}
</style>
