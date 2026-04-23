<script lang="ts">
	import { activityService } from '$lib/services/activity';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { workspaceId = null, userId = null } = $props<{
		workspaceId?: string | null;
		userId?: string | null;
	}>();

	const newCount = $derived($activityService.newActivityCount);

	function handleRefresh() {
		activityService.fetchActivities(workspaceId, userId);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

{#if newCount > 0}
	<div
		class="fixed top-24 left-1/2 z-50 -translate-x-1/2"
		in:fly={{ y: -20, duration: 400, easing: cubicOut }}
		out:fade
	>
		<button
			onclick={handleRefresh}
			class="flex items-center gap-2 rounded-full bg-brand-orange px-6 py-2.5 text-sm font-bold text-white shadow-2xl shadow-brand-orange/40 transition-all hover:scale-105 hover:bg-orange-600 active:scale-95"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2.5"
					d="M5 10l7-7m0 0l7 7m-7-7v18"
				/>
			</svg>
			Show {newCount} new {newCount === 1 ? 'post' : 'posts'}
		</button>
	</div>
{/if}
