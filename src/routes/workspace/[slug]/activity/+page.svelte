<script lang="ts">
	import ActivityFeed from '$lib/components/activity/ActivityFeed.svelte';
	import { fade } from 'svelte/transition';
</script>

<svelte:head>
	<title>Activity Feed | NeuroHub</title>
</svelte:head>

<div class="flex h-full flex-col overflow-hidden bg-surface-dim/20" in:fade>
	<header class="border-b border-stroke bg-surface/40 px-4 py-4 backdrop-blur-md md:px-8 md:py-6">
		<h1 class="text-2xl font-black text-content">Activity Center</h1>
		<p class="text-xs text-content-dim">
			Catch up on mentions, replies, and reactions across your workspace.
		</p>
	</header>

	<div class="scrollbar-hide flex-1 overflow-y-auto p-4 md:p-8">
		<div class="mx-auto max-w-3xl">
			<ActivityFeed />
		</div>
	</div>
</div>
