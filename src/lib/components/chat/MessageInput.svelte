<script lang="ts">
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import { fly } from 'svelte/transition';
	import Button from '../ui/Button.svelte';
	import EmojiPicker from './EmojiPicker.svelte';

	let {
		channelId,
		parentId = null,
		placeholder = 'Type a message...'
	} = $props<{
		channelId: string;
		parentId?: string | null;
		placeholder?: string;
	}>();

	let content = $state('');
	let isFocused = $state(false);
	let isSubmitting = $state(false);
	let showEmojiPicker = $state(false);
	let typingTimeout: ReturnType<typeof setTimeout> | undefined;

	function handleInput() {
		if (typingTimeout) clearTimeout(typingTimeout);
		chatStore.setTyping(channelId, true);
		typingTimeout = setTimeout(() => {
			chatStore.setTyping(channelId, false);
		}, 3000);
	}

	async function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (typingTimeout) clearTimeout(typingTimeout);
			chatStore.setTyping(channelId, false);
			await send();
		}
	}

	async function send() {
		if (!content.trim() || isSubmitting) return;

		isSubmitting = true;
		const messageContent = content;
		content = ''; // Clear early for better UX

		try {
			await chatStore.sendMessage(messageContent, { parentId });
		} catch (err) {
			content = messageContent; // Restore on error
			console.error('[MessageInput] Failed to send:', err);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div
	class="relative flex flex-col gap-2 rounded-2xl border border-stroke bg-surface-dim/50 p-3 transition-all duration-300 {isFocused
		? 'bg-surface-dim/80 shadow-lg ring-1 ring-brand-orange/30'
		: ''}"
>
	<div class="flex items-end gap-3">
		<!-- Emoji/Plus placeholder -->
		<button
			class="mb-1 flex h-9 w-9 items-center justify-center rounded-xl p-2 text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
			aria-label="Attach file"
			title="Attach file"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</button>

		<textarea
			bind:value={content}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={() => (isFocused = true)}
			onblur={() => (isFocused = false)}
			{placeholder}
			class="max-h-[200px] min-h-[40px] w-full flex-1 resize-none bg-transparent py-2 text-sm text-content outline-none placeholder:text-content-dim/30"
			style="height: auto;"
		></textarea>

		<div class="relative mb-1 flex items-center gap-1">
			<button
				onclick={() => (showEmojiPicker = !showEmojiPicker)}
				class="flex h-9 w-9 items-center justify-center rounded-xl p-2 text-content-dim transition-colors hover:bg-surface hover:text-brand-orange {showEmojiPicker
					? 'border-brand-orange/20 bg-surface text-brand-orange'
					: ''}"
				aria-label="Insert emoji"
				title="Insert emoji"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</button>

			{#if showEmojiPicker}
				<div
					transition:fly={{ y: 20, duration: 400 }}
					class="absolute right-0 bottom-16 z-50 shadow-2xl"
				>
					<EmojiPicker
						onSelect={(emoji) => {
							content += emoji;
							showEmojiPicker = false;
						}}
					/>
				</div>
			{/if}

			<Button
				variant="primary"
				size="sm"
				width="auto"
				disabled={!content.trim() || isSubmitting}
				onclick={send}
				class="h-9 w-9 rounded-xl p-0!"
				aria-label="Send message"
				title="Send message"
			>
				<svg class="h-4 w-4 rotate-90" fill="currentColor" viewBox="0 0 20 20">
					<path
						d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
					/>
				</svg>
			</Button>
		</div>
	</div>
</div>
