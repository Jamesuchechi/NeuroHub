<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { activityService, type Activity } from '$lib/services/activity';
	import { authStore } from '$lib/stores/authStore';
	import { profileStore } from '$lib/stores/profileStore';
	import ActivityItem from '$lib/components/dashboard/ActivityItem.svelte';
	import { fly, fade } from 'svelte/transition';
	import PostComposer from '$lib/components/social/PostComposer.svelte';

	let mainPost = $state<Activity | null>(null);
	let loading = $state(true);
	const activityId = $derived(page.params.id);
	const { user } = $derived($authStore);

	async function loadDetails() {
		if (!activityId) return;
		loading = true;
		try {
			mainPost = await activityService.fetchActivityById(activityId, user?.id || null);
			await loadReplies();
		} catch (err) {
			console.error('Failed to load post detail:', err);
		} finally {
			loading = false;
		}
	}

	async function loadReplies() {
		await activityService.fetchActivities(null, user?.id || null, activityId);
	}

	// Handle subscription
	$effect(() => {
		if (activityId) {
			return activityService.subscribeToActivities(null, activityId, () => {
				loadReplies();
			});
		}
	});

	const localReplies = $derived(
		$activityService.filter((a: Activity) => a.parent_id === activityId)
	);

	onMount(() => {
		if (user) {
			profileStore.fetchProfile(user.id);
		}
		loadDetails();
	});

	// Handle navigation changes
	$effect(() => {
		if (activityId) {
			loadDetails();
		}
	});
</script>

<svelte:head>
	<title
		>{(
			mainPost?.payload as unknown as import('$lib/services/activity').PostPayload
		)?.content?.slice(0, 50) || 'Post'} | NeuroHub Hub</title
	>
</svelte:head>

<div class="min-h-full bg-surface p-6 md:p-8 lg:p-10">
	<div class="mx-auto max-w-3xl">
		<!-- Back Header -->
		<div class="mb-8 flex items-center gap-4">
			<button
				onclick={() => history.back()}
				class="group flex h-10 w-10 items-center justify-center rounded-full border border-stroke bg-surface-dim transition-all hover:border-brand-orange hover:bg-brand-orange/10"
				aria-label="Go back"
			>
				<svg
					class="h-5 w-5 text-content-dim group-hover:text-brand-orange"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
			</button>
			<div>
				<h1 class="text-2xl font-black tracking-tight text-content">Post Detail</h1>
				<p class="text-xs font-bold tracking-wider text-content-dim uppercase">Conversation</p>
			</div>
		</div>

		{#if loading}
			<div class="animate-pulse space-y-6">
				<div class="h-64 rounded-3xl border border-stroke bg-surface-dim/50 shadow-xl"></div>
				<div class="h-32 rounded-3xl border border-dashed border-stroke bg-surface-dim/20"></div>
			</div>
		{:else if mainPost}
			<div in:fade={{ duration: 400 }}>
				<!-- Main Post Container -->
				<div
					class="mb-10 overflow-hidden rounded-3xl border border-stroke bg-surface-dim shadow-2xl"
				>
					<ActivityItem activity={mainPost} />
				</div>

				<!-- Reply Section -->
				<div class="mb-12 ml-6 border-l-2 border-brand-orange/30 pl-6">
					<p class="mb-4 text-[10px] font-black tracking-[2px] text-zinc-500 uppercase">
						Post your reply
					</p>
					<div class="rounded-2xl border border-stroke bg-surface p-5 shadow-lg">
						<PostComposer
							placeholder="What's your take?..."
							onPostCreated={loadReplies}
							options={{ parentId: mainPost.id }}
							showActions={false}
						/>
					</div>
				</div>

				<!-- Threads/Replies -->
				<div class="space-y-8">
					<div class="flex items-center gap-4">
						<div class="h-px flex-1 bg-stroke"></div>
						<p class="text-[10px] font-black tracking-[3px] text-zinc-500 uppercase">Discussion</p>
						<div class="h-px flex-1 bg-stroke"></div>
					</div>

					{#if localReplies.length === 0}
						<div
							class="rounded-3xl border border-dashed border-stroke bg-surface-dim/20 py-16 text-center"
						>
							<p class="text-xs text-content-dim italic">No replies yet. Be the first to reply!</p>
						</div>
					{:else}
						<div class="space-y-6">
							{#each localReplies as reply (reply.id)}
								<div in:fly={{ y: 20, duration: 400, delay: 100 }}>
									<ActivityItem activity={reply} />
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="rounded-3xl border border-stroke bg-surface-dim/20 py-24 text-center">
				<p class="text-content-dim italic">This post could not be found or was deleted.</p>
				<button
					onclick={() => history.back()}
					class="mt-4 text-sm font-bold text-brand-orange hover:underline">Go Back</button
				>
			</div>
		{/if}
	</div>
</div>
