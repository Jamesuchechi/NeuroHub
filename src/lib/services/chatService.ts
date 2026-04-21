import { supabase } from './supabase';
import { SvelteDate } from 'svelte/reactivity';
import type { PostBlock } from '$lib/types/social';

export type Channel = {
	id: string;
	workspace_id: string;
	name: string;
	description: string | null;
	type: 'text' | 'announcement' | 'private' | 'group_dm';
	created_at: string;
	last_msg_id?: string | null;
	custom_name?: string | null;
	icon_url?: string | null;
};

export type MessageAttachment = {
	url: string;
	name: string;
	type: 'image' | 'file';
	size?: number;
};

export type Message = {
	id: string;
	channel_id: string;
	user_id: string;
	content: string;
	attachments: MessageAttachment[];
	parent_id: string | null;
	metadata: Record<string, unknown> | PostBlock;
	edited_at: string | null;
	deleted_at: string | null;
	created_at: string;
	user?: {
		username: string;
		avatar_url: string;
	};
	reactions?: MessageReaction[];
};

export type MessageReaction = {
	message_id: string;
	user_id: string;
	emoji: string;
	created_at: string;
	user?: {
		username: string;
	};
};

export const chatService = {
	async getChannels(workspaceId: string): Promise<Channel[]> {
		const { data, error } = await supabase
			.from('channels')
			.select('*')
			.eq('workspace_id', workspaceId)
			.order('name', { ascending: true });

		if (error) throw error;
		return data as Channel[];
	},

	async getMessages(channelId: string, limit = 50, beforeId?: string): Promise<Message[]> {
		let query = supabase
			.from('messages')
			.select(
				`
				*,
				user:profiles!user_id (username, avatar_url),
				reactions:message_reactions (*)
			`
			)
			.eq('channel_id', channelId)
			.order('created_at', { ascending: false })
			.limit(limit);

		if (beforeId) {
			// First get the timestamp of the beforeId message
			const { data: beforeMsg } = await supabase
				.from('messages')
				.select('created_at')
				.eq('id', beforeId)
				.single();

			if (beforeMsg && 'created_at' in beforeMsg) {
				query = query.lt('created_at', (beforeMsg as { created_at: string }).created_at);
			}
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data as unknown as Message[]).reverse();
	},

	async sendMessage(
		channelId: string,
		userId: string,
		content: string,
		options: {
			attachments?: MessageAttachment[];
			parentId?: string | null;
		} = {}
	): Promise<Message> {
		const { data, error } = await (
			supabase.from('messages') as unknown as {
				insert(d: object): {
					select(q: string): {
						single(): Promise<{ data: Message | null; error: Error | null }>;
					};
				};
			}
		)
			.insert({
				channel_id: channelId,
				user_id: userId,
				content,
				attachments: options.attachments || [],
				parent_id: options.parentId || null
			})
			.select(
				`
				*,
				user:profiles!user_id (username, avatar_url)
			`
			)
			.single();

		if (error) throw error;
		if (!data) throw new Error('Failed to create message');

		// --- Notification Triggers ---
		try {
			const { notificationService } = await import('./notificationService');
			const { data: channel } = await supabase
				.from('channels')
				.select('workspace_id, name')
				.eq('id', channelId)
				.single();

			if (channel) {
				const workspaceId = channel.workspace_id;

				// 1. Handle Mentions (@username)
				const mentions = content.match(/@(\w+)/g);
				if (mentions) {
					const usernames = mentions.map((m) => m.slice(1));
					const { data: profiles } = await supabase
						.from('profiles')
						.select('id, username')
						.in('username', usernames);

					if (profiles) {
						for (const profile of profiles) {
							if (profile.id !== userId) {
								await notificationService.createNotification(
									profile.id,
									workspaceId,
									'mention',
									userId,
									{
										message_id: data.id,
										channel_id: channelId,
										channel_name: channel.name,
										preview: content.slice(0, 100)
									}
								);
							}
						}
					}
				}

				// 2. Handle Thread Replies
				if (options.parentId) {
					const { data: parentMsg } = await supabase
						.from('messages')
						.select('user_id')
						.eq('id', options.parentId)
						.single();

					if (parentMsg && parentMsg.user_id !== userId) {
						await notificationService.createNotification(
							parentMsg.user_id,
							workspaceId,
							'reply',
							userId,
							{
								message_id: data.id,
								channel_id: channelId,
								channel_name: channel.name,
								preview: content.slice(0, 100),
								parent_id: options.parentId
							}
						);
					}
				}
			}
		} catch (err) {
			console.error('[chatService] Notification trigger failed:', err);
			// Don't block message sending if notification fails
		}

		return data as Message;
	},

	async addReaction(messageId: string, userId: string, emoji: string) {
		const { error } = await (
			supabase.from('message_reactions') as unknown as {
				upsert: (d: object) => Promise<{ error: Error | null }>;
			}
		).upsert({ message_id: messageId, user_id: userId, emoji });

		if (error) throw error;

		// --- Notification Trigger ---
		try {
			const { notificationService } = await import('./notificationService');
			const { data: message } = await supabase
				.from('messages')
				.select('user_id, channel_id, content, channels(workspace_id, name)')
				.eq('id', messageId)
				.single();

			if (message && message.user_id !== userId) {
				const channels = message.channels as unknown as { workspace_id: string; name: string };
				await notificationService.createNotification(
					message.user_id,
					channels.workspace_id,
					'reaction',
					userId,
					{
						message_id: messageId,
						channel_id: message.channel_id,
						channel_name: channels.name,
						emoji: emoji,
						preview: message.content.slice(0, 50)
					}
				);
			}
		} catch (err) {
			console.error('[chatService] Reaction notification failed:', err);
		}
	},

	async removeReaction(messageId: string, userId: string, emoji: string) {
		const { error } = await supabase
			.from('message_reactions')
			.delete()
			.match({ message_id: messageId, user_id: userId, emoji });

		if (error) throw error;
	},
	async markAsRead(userId: string, channelId: string, messageId: string) {
		const { error } = await (
			supabase.from('message_reads') as unknown as {
				upsert: (d: unknown) => Promise<{ error: Error | null }>;
			}
		).upsert({
			user_id: userId,
			channel_id: channelId,
			last_read_message_id: messageId,
			updated_at: new SvelteDate().toISOString()
		});

		if (error) throw error;
	},

	async updateMessage(messageId: string, content: string): Promise<Message> {
		const { data, error } = await (
			supabase.from('messages') as unknown as {
				update(d: object): {
					eq(
						k: string,
						v: string
					): {
						select(q: string): {
							single(): Promise<{ data: Message | null; error: Error | null }>;
						};
					};
				};
			}
		)
			.update({
				content,
				edited_at: new SvelteDate().toISOString()
			})
			.eq('id', messageId)
			.select(
				`
				*,
				user:profiles!user_id (username, avatar_url)
			`
			)
			.single();

		if (error) throw error;
		return data as Message;
	},

	async deleteMessage(messageId: string): Promise<void> {
		const { error } = await (
			supabase.from('messages') as unknown as {
				update(d: object): {
					eq(k: string, v: string): Promise<{ error: Error | null }>;
				};
			}
		)
			.update({
				deleted_at: new SvelteDate().toISOString(),
				content: 'This message was deleted'
			})
			.eq('id', messageId);

		if (error) throw error;
	},

	async archiveChannel(channelId: string): Promise<void> {
		const { error } = await (
			supabase.from('channels') as unknown as {
				update(d: object): {
					eq(k: string, v: string): Promise<{ error: Error | null }>;
				};
			}
		)
			.update({ description: '[ARCHIVED]' })
			.eq('id', channelId);

		if (error) throw error;
	},

	async deleteChannel(channelId: string): Promise<void> {
		const { error } = await supabase.from('channels').delete().eq('id', channelId);
		if (error) throw error;
	},

	async createChannel(
		workspaceId: string,
		userId: string,
		name: string,
		description?: string,
		type: Channel['type'] = 'text'
	) {
		const { data, error } = await (
			supabase.from('channels') as unknown as {
				insert(d: object): {
					select(): {
						single(): Promise<{ data: Channel | null; error: Error | null }>;
					};
				};
			}
		)
			.insert({
				workspace_id: workspaceId,
				created_by: userId,
				name,
				description,
				type
			})
			.select()
			.single();

		if (error) throw error;
		return data as Channel;
	},

	async getOrCreateDMChannel(workspaceId: string, myId: string, otherId: string): Promise<Channel> {
		const ids = [myId, otherId].sort();
		const channelName = `dm-${ids[0]}-${ids[1]}`;

		const { data: existing } = await supabase
			.from('channels')
			.select('*')
			.eq('workspace_id', workspaceId)
			.eq('name', channelName)
			.maybeSingle();

		if (existing) return existing as Channel;

		// Create new if not exists
		const channel = await this.createChannel(
			workspaceId,
			myId,
			channelName,
			`Direct message channel`,
			'private'
		);

		// Initialize members for DM
		await supabase.from('channel_members').insert([
			{ channel_id: channel.id, user_id: myId },
			{ channel_id: channel.id, user_id: otherId }
		]);

		return channel;
	},

	async createGroupDM(
		workspaceId: string,
		creatorId: string,
		memberIds: string[],
		name?: string,
		iconUrl?: string
	): Promise<Channel> {
		// Group DM name defaults to member IDs if not provided (internal name)
		const internalName = `gdm-${crypto.randomUUID()}`;

		const { data: channel, error } = await supabase
			.from('channels')
			.insert({
				workspace_id: workspaceId,
				created_by: creatorId,
				name: internalName,
				custom_name: name,
				icon_url: iconUrl,
				type: 'group_dm'
			})
			.select()
			.single();

		if (error) throw error;
		if (!channel) throw new Error('Failed to create group DM');

		// Add all members (including creator)
		const membersToInsert = Array.from(new Set([creatorId, ...memberIds])).map((uid) => ({
			channel_id: channel.id,
			user_id: uid
		}));

		const { error: memberError } = await supabase.from('channel_members').insert(membersToInsert);

		if (memberError) throw memberError;

		return channel;
	},

	async getChannelMembers(channelId: string) {
		const { data, error } = await supabase
			.from('channel_members')
			.select('*, user:profiles!user_id(*)')
			.eq('channel_id', channelId);

		if (error) throw error;
		return data;
	}
};
