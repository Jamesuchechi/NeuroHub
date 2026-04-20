<script lang="ts">
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import { fly } from 'svelte/transition';
	import Button from '../ui/Button.svelte';
	import EmojiPicker from './EmojiPicker.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { contextBuilder } from '$lib/utils/contextBuilder';
	import { toast } from '$lib/stores/toastStore';
	import { aiStore } from '$lib/stores/aiStore.svelte';
	import { authStore } from '$lib/stores/authStore';
	import { get } from 'svelte/store';

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

	let showCommands = $state(false);
	let selectedCommandIndex = $state(0);
	const filteredCommands = $derived(
		content.startsWith('/')
			? commands.filter((c) => c.id.includes(content.toLowerCase().slice(1)))
			: []
	);

	async function handleKeydown(e: KeyboardEvent) {
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

		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (typingTimeout) clearTimeout(typingTimeout);
			chatStore.setTyping(channelId, false);
			await send();
		}
	}

	function handleInput() {
		showCommands = content.startsWith('/');
		if (showCommands) selectedCommandIndex = 0;

		if (typingTimeout) clearTimeout(typingTimeout);
		chatStore.setTyping(channelId, true);
		typingTimeout = setTimeout(() => {
			chatStore.setTyping(channelId, false);
		}, 3000);
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
	class="relative flex flex-col gap-2 rounded-2xl border border-stroke bg-surface-dim/50 p-3 transition-all duration-300 {isFocused
		? 'bg-surface-dim/80 shadow-lg ring-1 ring-brand-orange/30'
		: ''}"
>
	{#if showCommands && filteredCommands.length > 0}
		<div
			transition:fly={{ y: 20, duration: 300 }}
			class="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-xl border border-stroke bg-surface-dim shadow-2xl"
		>
			<div class="border-b border-stroke bg-surface/50 px-3 py-2">
				<span class="text-[10px] font-black tracking-widest text-content-dim uppercase"
					>AI Commands</span
				>
			</div>
			<div class="p-1">
				{#each filteredCommands as cmd, i (cmd.id)}
					<button
						onclick={() => executeCommand(cmd)}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors {i ===
						selectedCommandIndex
							? 'bg-brand-orange/10 text-brand-orange'
							: 'text-content-dim hover:bg-surface'}"
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

	<div class="flex items-end gap-3">
		<!-- Emoji/Plus placeholder -->
		<button
			class="mb-1 flex h-9 w-9 items-center justify-center rounded-xl p-2 text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
			aria-label="Attach file"
			title="Attach file"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</button>

		<textarea
			bind:value={content}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={() => (isFocused = true)}
			onblur={() => (isFocused = false)}
			{placeholder}
			class="max-h-[200px] min-h-[40px] w-full flex-1 resize-none bg-transparent py-2 text-sm text-content outline-none placeholder:text-content-dim/30"
			style="height: auto;"
		></textarea>

		<div class="relative mb-1 flex items-center gap-1">
			<button
				onclick={() => (showEmojiPicker = !showEmojiPicker)}
				class="flex h-9 w-9 items-center justify-center rounded-xl p-2 text-content-dim transition-colors hover:bg-surface hover:text-brand-orange {showEmojiPicker
					? 'border-brand-orange/20 bg-surface text-brand-orange'
					: ''}"
				aria-label="Insert emoji"
				title="Insert emoji"
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

			{#if showEmojiPicker}
				<div
					transition:fly={{ y: 20, duration: 400 }}
					class="absolute right-0 bottom-16 z-50 shadow-2xl"
				>
					<EmojiPicker
						onSelect={(emoji) => {
							content += emoji;
							showEmojiPicker = false;
						}}
					/>
				</div>
			{/if}

			<Button
				variant="primary"
				size="sm"
				width="auto"
				disabled={!content.trim() || isSubmitting}
				onclick={send}
				class="h-9 w-9 rounded-xl p-0!"
				aria-label="Send message"
				title="Send message"
			>
				<svg class="h-4 w-4 rotate-90" fill="currentColor" viewBox="0 0 20 20">
					<path
						d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
					/>
				</svg>
			</Button>
		</div>
	</div>
</div>
