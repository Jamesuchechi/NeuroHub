<script lang="ts">
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import { fly, slide } from 'svelte/transition';
	import Button from '../ui/Button.svelte';
	import EmojiPicker from './EmojiPicker.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { contextBuilder } from '$lib/utils/contextBuilder';
	import { toast } from '$lib/stores/toastStore';
	import { aiStore } from '$lib/stores/aiStore.svelte';
	import { authStore } from '$lib/stores/authStore';
	import { get } from 'svelte/store';
	import { resourceParser, type ListItem } from '$lib/services/resourceService';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { snippetService } from '$lib/services/snippets';
	import MentionPalette from './MentionPalette.svelte';
	import FormattingToolbar from './FormattingToolbar.svelte';

	let {
		channelId,
		parentId = null,
		placeholder = 'Type a message...'
	} = $props<{
		channelId: string;
		parentId?: string | null;
		placeholder?: string;
	}>();

	let content = $state('');
	let isFocused = $state(false);
	let isSubmitting = $state(false);
	let showEmojiPicker = $state(false);
	let typingTimeout: ReturnType<typeof setTimeout> | undefined;

	// Slash Commands State
	const commands = [
		{ id: 'summarize', name: 'Summarize', description: 'Summarize last 50 messages', icon: '📝' },
		{ id: 'ask', name: 'Ask', description: 'Ask AI with workspace context', icon: '❓' },
		{ id: 'explain', name: 'Explain', description: 'Explain code in this channel', icon: '💡' },
		{ id: 'review', name: 'Review', description: 'Review code snippets', icon: '🔍' },
		{ id: 'todo', name: 'Extract Todos', description: 'Find action items in chat', icon: '✅' },
		{ id: 'draft', name: 'Draft Note', description: 'Draft a note from chat context', icon: '✍️' },
		{ id: 'translate', name: 'Translate', description: 'Translate last message', icon: '🌐' }
	];

	// Mention Autocomplete State
	let showMentions = $state(false);
	let mentionTrigger = $state('');
	let mentionItems = $state<ListItem[]>([]);
	let mentionPaletteRef:
		| { handleKeydown: (e: KeyboardEvent) => boolean; updateSearch: (q: string) => void }
		| undefined = $state();

	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let showCommands = $state(false);
	let selectedCommandIndex = $state(0);
	const filteredCommands = $derived(
		content.startsWith('/') && !showMentions
			? commands.filter((c) => c.id.includes(content.toLowerCase().slice(1)))
			: []
	);

	async function handleKeydown(e: KeyboardEvent) {
		// 1. If Mention Palette is open, delegate control
		if (showMentions && mentionPaletteRef) {
			const handled = mentionPaletteRef.handleKeydown(e);
			if (handled) return;
		}

		if (showCommands && filteredCommands.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedCommandIndex = (selectedCommandIndex + 1) % filteredCommands.length;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedCommandIndex =
					(selectedCommandIndex - 1 + filteredCommands.length) % filteredCommands.length;
			} else if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				executeCommand(filteredCommands[selectedCommandIndex]);
			} else if (e.key === 'Escape') {
				showCommands = false;
			}
			return;
		}

		// Markdown Shortcuts
		if (e.ctrlKey || e.metaKey) {
			if (e.key === 'b') {
				e.preventDefault();
				applyMarkdownFormat('**');
			} else if (e.key === 'i') {
				e.preventDefault();
				applyMarkdownFormat('_');
			}
		}

		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (typingTimeout) clearTimeout(typingTimeout);
			chatStore.setTyping(channelId, false);
			await send();
		}
	}

	async function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		const cursorPosition = target.selectionStart;
		const textBeforeCursor = content.slice(0, cursorPosition);

		// Trigger Detection Logic
		const triggerMatch = textBeforeCursor.match(/([@#![])(\w*)$/);

		if (triggerMatch) {
			const trigger = triggerMatch[1];
			const query = triggerMatch[2];

			if (trigger !== mentionTrigger) {
				mentionTrigger = trigger;
				// Load specialized items based on trigger
				await loadMentionItems(trigger);
			}

			showMentions = true;
			if (mentionPaletteRef) mentionPaletteRef.updateSearch(query);
		} else {
			showMentions = false;
			mentionTrigger = '';
		}

		showCommands = content.startsWith('/') && !showMentions;
		if (showCommands) selectedCommandIndex = 0;

		if (typingTimeout) clearTimeout(typingTimeout);
		chatStore.setTyping(channelId, true);
		typingTimeout = setTimeout(() => {
			chatStore.setTyping(channelId, false);
		}, 3000);
	}

	async function loadMentionItems(trigger: string) {
		const workspaceId = $workspaceStore.currentWorkspace?.id;
		if (!workspaceId) return;

		switch (trigger) {
			case '@':
				mentionItems = $workspaceStore.members.map((m) => ({
					id: m.user_id,
					name: m.profile.username || 'Unknown User',
					avatar: m.profile.avatar_url || undefined,
					type: 'user'
				}));
				break;
			case '#':
				mentionItems = chatStore.channels.map((c) => ({
					id: c.id,
					name: c.name || 'Unnamed Channel',
					type: 'chan',
					icon: c.type === 'private' ? '🔒' : '#'
				}));
				break;
			case '!': {
				// Fetch snippets for current workspace
				const { data: snippets } = await snippetService.list(workspaceId, { limit: 50 });
				mentionItems = (snippets || []).map((s) => ({
					id: s.id,
					name: s.title,
					type: 'snip',
					subtitle: s.language,
					icon: '✂️'
				}));
				break;
			}
			case '[':
				mentionItems = notesStore.notes.map((n) => ({
					id: n.id,
					name: n.title,
					type: 'note',
					icon: '📝'
				}));
				break;
		}
	}

	function handleMentionSelect(item: ListItem) {
		const cursorPosition = (document.activeElement as HTMLTextAreaElement).selectionStart;
		const textBeforeCursor = content.slice(0, cursorPosition);
		const textAfterCursor = content.slice(cursorPosition);

		// Find the last trigger before cursor
		const lastTriggerIndex = textBeforeCursor.lastIndexOf(mentionTrigger);
		if (lastTriggerIndex === -1) return;

		const token = resourceParser.serialize(item.type, item.id, item.name);
		content = content.slice(0, lastTriggerIndex) + token + ' ' + textAfterCursor;
		showMentions = false;

		// Refocus
		setTimeout(() => {
			if (textareaRef) textareaRef.focus();
		}, 0);
	}

	function applyMarkdownFormat(symbol: string) {
		if (!textareaRef) return;
		const start = textareaRef.selectionStart;
		const end = textareaRef.selectionEnd;
		const selection = content.substring(start, end);
		const before = content.substring(0, start);
		const after = content.substring(end);

		content = before + symbol + selection + symbol + after;

		setTimeout(() => {
			if (textareaRef) {
				textareaRef.focus();
				textareaRef.setSelectionRange(start + symbol.length, end + symbol.length);
			}
		}, 0);
	}

	async function executeCommand(command: (typeof commands)[0]) {
		const workspaceId = $workspaceStore.currentWorkspace?.id;
		if (!workspaceId) return;

		const query = content.replace(/^\/[a-zA-Z]+\s*/, '').trim();
		content = '';
		showCommands = false;
		isSubmitting = true;

		try {
			const context = await contextBuilder.buildWorkspaceContext(workspaceId, channelId);
			const contextStr = contextBuilder.formatContextToString(context);

			let prompt = '';
			let systemPrompt = `You are NeuroAI, a high-performance developer assistant. Use the following workspace context to answer accurately:\n\n${contextStr}`;

			if (command.id === 'summarize') {
				prompt =
					'Please provide a concise summary of the recent chat activity, highlighting the main topics and decisions.';
			} else if (command.id === 'ask') {
				prompt = query || 'How can I help you today with this workspace?';
			} else if (command.id === 'explain') {
				prompt = 'Identify any code blocks in the recent messages and explain them clearly.';
			} else if (command.id === 'review') {
				prompt =
					'Perform a brief code review for any code shared in the recent chat history. Focus on potential bugs and improvements.';
			} else if (command.id === 'todo') {
				prompt =
					'Analyze the recent messages and extract a list of action items or TODOs mentioned by the team.';
			} else if (command.id === 'draft') {
				const topic = query || 'the current discussion';
				prompt = `Draft a comprehensive knowledge entry (note) based on the recent chat discussion about ${topic}. Format as clean semantic HTML.`;
			} else if (command.id === 'translate') {
				const lang = query || 'English';
				prompt = `Translate the last few messages in the chat to ${lang}.`;
			}

			// We use aiStore to handle the generation state which the UI can listen to
			const user = get(authStore).user;
			await aiStore.generateCustom(prompt, systemPrompt, workspaceId, user?.id);
		} catch (err) {
			console.error('[SlashCommand] Error:', err);
			toast.show('AI Command failed', 'error');
		} finally {
			isSubmitting = false;
		}
	}

	async function send() {
		if (!content.trim() || isSubmitting) return;
		if (content.length > 2000) {
			toast.show('Message is too long (max 2000 characters)', 'error');
			return;
		}

		isSubmitting = true;
		const messageContent = content;
		content = ''; // Clear early for better UX

		try {
			await chatStore.sendMessage(messageContent, { parentId });
		} catch (err) {
			content = messageContent; // Restore on error
			console.error('[MessageInput] Failed to send:', err);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div
	class="group relative flex flex-col gap-2 rounded-2xl border border-stroke/50 bg-surface-dim/40 p-3 backdrop-blur-xl transition-all duration-500 {isFocused
		? 'border-brand-orange/40 bg-surface-dim/60 shadow-[0_0_30px_-10px_rgba(255,107,0,0.15)] ring-1 ring-brand-orange/20'
		: 'hover:border-stroke hover:bg-surface-dim/50'}"
>
	{#if showMentions}
		<MentionPalette
			bind:this={mentionPaletteRef}
			trigger={mentionTrigger}
			items={mentionItems}
			onSelect={handleMentionSelect}
			onClose={() => (showMentions = false)}
		/>
	{/if}

	{#if showCommands && filteredCommands.length > 0}
		<div
			transition:fly={{ y: 20, duration: 300 }}
			class="absolute bottom-full left-0 mb-4 w-72 overflow-hidden rounded-xl border border-stroke bg-surface-dim/95 shadow-2xl backdrop-blur-2xl"
		>
			<div class="border-b border-stroke bg-surface/50 px-3 py-2">
				<span class="text-[10px] font-black tracking-widest text-content-dim uppercase"
					>AI Commands</span
				>
			</div>
			<div class="scrollbar-hide max-h-60 overflow-y-auto p-1">
				{#each filteredCommands as cmd, i (cmd.id)}
					<button
						onclick={() => executeCommand(cmd)}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all {i ===
						selectedCommandIndex
							? 'bg-brand-orange/15 text-brand-orange'
							: 'text-content-dim hover:bg-white/5 hover:text-content'}"
					>
						<span class="text-lg">{cmd.icon}</span>
						<div class="flex flex-col">
							<span class="text-xs font-bold">/{cmd.id}</span>
							<span class="text-[10px] opacity-60">{cmd.description}</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="flex items-start gap-2">
		<!-- Attach Button -->
		<button
			class="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-content-dim transition-all hover:bg-brand-orange/10 hover:text-brand-orange"
			aria-label="Attach file"
			title="Attach file"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M12 4v16m8-8H4"
				/>
			</svg>
		</button>

		<div class="flex min-w-0 flex-1 flex-col gap-1">
			{#if isFocused || content.length > 0}
				<div transition:slide={{ duration: 300 }}>
					<FormattingToolbar textarea={textareaRef} onFormat={(val) => (content = val)} />
				</div>
			{/if}

			<textarea
				bind:this={textareaRef}
				bind:value={content}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onfocus={() => (isFocused = true)}
				onblur={() => (isFocused = false)}
				{placeholder}
				class="scrollbar-hide max-h-[400px] min-h-[40px] w-full resize-none bg-transparent py-2.5 text-sm leading-relaxed text-content transition-all outline-none placeholder:text-content-dim/30"
				style="height: auto;"
			></textarea>

			{#if content.length > 1500}
				<div
					transition:fly={{ y: 10, duration: 200 }}
					class="flex justify-end text-[9px] font-bold tracking-widest uppercase {content.length >
					2000
						? 'text-red-500'
						: 'text-content-dim/40'}"
				>
					{content.length} / 2000
				</div>
			{/if}
		</div>

		<div class="mt-1 flex shrink-0 items-center gap-1.5">
			<div class="relative">
				<button
					onclick={() => (showEmojiPicker = !showEmojiPicker)}
					class="flex h-9 w-9 items-center justify-center rounded-xl text-content-dim transition-all hover:bg-brand-orange/10 hover:text-brand-orange {showEmojiPicker
						? 'bg-brand-orange/20 text-brand-orange'
						: ''}"
					aria-label="Insert emoji"
					title="Insert emoji"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</button>

				{#if showEmojiPicker}
					<div
						transition:fly={{ y: 20, duration: 400 }}
						class="absolute right-0 bottom-full z-50 mb-4 shadow-2xl"
					>
						<EmojiPicker
							onSelect={(emoji) => {
								content += emoji;
								showEmojiPicker = false;
							}}
						/>
					</div>
				{/if}
			</div>

			<Button
				variant="primary"
				size="sm"
				disabled={!content.trim() || isSubmitting}
				onclick={send}
				class="group/send h-9 w-9 overflow-hidden rounded-xl p-0! shadow-neon-orange transition-all hover:scale-105 active:scale-95"
				aria-label="Send message"
				title="Send message"
			>
				<div
					class="flex h-full w-full items-center justify-center bg-brand-orange transition-colors group-hover/send:bg-brand-orange/90"
				>
					<svg
						class="h-4 w-4 rotate-90 text-zinc-950 transition-transform group-hover/send:translate-x-0.5"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
						/>
					</svg>
				</div>
			</Button>
		</div>
	</div>
</div>
