<script lang="ts">
	import { tick } from 'svelte';
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import { uiStore } from '$lib/stores/uiStore';
	import ChatMessage from './ChatMessage.svelte';
	import MessageInput from './MessageInput.svelte';
	import AiResponse from '../ai/AiResponse.svelte';
	import ThreadView from './ThreadView.svelte';
	import Skeleton from '../ui/Skeleton.svelte';
	import PinnedResources from './PinnedResources.svelte';
	import { fade, slide } from 'svelte/transition';
	import { aiStore } from '$lib/stores/aiStore.svelte';

	let { channelId } = $props<{ channelId: string }>();

	let scrollContainer: HTMLDivElement;
	let topObserver: HTMLDivElement;
	let shouldScrollToBottom = true;

	$effect(() => {
		if (!topObserver || !channelId) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && chatStore.messages.length >= 50) {
					chatStore.loadMoreMessages(channelId);
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(topObserver);
		return () => observer.disconnect();
	});

	const typingUserIds = $derived(
		Array.from(chatStore.typingUsers[channelId] || []).filter(
			(uid) => uid !== chatStore.presence[uid]?.[0]?.user_id
		)
	);
	// Actually, presence would be better for names, but for now we just show count or generic
	const typingCount = $derived(typingUserIds.length);

	$effect(() => {
		if (channelId) {
			chatStore.selectChannel(channelId);
		}
	});

	// Auto-scroll to bottom on new messages
	$effect(() => {
		if (chatStore.messages.length && shouldScrollToBottom) {
			tick().then(() => {
				if (scrollContainer) {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				}
			});
		}
	});

	function handleScroll() {
		if (!scrollContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
		// If we are within 100px of bottom, enable auto-scroll
		shouldScrollToBottom = scrollHeight - scrollTop - clientHeight < 100;
	}
</script>

<div class="flex h-full bg-surface-dim/20">
	<div class="flex min-w-0 flex-1 flex-col">
		<!-- Channel Header -->
		<header
			class="flex shrink-0 items-center justify-between border-b border-stroke bg-surface/40 px-6 py-4 backdrop-blur-md"
		>
			<div class="flex flex-col">
				<h2 class="flex items-center gap-2 text-lg font-black text-content">
					<span class="text-xl text-brand-orange">
						{chatStore.activeChannel?.type === 'text' ? '#' : '👤'}
					</span>
					{chatStore.activeChannel?.display_name || 'loading...'}
				</h2>
				<p class="max-w-md truncate text-xs text-content-dim">
					{chatStore.activeChannel?.description ||
						(chatStore.activeChannel?.type === 'private'
							? 'Direct message channel'
							: 'No description set.')}
				</p>
			</div>

			<div class="flex items-center gap-4">
				<button
					class="text-content-dim transition-colors hover:text-content"
					aria-label="Search in channel"
					title="Search in channel"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</button>
				<button
					onclick={() => uiStore.setChannelSettingsModalOpen(true)}
					class="text-content-dim transition-colors hover:text-content"
					aria-label="Channel options"
					title="Channel options"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
						/>
					</svg>
				</button>
			</div>
		</header>
		<PinnedResources {channelId} />

		<!-- Message List -->
		<div
			bind:this={scrollContainer}
			onscroll={handleScroll}
			class="scrollbar-hide flex flex-1 flex-col overflow-y-auto pt-4"
		>
			<div bind:this={topObserver} class="h-1 w-full"></div>
			{#if chatStore.isLoadingMessages && chatStore.messages.length === 0}
				<div class="space-y-6 px-6 py-4">
					{#each Array(5) as _, i (i)}
						<div class="flex gap-4">
							<Skeleton type="circle" width="40px" height="40px" />
							<div class="flex-1 space-y-2">
								<Skeleton width="120px" height="12px" />
								<Skeleton width="100%" height="40px" />
							</div>
						</div>
					{/each}
				</div>
			{:else if chatStore.messages.length === 0}
				<div class="flex flex-1 flex-col items-center justify-center p-12 text-center">
					<div
						class="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange"
					>
						<svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-bold text-content italic">
						Welcome to {chatStore.activeChannel?.type === 'text' ? '#' : ''}{chatStore.activeChannel
							?.display_name}!
					</h3>
					<p class="mt-2 max-w-xs text-sm text-content-dim">
						This is the start of your conversation in {chatStore.activeChannel?.display_name}. Send
						a message to get things rolling.
					</p>
				</div>
			{:else}
				{#each chatStore.messages.filter((m) => !m.parent_id) as message (message.id)}
					<ChatMessage
						{message}
						onReply={(id) => (chatStore.selectedThreadId = id)}
						onUpdate={(id, content) => chatStore.editMessage(id, content)}
						onDelete={(id) => chatStore.deleteMessage(id)}
					/>
				{/each}

				{#if aiStore.isGenerating || aiStore.currentGeneration}
					<div class="px-6">
						<AiResponse
							onAccept={(content) => {
								chatStore.sendMessage(content);
								aiStore.clearError();
							}}
							onCancel={() => aiStore.clearError()}
						/>
					</div>
				{/if}

				<!-- Typing Indicator -->
				{#if typingCount > 0}
					<div class="px-6 py-2" in:fade>
						<div class="flex items-center gap-2 text-[10px] font-medium text-content-dim italic">
							<div class="flex gap-1">
								<span class="h-1 w-1 animate-bounce rounded-full bg-brand-orange"></span>
								<span
									class="h-1 w-1 animate-bounce rounded-full bg-brand-orange [animation-delay:0.2s]"
								></span>
								<span
									class="h-1 w-1 animate-bounce rounded-full bg-brand-orange [animation-delay:0.4s]"
								></span>
							</div>
							<span>{typingCount === 1 ? 'Someone' : `${typingCount} users`} typing...</span>
						</div>
					</div>
				{/if}
				<div class="h-4"></div>
			{/if}
		</div>

		<!-- Message Input Container -->
		<footer class="shrink-0 bg-transparent p-4">
			<MessageInput {channelId} />
			<p
				class="mt-2 text-center text-[10px] font-medium tracking-tight text-content-dim/40 uppercase"
			>
				Press <span class="text-content-dim/60">Enter</span> to send ·
				<span class="text-content-dim/60">Shift+Enter</span> for new line
			</p>
		</footer>
	</div>

	<!-- Thread Sidebar -->
	{#if chatStore.selectedThreadId}
		<div transition:slide={{ axis: 'x', duration: 400 }} class="h-full">
			<ThreadView
				messageId={chatStore.selectedThreadId}
				onClose={() => (chatStore.selectedThreadId = null)}
			/>
		</div>
	{/if}
</div>
