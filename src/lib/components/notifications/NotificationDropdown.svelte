<script lang="ts">
	import { fly } from 'svelte/transition';
	import { notificationStore } from '$lib/stores/notificationStore.svelte';
	import NotificationItem from './NotificationItem.svelte';
	import { resolve } from '$app/paths';
	import { workspaceStore } from '$lib/stores/workspaceStore';

	let { onclose } = $props<{ onclose: () => void }>();

	const unreadNotifications = $derived(notificationStore.notifications.filter((n) => !n.read_at));
	const readNotifications = $derived(notificationStore.notifications.filter((n) => n.read_at));
</script>

<div
	transition:fly={{ y: -10, duration: 200 }}
	class="relative w-80 overflow-hidden rounded-2xl border border-stroke bg-surface-dim shadow-2xl backdrop-blur-xl md:w-96"
>
	<!-- Header -->
	<header class="flex items-center justify-between border-b border-stroke bg-surface/50 p-4">
		<div class="flex items-center gap-2">
			<h3 class="text-sm font-black tracking-widest text-content uppercase">Notifications</h3>
			{#if notificationStore.unreadCount > 0}
				<span class="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">
					{notificationStore.unreadCount} new
				</span>
			{/if}
		</div>
		<button
			onclick={onclose}
			class="text-content-dim transition-colors hover:text-white"
			aria-label="Close"
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

	<!-- List -->
	<div class="scrollbar-none max-h-[400px] overflow-y-auto p-2">
		{#if notificationStore.isLoading}
			<div class="flex flex-col gap-2 p-4">
				{#each Array(3) as _, i (i)}
					<div class="h-16 animate-pulse rounded-xl bg-surface/50"></div>
				{/each}
			</div>
		{:else if notificationStore.notifications.length === 0}
			<div class="flex flex-col items-center justify-center p-12 text-center">
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-dim/50">
					<svg
						class="h-8 w-8 text-content-dim/20"
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
				</div>
				<p class="text-xs font-bold text-content-dim">All caught up!</p>
				<p class="mt-1 text-[10px] text-content-dim/40">No new notifications at the moment.</p>
			</div>
		{:else}
			{#if unreadNotifications.length > 0}
				<div class="mb-2 px-2 py-1">
					<span class="text-[10px] font-black tracking-widest text-brand-orange uppercase">New</span
					>
				</div>
				<div class="space-y-1">
					{#each unreadNotifications as n (n.id)}
						<NotificationItem notification={n} />
					{/each}
				</div>
			{/if}

			{#if readNotifications.length > 0}
				<div class="mt-4 mb-2 px-2 py-1">
					<span class="text-[10px] font-black tracking-widest text-content-dim/40 uppercase"
						>Recently Read</span
					>
				</div>
				<div class="space-y-1">
					{#each readNotifications as n (n.id)}
						<NotificationItem notification={n} />
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<!-- Footer -->
	{#if notificationStore.notifications.length > 0}
		<footer class="flex items-center justify-between border-t border-stroke bg-surface/30 p-3">
			<a
				href={resolve(`/workspace/${$workspaceStore.currentWorkspace?.slug}/notifications`)}
				class="text-[10px] font-bold text-brand-orange hover:underline"
				onclick={onclose}
			>
				View All
			</a>
			<a
				href={resolve(`/workspace/${$workspaceStore.currentWorkspace?.slug}/settings`)}
				class="text-[10px] font-bold text-content-dim hover:text-content"
				onclick={onclose}
			>
				Settings
			</a>
		</footer>
	{/if}
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
