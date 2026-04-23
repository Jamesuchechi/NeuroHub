<script lang="ts">
	import Avatar from '../ui/Avatar.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { chatService, type Message } from '$lib/services/chatService';
	import { profileStore } from '$lib/stores/profileStore';
	import ReactionBar from './ReactionBar.svelte';
	import { fade } from 'svelte/transition';
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import ResourceLink from './ResourceLink.svelte';
	import { aiStore } from '$lib/stores/aiStore.svelte';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { toast } from '$lib/stores/toastStore';
	import { uiStore } from '$lib/stores/uiStore';
	import type { ResourceType } from '$lib/services/resourceService';

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
	let isReactionPickerOpen = $state(false);

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

	async function addReaction(emoji: string) {
		const profile = $profileStore.profile;
		if (!profile) return;
		try {
			await chatService.addReaction(message.id, profile.id, emoji);
		} catch (err) {
			console.error('[ChatMessage] Add reaction failed:', err);
		}
	}

	// Thread metadata logic
	const replies = $derived(
		message.parent_id ? [] : chatStore.messages.filter((m) => m.parent_id === message.id)
	);
	const replyCount = $derived(replies.length);
	const participants = $derived(
		Array.from(new Set(replies.map((r) => r.user?.avatar_url).filter(Boolean))).slice(0, 3)
	);

	type MessagePart =
		| { type: 'text'; content: string }
		| { type: 'ref'; ref: { type: ResourceType; id: string; name: string } };

	const messageParts = $derived.by<MessagePart[]>(() => {
		if (message.deleted_at || !message.content) return [{ type: 'text', content: message.content }];

		const rawParts: string[] = message.content.split(
			/(\[\[(?:user|chan|snip|note|api_test):[a-z0-9-]+:[^\]]+\]\])/
		);

		return rawParts.map((part): MessagePart => {
			if (part.startsWith('[[') && part.endsWith(']]')) {
				const match = part.match(/\[\[(user|chan|snip|note|api_test):([a-z0-9-]+):([^\]]+)\]\]/);
				if (match) {
					return {
						type: 'ref',
						ref: { type: match[1] as ResourceType, id: match[2], name: match[3] }
					};
				}
			}
			return { type: 'text', content: part };
		});
	});

	const hasTokens = $derived(messageParts.some((p) => p.type === 'ref'));

	async function handlePromote() {
		const workspaceId = $workspaceStore.currentWorkspace?.id;
		if (!workspaceId || !profile) return;

		toast.show('AI is refactoring this thread into a Note...', 'info');

		try {
			// 1. Gather Context (Message + Thread)
			let context = `Main Message: ${message.content}\nAuthor: ${message.user?.username}\n\n`;

			if (replyCount > 0) {
				context +=
					'Thread Replies:\n' + replies.map((r) => `${r.user?.username}: ${r.content}`).join('\n');
			} else if (message.parent_id) {
				// We are in a reply, find parent
				const parent = chatStore.messages.find((m) => m.id === message.parent_id);
				if (parent) {
					context = `Parent Message: ${parent.content}\nAuthor: ${parent.user?.username}\n\nSelected Message: ${message.content}`;
				}
			}

			// 2. NeuroAI Refactoring Prompt
			const systemPrompt = `You are an expert Technical Architect. 
Your task is to transform a fragmented chat discussion into a high-quality, professional technical Note.
1. Extract all core technical decisions and requirements.
2. Structure the note with clean headings (H1, H2).
3. Use bullet points for functional requirements.
4. If there's code, include it in tidy blocks.
5. Identify the "Problem Statement" and "Proposed Solution".
6. Format as clean semantic HTML suitable for a modern documentation tool.
Return ONLY the HTML content, no conversational filler.`;

			const result = await aiStore.generateCustom(
				`Refactor and document this technical discussion:\n\n${context}`,
				systemPrompt,
				workspaceId,
				profile.id
			);

			if (result) {
				// 3. Create Note
				const title = `Refactored: ${message.content.slice(0, 30)}...`;
				const note = await notesStore.createNote(workspaceId, profile.id, title);

				if (note) {
					await notesStore.updateNote(note.id, {
						content: {
							type: 'doc',
							content: [
								{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] },
								{
									type: 'paragraph',
									content: [
										{
											type: 'text',
											text: 'This note was automatically generated from a chat discussion using AI.'
										}
									]
								},
								{ type: 'paragraph', content: [{ type: 'text', text: result }] } // Note: In real app we'd parse HTML to Tiptap JSON, but for now we wrap text
							]
						}
					});
					toast.show('Successfully refactored to Note!', 'success');
				}
			}
		} catch (err) {
			console.error('[Promotion] Failed:', err);
			toast.show('Failed to promote message to Note', 'error');
		}
	}

	// Swipe to reply logic
	let touchStartX = 0;
	let touchXOffset = $state(0);
	const swipeThreshold = 60;
	let isSwiping = $state(false);

	function handleTouchStart(e: TouchEvent) {
		if (!$uiStore.isMobile || isEditing) return;
		touchStartX = e.touches[0].clientX;
		isSwiping = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isSwiping) return;
		const currentX = e.touches[0].clientX;
		const diff = currentX - touchStartX;
		// Only swipe right
		if (diff > 0) {
			touchXOffset = Math.min(diff, 100);
			// Prevent page scroll when swiping
			if (touchXOffset > 10) {
				if (e.cancelable) e.preventDefault();
			}
		} else {
			touchXOffset = 0;
		}
	}

	function handleTouchEnd() {
		if (!isSwiping) return;
		if (touchXOffset >= swipeThreshold && onReply) {
			onReply(message.id);
		}
		touchXOffset = 0;
		isSwiping = false;
	}
</script>

<div
	class="group relative flex gap-4 overflow-hidden px-6 py-3 transition-colors hover:bg-surface-dim/30"
	in:fade={{ duration: 300 }}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	role="article"
	aria-label="Chat message from {message.user?.username || 'Anonymous'}. Swipe right to reply."
>
	<!-- Swipe Action Indicator (Mobile Only) -->
	<div
		class="absolute top-0 bottom-0 left-0 flex items-center justify-center bg-orange-500 transition-all duration-75"
		style="width: {touchXOffset}px; opacity: {touchXOffset / swipeThreshold}"
	>
		<svg
			class="h-5 w-5 text-zinc-950 {touchXOffset >= swipeThreshold
				? 'scale-125'
				: 'scale-100'} transition-transform"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="3"
				d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
			/>
		</svg>
	</div>

	<div
		class="flex w-full gap-4 transition-transform duration-75"
		style="transform: translateX({touchXOffset}px)"
	>
		<!-- User Avatar -->
		<div class="shrink-0 pt-1">
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
						class="w-full rounded-xl border border-stroke bg-surface-dim p-3 text-sm text-content shadow-inner outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/30"
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
							class="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-content transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
						>
							Cancel
						</button>
					</div>
				</div>
			{:else if message.deleted_at}
				<div class="text-sm leading-relaxed wrap-break-word text-zinc-600 italic">
					This message was deleted
				</div>
			{:else}
				<div class="text-sm leading-relaxed wrap-break-word text-content/90">
					{#if !hasTokens}
						{message.content}
					{:else}
						{#each messageParts as part, i (i)}
							{#if part.type === 'ref'}
								<ResourceLink type={part.ref.type} id={part.ref.id} name={part.ref.name} />
							{:else}
								{part.content}
							{/if}
						{/each}
					{/if}
				</div>
			{/if}

			<!-- Attachments Placeholder -->
			{#if message.attachments?.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each message.attachments as att (att.url)}
						<div class="h-24 w-24 overflow-hidden rounded-xl border border-stroke bg-surface">
							{#if att.type === 'image'}
								<img
									src={att.url}
									alt="Message attachment"
									loading="lazy"
									class="h-full w-full object-cover"
								/>
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

			<!-- Quick Reactions -->
			<div class="relative flex items-center px-1">
				<button
					onclick={() => (isReactionPickerOpen = !isReactionPickerOpen)}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-content-dim transition-colors hover:bg-surface-dim hover:text-brand-orange {isReactionPickerOpen
						? 'bg-surface-dim text-brand-orange'
						: ''}"
					title="Add reaction"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</button>

				{#if isReactionPickerOpen}
					<div
						class="absolute right-0 bottom-full mb-2 flex items-center gap-0.5 rounded-xl border border-stroke bg-surface p-1 shadow-xl"
						transition:fade={{ duration: 150 }}
					>
						{#each ['👍', '❤️', '🔥', '😂', '🎉', '🚀'] as emoji (emoji)}
							<button
								onclick={() => {
									addReaction(emoji);
									isReactionPickerOpen = false;
								}}
								class="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-all hover:scale-125 hover:bg-surface-dim active:scale-95"
								title="React with {emoji}"
								aria-label="React with {emoji}"
							>
								{emoji}
							</button>
						{/each}
					</div>
				{/if}
			</div>

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

			<div class="mx-1 h-4 w-px bg-stroke/50"></div>
			<button
				onclick={handlePromote}
				class="flex h-8 w-8 items-center justify-center rounded-lg p-2 text-brand-orange transition-all hover:scale-110 hover:bg-brand-orange/10"
				aria-label="Refactor to Note"
				title="Refactor to Note (AI)"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 20l-7-7 7-7M5 20l-7-7 7-7"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>
