<script lang="ts">
	import { page } from '$app/state';
	import ChannelView from '$lib/components/chat/ChannelView.svelte';

	let channelId = $derived(page.params.channelId);
</script>

<div class="h-full">
	{#if channelId}
		<ChannelView {channelId} />
	{:else}
		<div class="flex h-full items-center justify-center text-content-dim">
			<p>Select a channel to start chatting</p>
		</div>
	{/if}
</div>
