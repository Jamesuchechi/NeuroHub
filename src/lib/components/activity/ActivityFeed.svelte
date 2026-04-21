<script lang="ts">
	import { notificationStore, type Notification } from '$lib/stores/notificationStore.svelte';
	import Avatar from '../ui/Avatar.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fly } from 'svelte/transition';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { resolve } from '$app/paths';

	const workspaceId = $derived($workspaceStore.currentWorkspace?.id);

	const activityNotifications = $derived(
		notificationStore.notifications.filter(
			(n) =>
				(n.type === 'mention' || n.type === 'reply' || n.type === 'reaction') &&
				(!workspaceId || n.workspace_id === workspaceId)
		)
	);

	function getActionText(n: Notification) {
		switch (n.type) {
			case 'mention':
				return 'mentioned you in';
			case 'reply':
				return 'replies to your message in';
			case 'reaction':
				return `reacted with ${n.payload.emoji || ''} in`;
			default:
				return 'notified you in';
		}
	}

	function getRawSourceLink(n: Notification) {
		const slug = $workspaceStore.currentWorkspace?.slug;
		if (!slug) return '';

		if (n.payload.channel_id) {
			return `/workspace/${slug}/chat/${n.payload.channel_id}`;
		}
		return '';
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between border-b border-stroke pb-4">
		<h2 class="text-xl font-black text-content">Activity Feed</h2>
		<button
			onclick={() => notificationStore.markAllAsRead(workspaceId)}
			class="text-xs font-bold text-brand-orange hover:underline focus:outline-none"
		>
			Mark all as read
		</button>
	</div>

	{#if activityNotifications.length === 0}
		<div class="flex flex-col items-center justify-center py-24 text-center">
			<div
				class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-dim/40 text-content-dim"
			>
				<svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
					/>
				</svg>
			</div>
			<p class="text-sm font-medium text-content-dim">No recent mentions or reactions.</p>
			<p class="mt-1 text-xs text-zinc-600">
				Activity will appear here when your team interacts with you.
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each activityNotifications as n (n.id)}
				<a
					href={resolve((getRawSourceLink(n) || '#') as unknown as '/')}
					class="relative flex gap-4 rounded-2xl border border-stroke bg-surface/40 p-4 transition-all hover:border-brand-orange/30 hover:bg-surface-dim/30 {!n.read_at
						? 'ring-1 ring-brand-orange/20'
						: ''}"
					in:fly={{ y: 10, duration: 300 }}
				>
					{#if !n.read_at}
						<div
							class="absolute top-1/2 -left-1 h-8 w-1 -translate-y-1/2 rounded-full bg-brand-orange shadow-neon-orange"
						></div>
					{/if}

					<div class="shrink-0">
						<Avatar src={n.actor?.avatar_url} name={n.actor?.username || 'User'} size="md" />
					</div>

					<div class="flex-1 space-y-1">
						<div class="flex items-center justify-between">
							<p class="text-sm">
								<span class="font-bold text-content">{n.actor?.username || 'Someone'}</span>
								<span class="text-content-dim">{getActionText(n)}</span>
								<span class="font-bold text-brand-orange"
									>#{n.payload.channel_name || 'channel'}</span
								>
							</p>
							<span class="text-[10px] whitespace-nowrap text-zinc-500">
								{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
							</span>
						</div>

						{#if n.payload.preview}
							<div
								class="truncate rounded-lg bg-surface-dim/50 p-2 text-xs text-content-dim italic"
							>
								"{n.payload.preview}"
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
