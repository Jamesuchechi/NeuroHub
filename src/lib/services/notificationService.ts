import { supabase } from './supabase';
import type { Json } from '$lib/types/db';

export type NotificationType =
	| 'mention'
	| 'reply'
	| 'reaction'
	| 'workspace_invite'
	| 'invite_accepted'
	| 'workspace_join_request'
	| 'share'
	| 'ai_complete';

export interface NotificationPayload {
	message_id?: string;
	channel_id?: string;
	note_id?: string;
	parent_id?: string;
	preview?: string;
	workspace_slug?: string;
	[key: string]: Json | undefined;
}

export const notificationService = {
	async createNotification(
		userId: string,
		workspaceId: string | null,
		type: NotificationType,
		actorId: string | null,
		payload: NotificationPayload
	) {
		const { data, error } = await supabase.rpc('create_notification', {
			p_user_id: userId,
			p_workspace_id: workspaceId,
			p_type: type,
			p_actor_id: actorId,
			p_payload: payload
		});

		if (error) {
			console.error('[notificationService] Failed to create notification:', error);
			throw error;
		}
		return data;
	},

	async getNotifications(userId: string, limit = 50) {
		const { data, error } = await supabase
			.from('notifications')
			.select(
				`
				*,
				actor:profiles!actor_id(username, avatar_url)
			`
			)
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data;
	},

	async markAsRead(notificationId: string) {
		const { error } = await supabase
			.from('notifications')
			.update({ read_at: new Date().toISOString() })
			.eq('id', notificationId);

		if (error) throw error;
	},

	async markAllAsRead(userId: string, workspaceId?: string) {
		let query = supabase
			.from('notifications')
			.update({ read_at: new Date().toISOString() })
			.eq('user_id', userId)
			.is('read_at', null);

		if (workspaceId) {
			query = query.eq('workspace_id', workspaceId);
		}

		const { error } = await query;
		if (error) throw error;
	},

	async deleteNotification(notificationId: string) {
		const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

		if (error) throw error;
	}
};
