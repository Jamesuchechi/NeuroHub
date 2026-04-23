<script lang="ts">
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import ChatMessage from './ChatMessage.svelte';
	import MessageInput from './MessageInput.svelte';
	import { uiStore } from '$lib/stores/uiStore';

	let { messageId, onClose } = $props<{
		messageId: string;
		onClose: () => void;
	}>();

	const parentMessage = $derived(chatStore.messages.find((m) => m.id === messageId));
	const threadMessages = $derived(chatStore.messages.filter((m) => m.parent_id === messageId));

	// Scrolled to bottom for threads?
	let scrollContainer: HTMLDivElement;

	$effect(() => {
		if (threadMessages.length && scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	});
</script>

<div
	class="flex h-full w-full flex-col overflow-hidden border-l border-stroke bg-surface shadow-2xl md:max-w-[450px] md:min-w-[320px]"
>
	<!-- Thread Header -->
	<header
		class="flex shrink-0 items-center justify-between border-b border-stroke bg-surface-dim/40 px-6 py-4"
	>
		<div>
			<h3 class="text-sm font-black tracking-widest text-content uppercase">Thread</h3>
			{#if parentMessage}
				<p class="text-[10px] text-content-dim">#{chatStore.activeChannel?.name}</p>
			{/if}
		</div>
		<button
			onclick={onClose}
			class="rounded-lg p-2 text-content-dim transition-colors hover:bg-surface-dim hover:text-content"
			aria-label="Close thread"
			title="Close thread"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</header>

	<!-- Parent Message & Thread Feed -->
	<div bind:this={scrollContainer} class="scrollbar-hide flex-1 overflow-y-auto py-4">
		{#if parentMessage}
			<div class="mb-4 border-b border-stroke/30 pb-4">
				<ChatMessage message={parentMessage} onReply={undefined} />
			</div>

			<div class="mb-4 px-6">
				<p class="text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase">
					{threadMessages.length} Replies
				</p>
			</div>

			<div class="space-y-1">
				{#each threadMessages as msg (msg.id)}
					<ChatMessage message={msg} onReply={undefined} />
				{/each}
			</div>
		{:else}
			<div class="flex h-full flex-col items-center justify-center p-8 text-center">
				<p class="text-sm text-content-dim">Message not found.</p>
			</div>
		{/if}
	</div>

	<!-- Thread Input -->
	<footer
		class="shrink-0 border-t border-stroke bg-surface-dim/20 p-4 {$uiStore.isMobile ? 'pb-20' : ''}"
	>
		<MessageInput
			channelId={chatStore.activeChannelId || ''}
			parentId={messageId}
			placeholder="Reply to thread..."
		/>
	</footer>
</div>
