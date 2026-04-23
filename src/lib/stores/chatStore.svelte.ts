import { supabase } from '$lib/services/supabase';
import {
	chatService,
	type Message,
	type Channel,
	type MessageReaction,
	type MessageAttachment
} from '$lib/services/chatService';
import { profileStore } from './profileStore';
import { get } from 'svelte/store';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';
import type {
	RealtimeChannel,
	RealtimePostgresChangesPayload,
	PostgrestResponse,
	PostgrestSingleResponse
} from '@supabase/supabase-js';
import type { Database } from '$lib/types/db';

type DB = Database['public']['Tables'];

type ChannelWithLastMessage = DB['channels']['Row'] & {
	last_message: Array<{ id: string; created_at: string }>;
};

export interface EnrichedChannel extends Channel {
	display_name: string;
	display_avatar: string | null;
	other_user_id?: string;
}

interface ChatDB {
	from(table: 'channels'): {
		select<T = DB['channels']['Row']>(
			q?: string
		): {
			eq(
				k: string,
				v: string
			): {
				order(k: string, o: { ascending: boolean }): Promise<PostgrestResponse<T>>;
			};
		};
	};
	from(table: 'messages'): {
		select(q?: string): {
			eq(
				k: string,
				v: string
			): {
				single(): Promise<PostgrestSingleResponse<DB['messages']['Row']>>;
			};
		};
	};
	from(table: 'message_reads'): {
		select(q?: string): {
			eq(k: string, v: string): Promise<PostgrestResponse<DB['message_reads']['Row']>>;
		};
	};
	from(table: 'typing_indicators'): {
		upsert(d: DB['typing_indicators']['Insert']): Promise<{ error: Error | null }>;
		delete(): {
			match(d: Record<string, string>): Promise<{ error: Error | null }>;
		};
	};
	from(table: 'profiles'): {
		select(q?: string): {
			eq(
				k: string,
				v: string
			): {
				single(): Promise<PostgrestSingleResponse<DB['profiles']['Row']>>;
			};
			in(k: string, v: string[]): Promise<PostgrestResponse<DB['profiles']['Row']>>;
		};
	};
}

const db = supabase as unknown as ChatDB;

interface PresenceState {
	user_id: string;
	username: string;
	avatar_url: string;
	online_at: string;
	status?: string;
}

export class ChatStore {
	channels = $state<Channel[]>([]);
	activeChannelId = $state<string | null>(null);
	messages = $state<Message[]>([]);
	isLoadingMessages = $state(false);
	lastReadMessageIds = $state<Record<string, string>>({}); // channelId -> messageId
	selectedThreadId = $state<string | null>(null);
	presence = $state<Record<string, PresenceState[]>>({});
	typingUsers = $state<Record<string, SvelteSet<string>>>({}); // channelId -> Set of userIds
	dmProfiles = $state<Record<string, { username: string; avatar_url: string | null }>>({}); // userId -> profile
	currentStatus = $state<string>('Active');

	private subscription: RealtimeChannel | null = null;
	private presenceChannel: RealtimeChannel | null = null;

	activeChannel = $derived(
		this.enrichedChannels.find((c) => c.id === this.activeChannelId) || null
	);

	get enrichedChannels(): EnrichedChannel[] {
		return this.channels.map((c): EnrichedChannel => {
			if (c.type === 'private' && c.name.startsWith('dm-')) {
				const myId = get(profileStore).profile?.id;
				const nameWithoutPrefix = c.name.slice(3); // remove 'dm-'

				let otherId = '';
				if (myId) {
					if (nameWithoutPrefix.startsWith(myId)) {
						otherId = nameWithoutPrefix.slice(myId.length + 1);
					} else {
						otherId = nameWithoutPrefix.split(`-${myId}`)[0];
					}
				}

				const profile = otherId ? this.dmProfiles[otherId] : null;

				return {
					...c,
					display_name: profile?.username || 'Direct Message',
					display_avatar: profile?.avatar_url || null,
					other_user_id: otherId
				};
			}

			if (c.type === 'group_dm') {
				return {
					...c,
					display_name: c.custom_name || 'Group Message',
					display_avatar: c.icon_url || null
				};
			}

			return {
				...c,
				display_name: c.name,
				display_avatar: null,
				other_user_id: undefined
			};
		});
	}

	constructor() {}

	async init(workspaceId: string) {
		try {
			const { data: channelsData } = await db
				.from('channels')
				.select<ChannelWithLastMessage>(
					`
					*,
					last_message:messages(id, created_at)
				`
				)
				.eq('workspace_id', workspaceId)
				.order('name', { ascending: true });

			if (channelsData) {
				this.channels = channelsData.map((c) => ({
					...c,
					last_msg_id: c.last_message?.[0]?.id || null
				})) as Channel[];

				// Resolve profiles for DMs
				await this.resolveDMProfiles();
			}

			if (this.channels.length > 0 && !this.activeChannelId) {
				const firstChannelId = this.channels[0].id;
				this.selectChannel(firstChannelId);
			}
			this.setupPresence(workspaceId);
			this.loadReadReceipts();
		} catch (err) {
			console.error('[ChatStore] Init failed:', err);
		}
	}

	async resolveDMProfiles() {
		const myId = get(profileStore).profile?.id;
		if (!myId) return;

		const dmUserIds = new SvelteSet<string>();
		this.channels.forEach((c) => {
			if (c.type === 'private' && c.name.startsWith('dm-')) {
				const nameWithoutPrefix = c.name.slice(3);
				if (myId) {
					if (nameWithoutPrefix.startsWith(myId)) {
						const otherId = nameWithoutPrefix.slice(myId.length + 1);
						if (otherId) dmUserIds.add(otherId);
					} else if (nameWithoutPrefix.includes(`-${myId}`)) {
						const otherId = nameWithoutPrefix.split(`-${myId}`)[0];
						if (otherId) dmUserIds.add(otherId);
					}
				}
			}
		});

		if (dmUserIds.size === 0) return;

		try {
			const { data: profiles } = await db
				.from('profiles')
				.select('id, username, avatar_url')
				.in('id', Array.from(dmUserIds));

			if (profiles) {
				profiles.forEach(
					(p: { id: string; username: string | null; avatar_url: string | null }) => {
						this.dmProfiles[p.id] = {
							username: p.username || 'Unknown',
							avatar_url: p.avatar_url
						};
					}
				);
				this.dmProfiles = { ...this.dmProfiles }; // Trigger reactivity
			}
		} catch (err) {
			console.error('[ChatStore] resolveDMProfiles failed:', err);
		}
	}

	channelHasUnread(channelId: string) {
		const channel = this.channels.find((c) => c.id === channelId);
		if (!channel) return false;
		if (this.activeChannelId === channelId) return false; // Active is always read

		const lastReadId = this.lastReadMessageIds[channelId];
		const lastMsgId = (channel as Channel & { last_msg_id?: string }).last_msg_id;

		return !!(lastMsgId && lastReadId !== lastMsgId);
	}

	async loadReadReceipts() {
		const profile = get(profileStore).profile;
		if (!profile) return;

		const { data } = await db
			.from('message_reads')
			.select('channel_id, last_read_message_id')
			.eq('user_id', profile.id);

		if (data) {
			const map: Record<string, string> = {};
			data.forEach((r) => {
				if (r.last_read_message_id) {
					map[r.channel_id] = r.last_read_message_id;
				}
			});
			this.lastReadMessageIds = map;
		}
	}

	async selectChannel(channelId: string) {
		if (this.activeChannelId === channelId) return;

		this.activeChannelId = channelId;
		this.messages = [];
		await this.loadMessages(channelId);
		this.setupSubscription(channelId);
		this.markAsRead(channelId);
	}

	async markAsRead(channelId: string) {
		const profile = get(profileStore).profile;
		if (!profile || this.messages.length === 0) return;

		const lastMsg = this.messages[this.messages.length - 1];
		if (this.lastReadMessageIds[channelId] === lastMsg.id) return;

		try {
			await chatService.markAsRead(profile.id, channelId, lastMsg.id);
			this.lastReadMessageIds[channelId] = lastMsg.id;
			this.lastReadMessageIds = { ...this.lastReadMessageIds };
		} catch (err) {
			console.error('[ChatStore] Mark as read failed:', err);
		}
	}

	async loadMessages(channelId: string) {
		this.isLoadingMessages = true;
		try {
			this.messages = await chatService.getMessages(channelId);
		} finally {
			this.isLoadingMessages = false;
		}
	}

	async loadMoreMessages(channelId: string) {
		if (this.isLoadingMessages || this.messages.length === 0) return;

		const oldestMessage = this.messages[0];
		try {
			const olderMessages = await chatService.getMessages(channelId, 50, oldestMessage.created_at);
			if (olderMessages.length > 0) {
				// Filter out any messages that might already have arrived via realtime
				const existingIds = new SvelteSet(this.messages.map((m) => m.id));
				const uniqueOlder = olderMessages.filter((m) => !existingIds.has(m.id));

				if (uniqueOlder.length > 0) {
					this.messages = [...uniqueOlder, ...this.messages];
				}
			}
		} catch (err) {
			console.error('[ChatStore] Load more messages failed:', err);
		}
	}

	async sendMessage(
		content: string,
		options: { attachments?: MessageAttachment[]; parentId?: string | null } = {}
	) {
		if (!this.activeChannelId) return;
		const profile = get(profileStore).profile;
		if (!profile) return;

		// Optimistic update
		const tempId = crypto.randomUUID();
		const optimisticMessage: Message = {
			id: tempId,
			channel_id: this.activeChannelId,
			user_id: profile.id,
			content,
			attachments: options.attachments || [],
			parent_id: options.parentId || null,
			metadata: {},
			edited_at: null,
			deleted_at: null,
			created_at: new SvelteDate().toISOString(),
			user: {
				username: profile.username || 'You',
				avatar_url: profile.avatar_url || ''
			}
		};

		this.messages = [...this.messages, optimisticMessage];

		try {
			const realMessage = await chatService.sendMessage(
				this.activeChannelId,
				profile.id,
				content,
				options
			);

			// Race condition check: If realtime already added this message, just remove the temp one
			const alreadyExists = this.messages.some((m) => m.id === realMessage.id);
			if (alreadyExists) {
				this.messages = this.messages.filter((m) => m.id !== tempId);
			} else {
				// Otherwise, replace optimistic message with the real one
				this.messages = this.messages.map((m) => (m.id === tempId ? realMessage : m));
			}
		} catch (err) {
			console.error('[ChatStore] Send message failed:', err);
			// Rollback temp message on failure
			this.messages = this.messages.filter((m) => m.id !== tempId);
		}
	}

	async editMessage(messageId: string, content: string) {
		const originalMessage = this.messages.find((m) => m.id === messageId);
		if (!originalMessage) return;

		// Optimistic update
		this.messages = this.messages.map((m) =>
			m.id === messageId ? { ...m, content, edited_at: new SvelteDate().toISOString() } : m
		);

		try {
			await chatService.updateMessage(messageId, content);
		} catch (err) {
			console.error('[ChatStore] Edit message failed:', err);
			// Rollback
			if (originalMessage) {
				this.messages = this.messages.map((m) => (m.id === messageId ? originalMessage : m));
			}
		}
	}

	async deleteMessage(messageId: string) {
		const originalMessage = this.messages.find((m) => m.id === messageId);
		if (!originalMessage) return;

		// Optimistic update (soft delete)
		this.messages = this.messages.map((m) =>
			m.id === messageId
				? { ...m, deleted_at: new SvelteDate().toISOString(), content: 'This message was deleted' }
				: m
		);

		try {
			await chatService.deleteMessage(messageId);
		} catch (err) {
			console.error('[ChatStore] Delete message failed:', err);
			// Rollback
			if (originalMessage) {
				this.messages = this.messages.map((m) => (m.id === messageId ? originalMessage : m));
			}
		}
	}

	async setTyping(channelId: string, isTyping: boolean) {
		const profile = get(profileStore).profile;
		if (!profile) return;

		try {
			if (isTyping) {
				await db.from('typing_indicators').upsert({
					channel_id: channelId,
					user_id: profile.id,
					updated_at: new SvelteDate().toISOString()
				});
			} else {
				await db.from('typing_indicators').delete().match({
					channel_id: channelId,
					user_id: profile.id
				});
			}
		} catch (err) {
			console.error('[ChatStore] Set typing failed:', err);
		}
	}

	private setupSubscription(channelId: string) {
		if (this.subscription) {
			supabase.removeChannel(this.subscription);
		}

		this.subscription = supabase
			.channel(`channel-${channelId}`)
			.on<Message>(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'messages',
					filter: `channel_id=eq.${channelId}`
				},
				(payload) => {
					this.handleMessageChange(payload);
				}
			)
			.on<MessageReaction>(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'message_reactions'
				},
				(payload) => {
					this.handleReactionChange(payload);
				}
			)
			.on<{ channel_id: string; user_id: string }>(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'typing_indicators',
					filter: `channel_id=eq.${channelId}`
				},
				(payload) => {
					this.handleTypingChange(payload);
				}
			)
			.subscribe();
	}

	private async handleTypingChange(
		payload: RealtimePostgresChangesPayload<{ channel_id: string; user_id: string }>
	) {
		const { eventType, new: newRecord, old: oldRecord } = payload;

		type TypingRecord = { channel_id: string; user_id: string };
		const channelId =
			(newRecord as TypingRecord)?.channel_id || (oldRecord as TypingRecord)?.channel_id;
		if (!channelId) return;

		if (!this.typingUsers[channelId]) {
			this.typingUsers[channelId] = new SvelteSet();
		}

		if (eventType === 'INSERT' || eventType === 'UPDATE') {
			this.typingUsers[channelId].add((newRecord as TypingRecord).user_id);
		} else if (eventType === 'DELETE') {
			this.typingUsers[channelId].delete((oldRecord as TypingRecord).user_id);
		}

		// Cleanup after timeout if row was abandoned
		if (eventType === 'INSERT' || eventType === 'UPDATE') {
			setTimeout(() => {
				if (this.typingUsers[channelId]?.has(newRecord.user_id)) {
					this.typingUsers[channelId].delete(newRecord.user_id);
				}
			}, 5000);
		}
	}

	private async handleMessageChange(payload: RealtimePostgresChangesPayload<Message>) {
		const { eventType, new: newRecord, old: oldRecord } = payload;

		if (eventType === 'INSERT') {
			const record = newRecord as Message;
			// Check if message already exists (optimistic update)
			if (this.messages.some((m) => m.id === record.id)) return;

			// Fetch user info for the new message
			const { data: user } = await db
				.from('profiles')
				.select('username, avatar_url')
				.eq('id', record.user_id)
				.single();

			// SECURE DOUBLE-CHECK: Re-verify message doesn't exist after the await
			if (this.messages.some((m) => m.id === record.id)) return;

			const fullMessage = { ...record, user: user || undefined } as Message;
			this.messages = [...this.messages, fullMessage];
		} else if (eventType === 'UPDATE') {
			const record = newRecord as Message;
			this.messages = this.messages.map((m) => (m.id === record.id ? { ...m, ...record } : m));
		} else if (eventType === 'DELETE') {
			const record = oldRecord as Message;
			this.messages = this.messages.filter((m) => m.id !== record.id);
		}
	}

	private handleReactionChange(payload: RealtimePostgresChangesPayload<MessageReaction>) {
		const { eventType, new: newRecord, old: oldRecord } = payload;

		this.messages = this.messages.map((m) => {
			const targetId =
				(newRecord as MessageReaction)?.message_id || (oldRecord as MessageReaction)?.message_id;
			if (m.id === targetId) {
				let reactions = m.reactions || [];
				if (eventType === 'INSERT') {
					reactions = [...reactions, newRecord as MessageReaction];
				} else if (eventType === 'DELETE') {
					const record = oldRecord as MessageReaction;
					reactions = reactions.filter(
						(r) => !(r.user_id === record.user_id && r.emoji === record.emoji)
					);
				}
				return { ...m, reactions };
			}
			return m;
		});
	}

	private setupPresence(workspaceId: string) {
		if (this.presenceChannel) {
			supabase.removeChannel(this.presenceChannel);
		}

		const profile = get(profileStore).profile;
		if (!profile) return;

		this.presenceChannel = supabase.channel(`presence-${workspaceId}`, {
			config: {
				presence: {
					key: profile.id
				}
			}
		});

		const channel = this.presenceChannel;

		channel
			.on('presence', { event: 'sync' }, () => {
				this.presence = channel.presenceState();
			})
			.on(
				'presence',
				{ event: 'join' },
				({ key, newPresences }: { key: string; newPresences: PresenceState[] }) => {
					console.log('join', key, newPresences);
				}
			)
			.on(
				'presence',
				{ event: 'leave' },
				({ key, leftPresences }: { key: string; leftPresences: PresenceState[] }) => {
					console.log('leave', key, leftPresences);
				}
			)
			.subscribe(async (status: string) => {
				if (status === 'SUBSCRIBED') {
					await channel.track({
						user_id: profile.id,
						username: profile.username,
						avatar_url: profile.avatar_url,
						online_at: new SvelteDate().toISOString(),
						status: this.currentStatus
					});
				}
			});
	}

	async setUserStatus(status: string) {
		this.currentStatus = status;
		if (this.presenceChannel) {
			const profile = get(profileStore).profile;
			if (!profile) return;
			await this.presenceChannel.track({
				user_id: profile.id,
				username: profile.username,
				avatar_url: profile.avatar_url,
				online_at: new SvelteDate().toISOString(),
				status: status
			});
		}
	}

	cleanup() {
		if (this.subscription) supabase.removeChannel(this.subscription);
		if (this.presenceChannel) supabase.removeChannel(this.presenceChannel);
	}
}

export const chatStore: ChatStore = new ChatStore();
