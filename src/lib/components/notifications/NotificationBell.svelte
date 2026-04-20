<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { notificationStore } from '$lib/stores/notificationStore.svelte';
	import NotificationDropdown from './NotificationDropdown.svelte';

	let showDropdown = $state(false);

	onMount(() => {
		notificationStore.init();
	});

	onDestroy(() => {
		notificationStore.cleanup();
	});

	function toggleDropdown() {
		showDropdown = !showDropdown;
	}
</script>

<div class="relative">
	<button
		onclick={toggleDropdown}
		class="relative flex h-9 w-9 items-center justify-center rounded-xl border border-stroke bg-surface-dim/50 text-content-dim transition-all hover:border-brand-orange/30 hover:bg-surface-dim hover:text-white {showDropdown
			? 'border-brand-orange/50 bg-surface-dim text-brand-orange ring-1 ring-brand-orange/20'
			: ''}"
		aria-label="Notifications"
		title="Notifications"
	>
		<svg
			class="h-4 w-4 {notificationStore.unreadCount > 0 ? 'animate-pulse text-brand-orange' : ''}"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
				d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
			/>
		</svg>

		{#if notificationStore.unreadCount > 0}
			<span
				class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-orange text-[8px] font-bold text-white shadow-lg ring-2 shadow-brand-orange/20 ring-black"
				in:fade
			>
				{notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount}
			</span>
		{/if}
	</button>

	{#if showDropdown}
		<!-- Click outside to close backdrop -->
		<div class="fixed inset-0 z-40" onclick={() => (showDropdown = false)} aria-hidden="true"></div>

		<div class="z-50">
			<NotificationDropdown onclose={() => (showDropdown = false)} />
		</div>
	{/if}
</div>
