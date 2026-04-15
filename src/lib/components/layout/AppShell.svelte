<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import Topbar from './Topbar.svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { children } = $props();
</script>

<div class="flex h-screen w-full overflow-hidden bg-black selection:bg-orange-500/30">
	<!-- Left: Navigation Sidebar -->
	<Sidebar />

	<!-- Right: Content Area -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Main Top Header -->
		<div in:fly={{ y: -64, duration: 800, easing: cubicOut, delay: 100 }}>
			<Topbar />
		</div>

		<!-- Scrollable Content Viewport -->
		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>
