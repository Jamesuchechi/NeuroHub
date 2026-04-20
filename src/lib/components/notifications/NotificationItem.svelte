<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';
	import Avatar from '../ui/Avatar.svelte';
	import type { Notification } from '$lib/stores/notificationStore.svelte';
	import { notificationStore } from '$lib/stores/notificationStore.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { authStore } from '$lib/stores/authStore';
	import { workspacesService } from '$lib/services/workspaces';
	import Button from '../ui/Button.svelte';

	let { notification } = $props<{ notification: Notification }>();

	async function handleClick() {
		if (!notification.read_at) {
			await notificationStore.markAsRead(notification.id);
		}

		// Navigation logic
		const payload = notification.payload;
		const workspaceSlug = payload.workspace_slug || $workspaceStore.currentWorkspace?.slug;

		if (!workspaceSlug) return;

		let targetUrl = `/workspace/${workspaceSlug}`;

		switch (notification.type) {
			case 'mention':
			case 'reply':
				if (payload.channel_id) {
					targetUrl += `/chat/${payload.channel_id}`;
					if (payload.message_id) {
						// We might want to pass message_id to highlight it
						targetUrl += `?msg=${payload.message_id}`;
					}
				}
				break;
			case 'invite_accepted':
				targetUrl += `/settings`; // Go to team management
				break;
			case 'share':
				if (payload.note_id) {
					targetUrl += `/notes/${payload.note_id}`;
				}
				break;
		}

		goto(resolve(targetUrl as unknown as '/'));
	}

	async function handleAccept(e: MouseEvent) {
		e.stopPropagation();
		const payload = notification.payload;
		const user = $authStore.user;
		if (payload.invite_token && user) {
			try {
				await workspacesService.acceptInvite(payload.invite_token as string, user.id);
				await notificationStore.delete(notification.id);
				import('$lib/stores/toastStore').then((m) =>
					m.toast.show(`Joined ${payload.workspace_name}`, 'success')
				);
				goto(resolve(`/workspace/${payload.workspace_slug}` as unknown as '/'));
			} catch (err) {
				console.error('[NotificationItem] Failed to accept invite:', err);
				import('$lib/stores/toastStore').then((m) =>
					m.toast.show('Failed to accept invite', 'error')
				);
			}
		}
	}

	async function handleDecline(e: MouseEvent) {
		e.stopPropagation();
		try {
			await notificationStore.delete(notification.id);
			import('$lib/stores/toastStore').then((m) => m.toast.show('Invitation declined', 'info'));
		} catch (err) {
			console.error('[NotificationItem] Failed to decline invite:', err);
		}
	}

	const config = $derived.by(() => {
		switch (notification.type) {
			case 'mention':
				return { icon: '@', color: 'text-brand-orange', label: 'mentioned you' };
			case 'reply':
				return { icon: '↩️', color: 'text-brand-blue', label: 'replied to you' };
			case 'workspace_invite':
				return { icon: '📩', color: 'text-brand-orange', label: 'invited you to join' };
			case 'invite_accepted':
				return { icon: '🤝', color: 'text-brand-green', label: 'joined workspace' };
			default:
				return { icon: '🔔', color: 'text-content-dim', label: 'notified you' };
		}
	});
</script>

<div
	role="button"
	tabindex="0"
	onclick={handleClick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}}
	class="group relative flex w-full cursor-pointer gap-3 rounded-xl p-3 text-left transition-all hover:bg-surface-dim/80 {notification.read_at
		? 'opacity-70'
		: 'bg-surface-dim/40 shadow-sm'}"
>
	{#if !notification.read_at}
		<div
			class="absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand-orange shadow-neon-orange"
		></div>
	{/if}

	<div class="relative shrink-0">
		<Avatar
			name={notification.actor?.username || 'Unknown'}
			src={notification.actor?.avatar_url}
			size="sm"
		/>
		<div
			class="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-black bg-surface text-[8px]"
		>
			<span class={config.color}>{config.icon}</span>
		</div>
	</div>

	<div class="flex-1 overflow-hidden">
		<div class="flex items-center justify-between gap-2">
			<p class="truncate text-xs font-bold text-content">
				{notification.actor?.username || 'Someone'}
				<span class="font-normal text-content-dim/80">{config.label}</span>
			</p>
			<span class="shrink-0 text-[10px] text-content-dim/40">
				{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
			</span>
		</div>

		{#if notification.payload.preview}
			<p class="mt-1 line-clamp-1 text-[11px] text-content-dim/60 italic">
				"{notification.payload.preview}"
			</p>
		{:else if notification.payload.workspace_name}
			<p class="mt-1 text-[11px] text-content-dim/60">
				In <span class="font-bold text-brand-orange">{notification.payload.workspace_name}</span>
			</p>
		{/if}

		{#if notification.type === 'workspace_invite'}
			<div class="mt-3 flex gap-2">
				<Button
					size="sm"
					variant="primary"
					class="h-7 w-auto px-4 py-0 text-[10px] shadow-neon-orange"
					onclick={handleAccept}
				>
					Accept
				</Button>
				<Button
					size="sm"
					variant="secondary"
					class="h-7 w-auto px-4 py-0 text-[10px]"
					onclick={handleDecline}
				>
					Decline
				</Button>
			</div>
		{/if}
	</div>

	<!-- Delete Button hidden by default, visible on hover -->
	<button
		onclick={(e) => {
			e.stopPropagation();
			notificationStore.delete(notification.id);
		}}
		class="absolute top-2 right-2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
		title="Delete notification"
	>
		<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M6 18L18 6M6 6l12 12"
			/>
		</svg>
	</button>
</div>
