<script lang="ts">
	import { onMount } from 'svelte';
	import type { Message } from '$lib/services/chatService';
	import ChatMessage from './ChatMessage.svelte';

	let { messages, onReply, onUpdate, onDelete } = $props<{
		messages: Message[];
		onReply: (id: string) => void;
		onUpdate: (id: string, content: string) => void;
		onDelete: (id: string) => void;
	}>();

	let container: HTMLElement;
	let isVisible = $state(true);
	let height = $state(0);
	let hasBeenMeasured = $state(false);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				isVisible = entry.isIntersecting;

				// Capture height when it becomes visible so we can preserve it when hidden
				if (entry.isIntersecting && !hasBeenMeasured) {
					height = container.offsetHeight;
					hasBeenMeasured = true;
				} else if (entry.isIntersecting) {
					height = container.offsetHeight;
				}
			},
			{
				rootMargin: '1000px 0px', // Buffer of 1000px above/below
				threshold: 0
			}
		);

		observer.observe(container);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={container}
	class="message-chunk"
	style="min-height: {isVisible ? 'auto' : height + 'px'}"
>
	{#if isVisible}
		{#each messages as message (message.id)}
			<ChatMessage {message} {onReply} {onUpdate} {onDelete} />
		{/each}
	{:else}
		<!-- Placeholder to keep the scroll height stable -->
		<div style="height: {height}px"></div>
	{/if}
</div>

<style>
	.message-chunk {
		display: flex;
		flex-direction: column;
	}
</style>
