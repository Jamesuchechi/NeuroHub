<script lang="ts">
	import UnreadsDashboard from '$lib/components/chat/UnreadsDashboard.svelte';
	import { fade } from 'svelte/transition';
</script>

<svelte:head>
	<title>Unreads | NeuroHub</title>
</svelte:head>

<div class="flex h-full flex-col overflow-hidden bg-surface-dim/20" in:fade>
	<header class="border-b border-stroke bg-surface/40 px-8 py-6 backdrop-blur-md">
		<h1 class="text-2xl font-black text-content">Unreads Center</h1>
		<p class="text-xs text-content-dim">All your unread channels and threads in one place.</p>
	</header>

	<div class="scrollbar-hide flex-1 overflow-y-auto p-8">
		<div class="mx-auto max-w-4xl">
			<UnreadsDashboard />
		</div>
	</div>
</div>
