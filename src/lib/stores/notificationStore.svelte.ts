import { supabase } from '$lib/services/supabase';
import {
	notificationService,
	type NotificationType,
	type NotificationPayload
} from '$lib/services/notificationService';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { authStore } from './authStore';
import { get } from 'svelte/store';
import { toast } from './toastStore';

export interface Notification {
	id: string;
	user_id: string;
	workspace_id: string | null;
	type: NotificationType;
	actor_id: string | null;
	payload: NotificationPayload;
	read_at: string | null;
	created_at: string;
	actor?: {
		username: string | null;
		avatar_url: string | null;
	};
}

class NotificationStore {
	notifications = $state<Notification[]>([]);
	unreadCount = $derived(this.notifications.filter((n) => !n.read_at).length);
	isLoading = $state(false);

	private subscription: RealtimeChannel | null = null;
	private audio: HTMLAudioElement | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
			this.audio.volume = 0.4;
		}
	}

	async init() {
		const user = get(authStore).user;
		if (!user) return;

		if (this.isLoading) return; // Prevent multiple simultaneous inits

		this.isLoading = true;
		try {
			const data = await notificationService.getNotifications(user.id);
			this.notifications = data as unknown as Notification[];
			this.setupSubscription(user.id);
		} catch (err) {
			console.error('[NotificationStore] Init failed:', err);
		} finally {
			this.isLoading = false;
		}
	}

	private setupSubscription(userId: string) {
		if (this.subscription) {
			supabase.removeChannel(this.subscription);
		}

		this.subscription = supabase
			.channel(`notifications-${userId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${userId}`
				},
				async (payload) => {
					const newNotification = payload.new as Notification;

					// Fetch actor info
					if (newNotification.actor_id) {
						const { data: actor } = await supabase
							.from('profiles')
							.select('username, avatar_url')
							.eq('id', newNotification.actor_id)
							.single();

						if (actor) {
							newNotification.actor = actor;
						}
					}

					this.notifications = [newNotification, ...this.notifications];
					this.playPing();

					// Optional: Show toast for important notifications
					this.showNotificationToast(newNotification);
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${userId}`
				},
				(payload) => {
					const updated = payload.new as Notification;
					this.notifications = this.notifications.map((n) =>
						n.id === updated.id ? { ...n, ...updated } : n
					);
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${userId}`
				},
				(payload) => {
					const deletedId = (payload.old as Notification).id;
					this.notifications = this.notifications.filter((n) => n.id !== deletedId);
				}
			)
			.subscribe();
	}

	private playPing() {
		if (this.audio) {
			this.audio.play().catch((e) => console.warn('Could not play notification sound:', e));
		}
	}

	private showNotificationToast(n: Notification) {
		let message: string;
		const actorName = n.actor?.username || 'Someone';

		switch (n.type) {
			case 'mention':
				message = `${actorName} mentioned you`;
				break;
			case 'reply':
				message = `${actorName} replied to your message`;
				break;
			case 'reaction':
				message = `${actorName} reacted with ${n.payload.emoji || 'an emoji'} to your message`;
				break;
			case 'invite_accepted':
				message = `${actorName} joined your workspace`;
				break;
			default:
				message = 'New notification';
		}

		toast.show(message, 'info');
	}

	async markAsRead(id: string) {
		try {
			await notificationService.markAsRead(id);
			// Local update
			this.notifications = this.notifications.map((n) =>
				n.id === id ? { ...n, read_at: new Date().toISOString() } : n
			);
		} catch (err) {
			console.error('[NotificationStore] Mark as read failed:', err);
		}
	}

	async markAllAsRead(workspaceId?: string) {
		const user = get(authStore).user;
		if (!user) return;

		try {
			await notificationService.markAllAsRead(user.id, workspaceId);
			// Local update
			const now = new Date().toISOString();
			this.notifications = this.notifications.map((n) => {
				if (n.read_at) return n;
				if (workspaceId && n.workspace_id !== workspaceId) return n;
				return { ...n, read_at: now };
			});
		} catch (err) {
			console.error('[NotificationStore] Mark all as read failed:', err);
		}
	}

	async delete(id: string) {
		try {
			await notificationService.deleteNotification(id);
			this.notifications = this.notifications.filter((n) => n.id !== id);
		} catch (err) {
			console.error('[NotificationStore] Delete notification failed:', err);
		}
	}

	cleanup() {
		if (this.subscription) {
			supabase.removeChannel(this.subscription);
		}
	}
}

export const notificationStore = new NotificationStore();
