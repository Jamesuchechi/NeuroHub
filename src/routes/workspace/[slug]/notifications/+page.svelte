<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { notificationStore } from '$lib/stores/notificationStore.svelte';
	import NotificationItem from '$lib/components/notifications/NotificationItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { fade, fly } from 'svelte/transition';

	const currentWorkspace = $derived($workspaceStore.currentWorkspace);

	onMount(() => {
		notificationStore.init();
	});

	onDestroy(() => {
		notificationStore.cleanup();
	});

	async function markAllAsRead() {
		if (!currentWorkspace) return;
		await notificationStore.markAllAsRead(currentWorkspace.id);
	}
</script>

<div class="scrollbar-none h-full overflow-y-auto bg-surface p-6 md:p-12">
	<div class="mx-auto max-w-4xl">
		<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
			<div>
				<h1 class="text-4xl font-black tracking-tighter text-content">Notifications</h1>
				<p class="mt-2 text-sm text-content-dim">
					Stay updated with mentions, thread replies, and workspace activity.
				</p>
			</div>

			<div class="flex items-center gap-3">
				{#if notificationStore.unreadCount > 0}
					<Button variant="secondary" size="sm" onclick={markAllAsRead}>Mark all as read</Button>
				{/if}
			</div>
		</header>

		{#if notificationStore.isLoading}
			<div class="space-y-4">
				{#each Array(5) as _, i (i)}
					<div
						class="h-24 animate-pulse rounded-2xl border border-stroke bg-surface-dim"
						style:animation-delay="{i * 100}ms"
					></div>
				{/each}
			</div>
		{:else if notificationStore.notifications.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stroke py-20 text-center"
				in:fade
			>
				<div
					class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-dim text-content-dim"
				>
					<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
						/>
					</svg>
				</div>
				<h3 class="text-lg font-bold text-content">All caught up</h3>
				<p class="mt-1 text-sm text-content-dim">You don't have any notifications at the moment.</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each notificationStore.notifications as notification (notification.id)}
					<div in:fly={{ y: 20, duration: 400 }}>
						<NotificationItem {notification} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
