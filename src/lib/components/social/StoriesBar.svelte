<script lang="ts">
	import Avatar from '../ui/Avatar.svelte';
	import CreateStoryModal from './CreateStoryModal.svelte';
	import StoryViewer from './StoryViewer.svelte';
	import { storyService, type StoryWithProfile } from '$lib/services/storyService';
	import { onMount } from 'svelte';

	interface UserStories {
		userId: string;
		username: string;
		avatarUrl: string | null;
		stories: StoryWithProfile[];
		hasUnread: boolean;
	}

	let { workspaceId = null } = $props<{
		workspaceId?: string | null;
	}>();

	let realStories = $state<StoryWithProfile[]>([]);
	let showCreateModal = $state(false);
	let showViewer = $state(false);
	let activeUserIndex = $state(0);

	import { SvelteMap } from 'svelte/reactivity';

	/**
	 * Groups stories by user_id for the single-ring per user behavior.
	 */
	const groupedStories = $derived.by((): UserStories[] => {
		const groups = new SvelteMap<string, UserStories>();

		realStories.forEach((s) => {
			const userId = s.user_id;
			if (!groups.has(userId)) {
				groups.set(userId, {
					userId,
					username: s.profiles?.username || 'unknown',
					avatarUrl: s.profiles?.avatar_url || null,
					stories: [],
					hasUnread: true // Future: track viewed status
				});
			}
			groups.get(userId)!.stories.push(s);
		});

		// Sort users by their most recent story
		return Array.from(groups.values()).sort((a, b) => {
			const aTime = new Date(a.stories[0].created_at).getTime();
			const bTime = new Date(b.stories[0].created_at).getTime();
			return bTime - aTime;
		});
	});

	function openUserStories(index: number) {
		activeUserIndex = index;
		showViewer = true;
	}

	async function loadStories() {
		try {
			realStories = await storyService.getStories(workspaceId);
		} catch (err) {
			console.error('[StoriesBar] Failed to load stories:', err);
		}
	}

	onMount(() => {
		loadStories();
	});
</script>

<CreateStoryModal bind:show={showCreateModal} onsuccess={loadStories} />

<div class="scrollbar-none flex w-full gap-4 overflow-x-auto py-2">
	<!-- Create Story Button -->
	<button
		class="group flex flex-col items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
		onclick={() => (showCreateModal = true)}
	>
		<div
			class="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-stroke bg-surface-dim transition-colors group-hover:border-brand-orange"
		>
			<span class="text-xl font-bold text-zinc-500 group-hover:text-brand-orange">+</span>
		</div>
		<span class="text-[10px] font-bold text-content-dim uppercase">Your Story</span>
	</button>

	{#each groupedStories as userGroup, i (userGroup.userId)}
		<button
			class="group flex flex-col items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
			onclick={() => openUserStories(i)}
		>
			<div
				class="relative rounded-full p-[3px] {userGroup.hasUnread
					? 'bg-linear-to-tr from-brand-orange via-yellow-500 to-brand-blue'
					: 'bg-stroke'}"
			>
				<div class="rounded-full bg-surface p-[2px]">
					<Avatar name={userGroup.username} src={userGroup.avatarUrl} size="lg" />
				</div>
			</div>
			<span
				class="max-w-[64px] truncate text-[10px] font-bold text-content-dim group-hover:text-content"
			>
				{userGroup.username}
			</span>
		</button>
	{/each}
</div>

{#if showViewer && groupedStories[activeUserIndex]}
	<StoryViewer
		stories={groupedStories[activeUserIndex].stories}
		onClose={() => (showViewer = false)}
	/>
{/if}

<style>
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
