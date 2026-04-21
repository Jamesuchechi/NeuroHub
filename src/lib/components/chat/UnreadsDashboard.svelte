<script lang="ts">
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import Avatar from '../ui/Avatar.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { notificationStore } from '$lib/stores/notificationStore.svelte';
	import { resolve } from '$app/paths';
	import { fly } from 'svelte/transition';

	const workspace = $derived($workspaceStore.currentWorkspace);
	const unreadChannels = $derived(
		chatStore.enrichedChannels.filter((c) => chatStore.channelHasUnread(c.id))
	);

	const unreadThreads = $derived(
		notificationStore.notifications.filter(
			(n) =>
				!n.read_at &&
				(n.type === 'reply' || n.type === 'mention') &&
				(!workspace?.id || n.workspace_id === workspace.id)
		)
	);

	function markAllRead() {
		unreadChannels.forEach((c) => {
			chatStore.markAsRead(c.id);
		});
		notificationStore.markAllAsRead(workspace?.id);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between border-b border-stroke pb-4">
		<div>
			<h2 class="text-xl font-black text-content">Unread Messages</h2>
			<p class="text-xs text-content-dim">
				You have {unreadChannels.length} channels with new activity.
			</p>
		</div>
		{#if unreadChannels.length > 0}
			<button
				onclick={markAllRead}
				class="rounded-lg bg-surface-dim px-3 py-1.5 text-xs font-bold text-brand-orange transition-all hover:bg-brand-orange hover:text-zinc-950"
			>
				Mark all as read
			</button>
		{/if}
	</div>

	{#if unreadChannels.length === 0}
		<div class="flex flex-col items-center justify-center py-24 text-center">
			<div
				class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"
			>
				<svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<p class="text-sm font-medium text-content">You're all caught up!</p>
			<p class="mt-1 text-xs text-content-dim">
				Any new messages in your channels will appear here.
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			{#each unreadChannels as channel (channel.id)}
				<a
					href={resolve(`/workspace/${workspace?.slug}/chat/${channel.id}` as unknown as '/')}
					class="group relative flex items-center gap-4 rounded-2xl border border-stroke bg-surface/40 p-4 transition-all hover:border-brand-orange/40 hover:bg-surface-dim/30 hover:shadow-xl"
					in:fly={{ y: 20, duration: 400 }}
				>
					<div class="relative shrink-0">
						{#if channel.type === 'private' && channel.name.startsWith('dm-')}
							<Avatar
								src={channel.display_avatar || undefined}
								name={channel.display_name}
								size="md"
							/>
						{:else if channel.type === 'group_dm'}
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange"
							>
								<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
							</div>
						{:else}
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-dim text-lg font-black text-brand-orange"
							>
								#
							</div>
						{/if}
						<div
							class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-brand-orange ring-2 ring-black"
						></div>
					</div>

					<div class="flex-1 overflow-hidden">
						<h4 class="truncate font-bold text-content group-hover:text-brand-orange">
							{channel.display_name}
						</h4>
						<p class="truncate text-[10px] tracking-wider text-content-dim uppercase">
							{channel.type === 'text'
								? 'Public Channel'
								: channel.type === 'group_dm'
									? 'Group DM'
									: 'Private Chat'}
						</p>
					</div>

					<svg
						class="h-5 w-5 text-zinc-700 transition-colors group-hover:text-brand-orange"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</a>
			{/each}
		</div>

		{#if unreadThreads.length > 0}
			<div class="mt-8 space-y-4">
				<div class="flex items-center gap-2">
					<h3 class="text-sm font-black tracking-widest text-content-dim uppercase">
						Active Threads
					</h3>
					<div class="h-px flex-1 bg-stroke"></div>
				</div>
				<div class="grid grid-cols-1 gap-3">
					{#each unreadThreads as thread (thread.id)}
						<a
							href={resolve(
								(thread.payload.channel_id
									? `/workspace/${workspace?.slug}/chat/${thread.payload.channel_id}`
									: '#') as unknown as '/'
							)}
							class="group flex items-start gap-4 rounded-2xl border border-stroke bg-surface/40 p-4 transition-all hover:border-brand-orange/40 hover:bg-surface-dim/30"
							onclick={() => notificationStore.markAsRead(thread.id)}
						>
							<div
								class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange"
							>
								{#if thread.type === 'mention'}
									<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
										<path
											d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"
										/>
									</svg>
								{:else}
									<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								{/if}
							</div>
							<div class="flex-1 overflow-hidden">
								<div class="flex items-center gap-2">
									<span class="text-xs font-black text-content"
										>{thread.actor?.username || 'Someone'}</span
									>
									<span class="text-[10px] text-content-dim">
										{thread.type === 'mention' ? 'mentioned you' : 'replied to you'}
									</span>
								</div>
								<p class="mt-1 truncate text-xs text-content-dim italic">
									"{thread.payload.preview || 'New message in thread'}"
								</p>
							</div>
							<div class="self-center text-[10px] text-content-dim">
								{thread.payload.channel_name ? `#${thread.payload.channel_name}` : ''}
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
