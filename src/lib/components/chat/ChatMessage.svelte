<script lang="ts">
	import Avatar from '../ui/Avatar.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import type { Message } from '$lib/services/chatService';
	import { profileStore } from '$lib/stores/profileStore';
	import ReactionBar from './ReactionBar.svelte';
	import { fade } from 'svelte/transition';
	import { chatStore } from '$lib/stores/chatStore.svelte';

	let {
		message,
		onReply = undefined,
		onDelete = undefined,
		onUpdate = undefined
	} = $props<{
		message: Message;
		onReply?: (id: string) => void;
		onDelete?: (id: string) => void;
		onUpdate?: (id: string, content: string) => void;
	}>();

	const profile = $derived($profileStore.profile);
	const isOwnMessage = $derived(profile?.id === message.user_id);

	// Inline editing state
	let isEditing = $state(false);
	let editContent = $state('');

	function handleAction(type: 'reply' | 'edit' | 'delete') {
		if (type === 'reply' && onReply) onReply(message.id);
		if (type === 'edit') {
			isEditing = true;
			editContent = message.content;
		}
		if (type === 'delete' && onDelete) onDelete(message.id);
	}

	function saveEdit() {
		if (editContent.trim() && editContent !== message.content) {
			if (onUpdate) onUpdate(message.id, editContent);
		}
		isEditing = false;
	}

	function cancelEdit() {
		isEditing = false;
		editContent = message.content;
	}

	// Thread metadata logic
	const replies = $derived(
		message.parent_id ? [] : chatStore.messages.filter((m) => m.parent_id === message.id)
	);
	const replyCount = $derived(replies.length);
	const participants = $derived(
		Array.from(new Set(replies.map((r) => r.user?.avatar_url).filter(Boolean))).slice(0, 3)
	);
</script>

<div
	class="group relative flex gap-4 px-6 py-3 transition-colors hover:bg-surface-dim/30"
	in:fade={{ duration: 300 }}
>
	<!-- User Avatar -->
	<div class="flex-shrink-0 pt-1">
		<Avatar name={message.user?.username || 'User'} src={message.user?.avatar_url} size="sm" />
	</div>

	<!-- Message Content Container -->
	<div class="min-w-0 flex-1">
		<div class="mb-1 flex items-baseline gap-2">
			<span class="cursor-pointer text-sm font-bold text-content hover:underline">
				{message.user?.username || 'Anonymous'}
			</span>
			<span class="text-[10px] font-medium tracking-wider text-content-dim uppercase">
				{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
			</span>
			{#if message.edited_at}
				<span class="text-[10px] text-zinc-500 italic">(edited)</span>
			{/if}
		</div>

		{#if isEditing}
			<div class="mt-2 space-y-2">
				<textarea
					bind:value={editContent}
					class="w-full rounded-xl border border-stroke bg-zinc-900 p-3 text-sm text-content outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/30"
					rows="3"
				></textarea>
				<div class="flex items-center gap-2">
					<button
						onclick={saveEdit}
						class="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-bold text-zinc-950 transition-all hover:bg-orange-400"
					>
						Save Changes
					</button>
					<button
						onclick={cancelEdit}
						class="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-content transition-all hover:bg-zinc-700"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<div
				class="text-sm leading-relaxed break-words {message.deleted_at
					? 'text-zinc-600 italic'
					: 'text-content/90'}"
			>
				{message.deleted_at ? 'This message was deleted' : message.content}
			</div>
		{/if}

		<!-- Attachments Placeholder -->
		{#if message.attachments?.length > 0}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each message.attachments as att (att.url)}
					<div class="h-24 w-24 overflow-hidden rounded-xl border border-stroke bg-surface">
						{#if att.type === 'image'}
							<img src={att.url} alt="attachment" class="h-full w-full object-cover" />
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Reactions Bar -->
		{#if message.reactions?.length > 0}
			<div class="mt-2">
				<ReactionBar reactions={message.reactions} messageId={message.id} />
			</div>
		{/if}

		<!-- Thread Meta -->
		{#if replyCount > 0 && !message.parent_id}
			<button
				onclick={() => handleAction('reply')}
				class="mt-3 flex items-center gap-2 rounded-lg border border-stroke bg-surface-dim/40 p-1.5 transition-all hover:bg-surface-dim hover:ring-1 hover:ring-brand-orange/30"
			>
				<div class="flex -space-x-2 overflow-hidden">
					{#each participants as avatar (avatar)}
						<Avatar src={avatar} size="xs" />
					{/each}
				</div>
				<span class="text-[10px] font-bold text-brand-orange"
					>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span
				>
				<span class="text-[10px] text-zinc-500">• View thread</span>
			</button>
		{/if}
	</div>

	<!-- Action Toolbar (Visible on Hover) -->
	<div
		class="absolute -top-4 right-6 z-10 flex scale-95 transform items-center gap-1 rounded-xl border border-stroke bg-surface p-1.5 opacity-0 shadow-xl transition-all group-hover:scale-100 group-hover:opacity-100"
	>
		<button
			onclick={() => handleAction('reply')}
			class="flex h-8 w-8 items-center justify-center rounded-lg p-2 text-content-dim transition-colors hover:bg-surface-dim hover:text-brand-orange"
			aria-label="Reply to thread"
			title="Reply to thread"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
				/>
			</svg>
		</button>

		<button
			class="flex h-8 w-8 items-center justify-center rounded-lg p-2 text-content-dim transition-colors hover:bg-surface-dim hover:text-brand-orange"
			aria-label="Add reaction"
			title="Add reaction"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		</button>

		{#if isOwnMessage}
			<div class="mx-1 h-4 w-px bg-stroke/50"></div>
			<button
				onclick={() => handleAction('edit')}
				class="flex h-8 w-8 items-center justify-center rounded-lg p-2 text-content-dim transition-colors hover:bg-surface-dim hover:text-brand-orange"
				aria-label="Edit message"
				title="Edit message"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
			</button>
			<button
				onclick={() => handleAction('delete')}
				class="flex h-8 w-8 items-center justify-center rounded-lg p-2 text-content-dim transition-colors hover:bg-surface-dim hover:text-red-500"
				aria-label="Delete message"
				title="Delete message"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			</button>
		{/if}
	</div>
</div>
