<script lang="ts">
	import Avatar from '../ui/Avatar.svelte';
	import CreateStoryModal from './CreateStoryModal.svelte';
	import StoryViewer from './StoryViewer.svelte';
	import { storyService, type StoryWithProfile } from '$lib/services/storyService';
	import { onMount } from 'svelte';

	interface StoryItem {
		id: string;
		username: string;
		avatarUrl?: string;
		hasUnread: boolean;
	}

	let { workspaceId = null, onStoryClick } = $props<{
		workspaceId?: string | null;
		onStoryClick?: (id: string) => void;
	}>();

	let realStories = $state<StoryWithProfile[]>([]);
	let showCreateModal = $state(false);
	let showViewer = $state(false);
	let activeStoryIndex = $state(0);

	function openStory(index: number) {
		activeStoryIndex = index;
		showViewer = true;
		if (onStoryClick) onStoryClick(displayStories[index].id);
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

	interface ExtendedStoryItem extends StoryItem {
		raw?: StoryWithProfile;
	}

	// combine props stories with real stories, prioritize props if provided
	const displayStories = $derived.by((): ExtendedStoryItem[] => {
		if (realStories.length === 0) return [];

		return (realStories as StoryWithProfile[]).map((s) => ({
			id: s.id,
			username: s.profiles?.username || 'unknown',
			avatarUrl: s.profiles?.avatar_url || undefined,
			hasUnread: true,
			raw: s
		}));
	});

	// Convert displayStories back to StoryWithProfile if they are mocks
	const storiesForViewer = $derived.by(() => {
		return displayStories.map((s, _i) => {
			if ('raw' in s) return s.raw as StoryWithProfile;
			// Mock fallback for viewer
			return {
				id: s.id,
				user_id: 'mock',
				media_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
				media_type: 'image',
				content: 'Mock story content for preview.',
				expires_at: new Date(Date.now() + 86400000).toISOString(),
				created_at: new Date().toISOString(),
				profiles: { username: s.username, avatar_url: s.avatarUrl || null }
			} as StoryWithProfile;
		});
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

	{#each displayStories as story, i (story.id)}
		<button
			class="group flex flex-col items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
			onclick={() => openStory(i)}
		>
			<div
				class="relative rounded-full p-[3px] {story.hasUnread
					? 'bg-linear-to-tr from-brand-orange via-yellow-500 to-brand-blue'
					: 'bg-stroke'}"
			>
				<div class="rounded-full bg-surface p-[2px]">
					<Avatar name={story.username} src={story.avatarUrl} size="lg" />
				</div>
			</div>
			<span
				class="max-w-[64px] truncate text-[10px] font-bold text-content-dim group-hover:text-content"
			>
				{story.username}
			</span>
		</button>
	{/each}
</div>

{#if showViewer}
	<StoryViewer
		stories={storiesForViewer}
		initialIndex={activeStoryIndex}
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
