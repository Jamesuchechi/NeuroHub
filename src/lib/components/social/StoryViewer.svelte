<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Avatar from '../ui/Avatar.svelte';
	import type { StoryWithProfile } from '$lib/services/storyService';

	interface Props {
		stories: StoryWithProfile[];
		initialIndex?: number;
		onClose: () => void;
	}

	let { stories, initialIndex = 0, onClose }: Props = $props();

	let currentIndex = $state(0);
	let progress = $state(0);
	let isPaused = $state(false);
	let timer: ReturnType<typeof setInterval> | null = null;

	$effect.pre(() => {
		currentIndex = initialIndex;
	});

	const duration = 5000; // 5 seconds per story
	const currentStory = $derived(stories[currentIndex]);

	function startTimer() {
		stopTimer();
		timer = setInterval(() => {
			if (!isPaused) {
				progress += 1;
				if (progress >= 100) {
					nextStory();
				}
			}
		}, duration / 100);
	}

	function stopTimer() {
		if (timer) clearInterval(timer);
	}

	function nextStory() {
		if (currentIndex < stories.length - 1) {
			currentIndex += 1;
			progress = 0;
		} else {
			onClose();
		}
	}

	function prevStory() {
		if (currentIndex > 0) {
			currentIndex -= 1;
			progress = 0;
		} else {
			progress = 0;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') nextStory();
		if (e.key === 'ArrowLeft') prevStory();
		if (e.key === 'Escape') onClose();
		if (e.key === ' ') isPaused = !isPaused;
	}

	onMount(() => {
		startTimer();
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		stopTimer();
		window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div
	class="fixed inset-0 z-100 flex items-center justify-center bg-black/95 backdrop-blur-3xl"
	in:fade={{ duration: 300 }}
	out:fade={{ duration: 200 }}
>
	<!-- Background Blur Layer -->
	{#key currentStory.id}
		{#if currentStory.media_url}
			<div
				class="absolute inset-0 opacity-30 blur-3xl transition-all duration-1000"
				style="background-image: url({currentStory.media_url}); background-size: cover; background-position: center;"
			></div>
		{:else if currentStory.background_gradient}
			<div
				class="absolute inset-0 opacity-30 blur-3xl transition-all duration-1000"
				style="background: {currentStory.background_gradient}"
			></div>
		{/if}
	{/key}

	<div
		class="relative h-full w-full max-w-lg overflow-hidden md:h-[85vh] md:rounded-[40px] md:shadow-2xl md:ring-1 md:ring-white/10"
	>
		<!-- Controls Overlay -->
		<div class="absolute inset-x-0 top-0 z-30 p-4 pt-10 md:pt-6">
			<!-- Progress Bars -->
			<div class="mb-4 flex gap-1.5">
				{#each stories as _, i (i)}
					<div class="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
						<div
							class="h-full bg-white transition-all duration-100"
							style="width: {i < currentIndex
								? '100%'
								: i === currentIndex
									? progress + '%'
									: '0%'}"
						></div>
					</div>
				{/each}
			</div>

			<!-- Header -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Avatar
						name={currentStory.profiles?.username || ''}
						src={currentStory.profiles?.avatar_url || ''}
						size="sm"
						class="ring-2 ring-white/20"
					/>
					<div>
						<p class="text-sm font-bold text-white shadow-sm">{currentStory.profiles?.username}</p>
						<p class="text-[10px] font-medium tracking-widest text-white/60 uppercase">
							{new Date(currentStory.created_at).toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit'
							})}
						</p>
					</div>
				</div>
				<button
					onclick={onClose}
					aria-label="Close story viewer"
					class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>

		<!-- Navigation Zones -->
		<div class="absolute inset-0 z-20 flex">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="h-full flex-1 cursor-w-resize"
				onclick={prevStory}
				onmousedown={() => (isPaused = true)}
				onmouseup={() => (isPaused = false)}
			></div>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="h-full flex-1 cursor-e-resize"
				onclick={nextStory}
				onmousedown={() => (isPaused = true)}
				onmouseup={() => (isPaused = false)}
			></div>
		</div>

		<!-- Media Content -->
		<div class="relative flex h-full w-full items-center justify-center bg-zinc-900">
			{#key currentStory.id}
				{#if currentStory.media_type === 'text'}
					<div
						class="flex h-full w-full items-center justify-center p-12 text-center"
						style="background: {currentStory.background_gradient ||
							'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}"
						in:scale={{ start: 1.1, duration: 400, easing: cubicOut }}
					>
						<p
							class="text-3xl leading-tight font-black text-white drop-shadow-2xl"
							style="font-family: {currentStory.font_family || 'Inter'}"
						>
							{currentStory.content}
						</p>
					</div>
				{:else if currentStory.media_type?.startsWith('video')}
					<video
						src={currentStory.media_url}
						class="h-full w-full object-cover"
						autoplay
						muted={isPaused}
						onended={nextStory}
						in:scale={{ start: 1.1, duration: 400, easing: cubicOut }}
					></video>
				{:else}
					<img
						src={currentStory.media_url}
						alt="Story"
						class="h-full w-full object-contain md:object-cover"
						in:scale={{ start: 1.1, duration: 400, easing: cubicOut }}
					/>
				{/if}
			{/key}
		</div>

		<!-- Story Caption (Only for media stories) -->
		{#if currentStory.content && currentStory.media_type !== 'text'}
			<div
				class="absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/80 via-black/40 to-transparent p-10 pb-20 md:pb-10"
			>
				<p class="text-base leading-relaxed font-medium text-white drop-shadow-lg">
					{currentStory.content}
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		overflow: hidden;
	}
</style>
