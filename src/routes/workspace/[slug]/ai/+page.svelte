<script lang="ts">
	import { aiStore, type AIModel } from '$lib/stores/aiStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { profileStore } from '$lib/stores/profileStore';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { fade, fly } from 'svelte/transition';
	import SafeMarkdown from '$lib/components/ui/SafeMarkdown.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import MentionAutocomplete from '$lib/components/ai/MentionAutocomplete.svelte';
	import type { MentionItem } from '$lib/components/ai/types';
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';

	const currentWorkspace = $derived($workspaceStore.currentWorkspace);
	const profile = $derived($profileStore.profile);

	// ── Core State ────────────────────────────────────────────────────────────────
	let messageInput = $state('');
	let scrollContainer = $state<HTMLElement | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let sidebarOpen = $state(true);
	let hoveredConvId = $state<string | null>(null);
	let attachedFiles = $state<File[]>([]);
	let isDragging = $state(false);

	// ── @Mention State ────────────────────────────────────────────────────────────
	let mentionQuery = $state<string | null>(null);
	let mentionStartPos = $state<number>(-1);
	let mentionActiveIndex = $state(0);

	const mentionResults = $derived<MentionItem[]>(
		mentionQuery !== null
			? notesStore.notes
					.filter(
						(n) =>
							mentionQuery === '' || n.title.toLowerCase().includes(mentionQuery!.toLowerCase())
					)
					.slice(0, 8)
					.map((n) => ({ id: n.id, title: n.title, type: 'note' as const }))
			: []
	);

	$effect(() => {
		if (mentionQuery !== null) mentionActiveIndex = 0;
	});

	// ── Message History Navigation ────────────────────────────────────────────────
	let historyNavIndex = $state(-1);

	const userMessages = $derived(aiStore.messages.filter((m) => m.role === 'user'));

	// ── Model Selector ────────────────────────────────────────────────────────────
	const modelOptions: { value: AIModel; icon: string; label: string; desc: string }[] = [
		{ value: 'fast', icon: '⚡', label: 'Fast', desc: 'Groq Llama 3.3 70B — instant' },
		{ value: 'stable', icon: '⚖️', label: 'Balanced', desc: 'Mistral Small — reliable' },
		{ value: 'intelligent', icon: '🧠', label: 'Intelligent', desc: 'Llama 70B + Mistral Large' }
	];

	function selectModel(m: AIModel) {
		aiStore.setModel(m);
		try {
			localStorage.setItem('neuro-ai-model', m);
		} catch {
			/* ignore */
		}
	}

	// ── Custom System Prompt Panel ────────────────────────────────────────────────
	let showSystemPromptPanel = $state(false);
	let systemPromptDraft = $state('');
	let systemPromptSaved = $state(false);

	function openSystemPromptPanel() {
		systemPromptDraft = aiStore.activeConversationSystemPrompt;
		showSystemPromptPanel = !showSystemPromptPanel;
	}

	function applySystemPrompt() {
		aiStore.setConversationSystemPrompt(systemPromptDraft);
		systemPromptSaved = true;
		setTimeout(() => {
			systemPromptSaved = false;
			showSystemPromptPanel = false;
		}, 1000);
	}

	function clearSystemPrompt() {
		systemPromptDraft = '';
		aiStore.setConversationSystemPrompt('');
		showSystemPromptPanel = false;
	}

	// ── Scroll ─────────────────────────────────────────────────────────────────
	async function scrollToBottom() {
		await tick();
		if (scrollContainer) {
			scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
		}
	}

	// ── Textarea Auto-Resize ──────────────────────────────────────────────────────
	function autoResize() {
		if (!textareaEl) return;
		textareaEl.style.height = 'auto';
		textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
	}

	// ── Input Handler ──────────────────────────────────────────────────────────────
	function handleInput() {
		autoResize();
		historyNavIndex = -1; // reset history nav on any typing
		if (!textareaEl) return;

		const cursorPos = textareaEl.selectionStart;
		const textBeforeCursor = messageInput.slice(0, cursorPos);
		const mentionMatch = textBeforeCursor.match(/@([^@\s]*)$/);
		if (mentionMatch) {
			mentionQuery = mentionMatch[1];
			mentionStartPos = textBeforeCursor.length - mentionMatch[0].length;
		} else {
			mentionQuery = null;
			mentionStartPos = -1;
		}
	}

	// ── @Mention Selection ─────────────────────────────────────────────────────────
	function handleMentionSelect(item: MentionItem) {
		if (!textareaEl || mentionStartPos === -1) return;
		const cursorPos = textareaEl.selectionStart;
		const before = messageInput.slice(0, mentionStartPos);
		const after = messageInput.slice(cursorPos);
		messageInput = `${before}@[${item.title}](${item.id}) ${after}`;
		mentionQuery = null;
		mentionStartPos = -1;
		tick().then(() => {
			textareaEl?.focus();
			autoResize();
		});
	}

	// ── History Navigation ──────────────────────────────────────────────────────
	function applyHistoryNav(idx: number) {
		historyNavIndex = idx;
		messageInput = userMessages[idx].content;
		tick().then(() => {
			if (textareaEl) {
				textareaEl.selectionStart = textareaEl.selectionEnd = textareaEl.value.length;
			}
			autoResize();
		});
	}

	// ── Send ────────────────────────────────────────────────────────────────────
	async function handleSend() {
		if ((!messageInput.trim() && attachedFiles.length === 0) || aiStore.isGenerating) return;

		let content = messageInput;
		if (attachedFiles.length > 0) {
			const fileNames = attachedFiles.map((f) => f.name).join(', ');
			content = `[Attached files: ${fileNames}]\n\n` + content;
		}

		messageInput = '';
		attachedFiles = [];
		historyNavIndex = -1;
		if (textareaEl) textareaEl.style.height = 'auto';
		await aiStore.sendMessage(content, currentWorkspace?.id);
		scrollToBottom();
	}

	// ── Keyboard Handler ───────────────────────────────────────────────────────────
	function handleKeydown(e: KeyboardEvent) {
		// @Mention navigation takes priority
		if (mentionQuery !== null && mentionResults.length > 0) {
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				mentionActiveIndex = Math.max(0, mentionActiveIndex - 1);
				return;
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				mentionActiveIndex = Math.min(mentionResults.length - 1, mentionActiveIndex + 1);
				return;
			}
			if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				if (mentionResults[mentionActiveIndex])
					handleMentionSelect(mentionResults[mentionActiveIndex]);
				return;
			}
			if (e.key === 'Escape') {
				mentionQuery = null;
				mentionStartPos = -1;
				return;
			}
		}

		// History navigation — only when textarea is empty
		if (e.key === 'ArrowUp' && !messageInput.trim() && mentionQuery === null) {
			e.preventDefault();
			if (userMessages.length === 0) return;
			const nextIdx =
				historyNavIndex === -1 ? userMessages.length - 1 : Math.max(0, historyNavIndex - 1);
			applyHistoryNav(nextIdx);
			return;
		}
		if (e.key === 'ArrowDown' && historyNavIndex !== -1 && mentionQuery === null) {
			e.preventDefault();
			if (historyNavIndex >= userMessages.length - 1) {
				historyNavIndex = -1;
				messageInput = '';
				autoResize();
			} else {
				applyHistoryNav(historyNavIndex + 1);
			}
			return;
		}

		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	// ── Export Conversation ────────────────────────────────────────────────────────
	function exportConversation() {
		const conv = aiStore.conversations.find((c) => c.id === aiStore.activeConversationId);
		if (!conv || conv.messages.length === 0) return;

		const dateStr = new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		const lines = [
			`# ${conv.title}`,
			`_Exported from NeuroAI · ${currentWorkspace?.name ?? 'NeuroHub'} · ${dateStr}_`,
			''
		];

		for (const msg of conv.messages) {
			if (msg.role === 'user') {
				lines.push('---', '', '**You**', '', msg.content, '');
			} else {
				lines.push('---', '', '**NeuroAI**', '', msg.content, '');
			}
		}

		const content = lines.join('\n');
		const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${conv.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ── New Chat ──────────────────────────────────────────────────────────────────
	function handleNewChat() {
		aiStore.newConversation();
		showSystemPromptPanel = false;
		systemPromptDraft = '';
	}

	// ── File Handling ──────────────────────────────────────────────────────────────
	function triggerFileInput() {
		fileInputEl?.click();
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			attachedFiles = [...attachedFiles, ...Array.from(input.files)];
			input.value = '';
		}
	}

	function removeFile(index: number) {
		attachedFiles = attachedFiles.filter((_, i) => i !== index);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}
	function handleDragLeave() {
		isDragging = false;
	}
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files) {
			attachedFiles = [...attachedFiles, ...Array.from(e.dataTransfer.files)];
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function getFileIcon(file: File): string {
		if (file.type.startsWith('image/')) return '🖼️';
		if (file.type.startsWith('video/')) return '🎬';
		if (file.type.startsWith('audio/')) return '🎵';
		if (file.type.includes('pdf')) return '📄';
		if (file.type.includes('zip') || file.type.includes('tar')) return '📦';
		if (file.name.endsWith('.md') || file.name.endsWith('.txt')) return '📝';
		return '📎';
	}

	// ── Save as Note ──────────────────────────────────────────────────────────────
	async function saveMessage(content: string) {
		if (!currentWorkspace?.id || !profile?.id) return;
		await aiStore.saveMessageAsNote(content, currentWorkspace.id, profile.id);
	}

	// ── Rating ────────────────────────────────────────────────────────────────────
	async function rateMessage(timestamp: number, rating: 1 | -1) {
		await aiStore.rateMessage(timestamp, rating, currentWorkspace?.id);
	}

	// ── Derive last assistant message timestamp for regenerate button ──────────────
	const lastAssistantTimestamp = $derived(
		aiStore.messages.findLast((m) => m.role === 'assistant')?.timestamp ?? -1
	);

	// ── Suggestion Cards ───────────────────────────────────────────────────────────
	const suggestions = [
		{
			icon: '💡',
			title: 'Brainstorm ideas',
			prompt: 'Help me brainstorm ideas for improving my workspace productivity.'
		},
		{
			icon: '🔍',
			title: 'Code review',
			prompt: 'Review this code snippet for bugs and optimization opportunities.'
		},
		{
			icon: '📝',
			title: 'Write docs',
			prompt: 'Help me write clear documentation for my latest feature.'
		},
		{
			icon: '🏗️',
			title: 'Architecture advice',
			prompt: 'Suggest the best architecture for a real-time collaboration feature.'
		}
	];

	// ── Lifecycle ─────────────────────────────────────────────────────────────────
	$effect(() => {
		if (aiStore.messages.length > 0 || aiStore.currentGeneration) scrollToBottom();
	});

	onMount(() => {
		// Restore model preference
		try {
			const saved = localStorage.getItem('neuro-ai-model');
			if (saved && ['intelligent', 'stable', 'fast'].includes(saved)) {
				aiStore.setModel(saved as AIModel);
			}
		} catch {
			/* ignore */
		}
		scrollToBottom();
	});
</script>

<svelte:head>
	<title>NeuroAI · {currentWorkspace?.name || 'Workspace'}</title>
</svelte:head>

<input
	bind:this={fileInputEl}
	type="file"
	multiple
	class="hidden"
	onchange={handleFileSelect}
	accept="*/*"
/>

<div
	class="ai-chat-root flex h-screen overflow-hidden"
	role="region"
	aria-label="NeuroAI chat workspace"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<!-- Drag overlay -->
	{#if isDragging}
		<div
			class="drop-overlay fixed inset-0 z-50 flex items-center justify-center"
			in:fade={{ duration: 150 }}
		>
			<div class="drop-overlay-inner flex flex-col items-center gap-4 rounded-3xl p-12">
				<svg
					class="h-16 w-16 text-orange-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
					/>
				</svg>
				<p class="text-xl font-bold text-orange-400">Drop files to attach</p>
			</div>
		</div>
	{/if}

	<!-- ── Sidebar ── -->
	<aside
		class="ai-sidebar flex flex-col transition-all duration-300 ease-in-out {sidebarOpen
			? 'w-64'
			: 'w-0 overflow-hidden'}"
	>
		<div class="flex h-full flex-col p-3">
			<button
				onclick={handleNewChat}
				class="new-chat-btn mb-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:scale-[1.01]"
			>
				<svg class="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				New Chat
			</button>

			<p class="sidebar-label mb-2 px-2 text-[10px] font-bold tracking-widest uppercase">Recent</p>

			<ul class="scrollbar-none flex-1 space-y-0.5 overflow-y-auto">
				{#if aiStore.conversations.length === 0}
					<p class="sidebar-empty px-3 py-4 text-center text-[11px] italic">No conversations yet</p>
				{/if}
				{#each aiStore.conversations as conv (conv.id)}
					<li
						class="group relative"
						onmouseenter={() => (hoveredConvId = conv.id)}
						onmouseleave={() => (hoveredConvId = null)}
					>
						<button
							onclick={() => aiStore.switchConversation(conv.id)}
							class="conv-item w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all {aiStore.activeConversationId ===
							conv.id
								? 'conv-active'
								: 'conv-inactive'}"
						>
							<p class="truncate leading-snug font-medium">{conv.title}</p>
							<p class="conv-date mt-0.5 text-[10px]">
								{new Date(conv.createdAt).toLocaleDateString()}
							</p>
						</button>
						{#if hoveredConvId === conv.id}
							<button
								onclick={() => aiStore.deleteConversation(conv.id)}
								class="conv-delete absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 transition-all hover:bg-red-500/20 hover:text-red-400"
								title="Delete conversation"
								in:fade={{ duration: 100 }}
							>
								<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						{/if}
					</li>
				{/each}
			</ul>

			<div class="sidebar-border mt-auto border-t pt-3">
				<div class="flex items-center gap-2 rounded-lg px-2 py-1.5">
					<div
						class="flex h-6 w-6 items-center justify-center rounded bg-linear-to-br from-orange-500 to-blue-500 text-[8px] font-black text-white"
					>
						{currentWorkspace?.name?.[0] ?? 'N'}
					</div>
					<p class="workspace-name flex-1 truncate text-[11px] font-semibold">
						{currentWorkspace?.name ?? 'NeuroHub'}
					</p>
				</div>
			</div>
		</div>
	</aside>

	<!-- ── Main ── -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Topbar -->
		<header class="ai-topbar flex h-14 shrink-0 items-center justify-between px-4">
			<div class="flex items-center gap-3">
				<button
					onclick={() => (sidebarOpen = !sidebarOpen)}
					class="topbar-icon-btn rounded-lg p-1.5 transition-colors"
					title="Toggle sidebar"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>
				<div class="flex items-center gap-2">
					<div
						class="flex h-6 w-6 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-blue-500"
					>
						<svg
							class="h-3.5 w-3.5 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
					</div>
					<span class="topbar-title text-sm font-bold">NeuroAI</span>
					<span
						class="topbar-badge rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
						>Multi-Model</span
					>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<!-- Model selector -->
				<div
					class="model-selector flex items-center gap-0.5 rounded-xl p-0.5"
					role="group"
					aria-label="AI model"
				>
					{#each modelOptions as opt (opt.value)}
						<button
							onclick={() => selectModel(opt.value)}
							class="model-btn {aiStore.selectedModel === opt.value
								? 'model-btn-active'
								: 'model-btn-inactive'}"
							title={opt.desc}
							aria-pressed={aiStore.selectedModel === opt.value}
						>
							<span class="text-xs">{opt.icon}</span>
							<span class="hidden sm:block">{opt.label}</span>
						</button>
					{/each}
				</div>

				<!-- Custom persona / system prompt button -->
				<button
					onclick={openSystemPromptPanel}
					class="topbar-icon-btn rounded-lg p-1.5 transition-colors {aiStore.activeConversationSystemPrompt
						? 'system-prompt-active'
						: ''}"
					title="Custom AI persona for this chat"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
						/>
					</svg>
				</button>

				<!-- Export button -->
				<button
					onclick={exportConversation}
					class="topbar-icon-btn rounded-lg p-1.5 transition-colors"
					title="Export conversation as Markdown"
					disabled={aiStore.messages.length === 0}
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						/>
					</svg>
				</button>

				<!-- Status -->
				<div class="flex items-center gap-1.5">
					<div
						class="h-1.5 w-1.5 rounded-full {aiStore.isGenerating
							? 'animate-pulse bg-orange-400'
							: 'bg-emerald-400'}"
					></div>
					<span class="status-text text-[11px] font-medium"
						>{aiStore.isGenerating ? 'Generating…' : 'Ready'}</span
					>
				</div>
			</div>
		</header>

		<!-- Message Thread -->
		<main bind:this={scrollContainer} class="scrollbar-none flex-1 overflow-y-auto">
			<div class="mx-auto max-w-3xl px-4 py-8">
				{#if aiStore.messages.length === 0 && !aiStore.currentGeneration}
					<!-- Empty State -->
					<div
						in:fade={{ duration: 300, delay: 100 }}
						class="flex flex-col items-center pt-16 text-center"
					>
						<div class="relative mb-8">
							<div class="absolute inset-0 rounded-full bg-orange-500/10 blur-3xl"></div>
							<div
								class="empty-icon-bg relative flex h-20 w-20 items-center justify-center rounded-2xl"
							>
								<svg
									class="h-10 w-10 text-orange-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									/>
								</svg>
							</div>
						</div>
						<h1 class="empty-title text-2xl font-black">What can I help you build?</h1>
						<p class="empty-subtitle mt-3 max-w-sm text-sm leading-relaxed">
							Powered by a resilient AI model stack with full workspace awareness. Ask anything — I
							know your notes, snippets, and context.
						</p>
						<p class="empty-hint mt-2 text-xs">
							💡 Type <kbd class="hint-kbd">@</kbd> to reference a note ·
							<kbd class="hint-kbd">↑</kbd> to recall a previous prompt
						</p>
						<div class="mt-10 grid w-full grid-cols-2 gap-3">
							{#each suggestions as sug (sug.title)}
								<button
									onclick={() => {
										messageInput = sug.prompt;
										handleSend();
									}}
									class="suggestion-card group flex items-start gap-3 rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
								>
									<span class="mt-0.5 shrink-0 text-xl">{sug.icon}</span>
									<div>
										<p
											class="suggestion-title text-sm font-semibold transition-colors group-hover:text-orange-500"
										>
											{sug.title}
										</p>
										<p class="suggestion-desc mt-1 line-clamp-1 text-[11px]">{sug.prompt}</p>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Messages -->
				<div class="space-y-6">
					{#each aiStore.messages as msg (msg.timestamp)}
						<div in:fly={{ y: 16, duration: 300 }}>
							{#if msg.role === 'user'}
								<!-- User bubble -->
								<div class="flex items-start justify-end gap-3">
									<div class="user-bubble max-w-[85%] rounded-2xl rounded-tr-sm px-5 py-3.5">
										<p class="user-bubble-text text-sm leading-relaxed whitespace-pre-wrap">
											{msg.content}
										</p>
									</div>
									<div class="mt-1 shrink-0">
										<Avatar name={profile?.username || 'You'} size="sm" src={profile?.avatar_url} />
									</div>
								</div>
							{:else}
								<!-- AI response -->
								<div class="flex items-start gap-3">
									<div
										class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-blue-500 shadow-lg shadow-orange-500/20"
									>
										<svg
											class="h-4 w-4 text-white"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 10V3L4 14h7v7l9-11h-7z"
											/>
										</svg>
									</div>
									<div class="min-w-0 flex-1">
										<p class="ai-label mb-2 text-[10px] font-bold tracking-widest uppercase">
											NeuroAI
										</p>
										<div class="ai-prose prose prose-sm max-w-none">
											<SafeMarkdown content={msg.content} />
										</div>

										<!-- ── Inline Source Citations ── -->
										{#if msg.references && msg.references.length > 0}
											<details class="citations-disclosure mt-3" in:fade>
												<summary class="citations-summary cursor-pointer select-none">
													<svg
														class="mr-1 inline h-3 w-3"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
														/>
													</svg>
													{msg.references.length} context source{msg.references.length > 1
														? 's'
														: ''} used
												</summary>
												<ul class="citations-list mt-2 space-y-1 pl-2">
													{#each msg.references as ref (ref.id)}
														<li>
															<a
																href={resolve(
																	`/workspace/${currentWorkspace?.slug}/notes/${ref.id}` as unknown as '/'
																)}
																class="citation-link text-[11px]"
																target="_blank"
																rel="noopener">📝 {ref.title}</a
															>
														</li>
													{/each}
												</ul>
											</details>
										{/if}

										<!-- ── Message Actions ── -->
										<div class="mt-3 flex flex-wrap items-center gap-2">
											<!-- Save as Note -->
											<button
												onclick={() => saveMessage(msg.content)}
												disabled={aiStore.isSavingNote}
												class="save-note-btn flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all disabled:opacity-50"
												title="Save as note"
											>
												<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
													/>
												</svg>
												{aiStore.isSavingNote ? 'Saving…' : 'Save as Note'}
											</button>

											<!-- Regenerate (last assistant message only) -->
											{#if msg.timestamp === lastAssistantTimestamp && !aiStore.isGenerating}
												<button
													onclick={() => aiStore.regenerate(currentWorkspace?.id)}
													class="regen-btn flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all"
													title="Regenerate response"
												>
													<svg
														class="h-3 w-3"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
														/>
													</svg>
													Regenerate
												</button>
											{/if}

											<!-- Quality Rating -->
											<div class="ml-auto flex items-center gap-1">
												<button
													onclick={() => rateMessage(msg.timestamp, 1)}
													class="rating-btn {msg.rating === 1 ? 'rating-btn-positive' : ''}"
													title="Good response"
												>
													👍
												</button>
												<button
													onclick={() => rateMessage(msg.timestamp, -1)}
													class="rating-btn {msg.rating === -1 ? 'rating-btn-negative' : ''}"
													title="Poor response"
												>
													👎
												</button>
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}

					<!-- Streaming -->
					{#if aiStore.isGenerating && aiStore.currentGeneration}
						<div class="flex items-start gap-3" in:fade={{ duration: 150 }}>
							<div
								class="mt-1 flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-blue-500 shadow-lg"
							>
								<svg
									class="h-4 w-4 text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<p class="ai-label mb-2 text-[10px] font-bold tracking-widest uppercase">NeuroAI</p>
								<div class="ai-prose prose prose-sm max-w-none">
									<SafeMarkdown content={aiStore.currentGeneration} />
									<span
										class="ml-0.5 inline-block h-4 w-0.5 animate-ping bg-orange-400 align-middle"
									></span>
								</div>
							</div>
						</div>
					{/if}

					<!-- Thinking indicator -->
					{#if aiStore.isGenerating && !aiStore.currentGeneration}
						<div class="flex items-start gap-3" in:fade={{ duration: 150 }}>
							<div
								class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-blue-500 shadow-lg"
							>
								<svg
									class="h-4 w-4 animate-spin text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
							</div>
							<div class="mt-2 flex gap-1">
								<span class="thinking-dot h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]"
								></span>
								<span
									class="thinking-dot h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]"
								></span>
								<span
									class="thinking-dot h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]"
								></span>
							</div>
						</div>
					{/if}

					{#if aiStore.error}
						<div class="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3" in:fade>
							<p class="text-xs text-red-400">{aiStore.error}</p>
							<button
								onclick={() => aiStore.clearError()}
								class="error-dismiss mt-1 text-[10px] font-bold uppercase transition-colors hover:text-red-400"
							>
								Dismiss
							</button>
						</div>
					{/if}
				</div>
			</div>
		</main>

		<!-- Footer -->
		<footer class="shrink-0 px-4 pt-3 pb-6">
			<div class="mx-auto max-w-3xl space-y-2">
				<!-- Custom System Prompt Panel -->
				{#if showSystemPromptPanel}
					<div class="system-prompt-panel rounded-xl p-3" in:fly={{ y: -8, duration: 200 }}>
						<div class="mb-2 flex items-center justify-between">
							<p class="flex items-center gap-1.5 text-[11px] font-semibold text-orange-400">
								<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
									/>
								</svg>
								Custom AI Persona (this conversation only)
							</p>
							<button
								onclick={clearSystemPrompt}
								class="system-prompt-clear text-[10px] transition-colors hover:text-red-400"
							>
								Clear &amp; close
							</button>
						</div>
						<textarea
							bind:value={systemPromptDraft}
							placeholder="E.g. You are a PostgreSQL expert who always suggests index optimizations and explains query plans…"
							rows="3"
							class="system-prompt-textarea w-full resize-none rounded-lg p-2.5 text-xs outline-none"
						></textarea>
						<div class="mt-2 flex justify-end">
							<button
								onclick={applySystemPrompt}
								class="system-prompt-apply flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all"
							>
								{#if systemPromptSaved}
									✓ Applied
								{:else}
									Apply Persona
								{/if}
							</button>
						</div>
					</div>
				{/if}

				<!-- File Attachments -->
				{#if attachedFiles.length > 0}
					<div class="flex flex-wrap gap-2" in:fly={{ y: 8, duration: 200 }}>
						{#each attachedFiles as file, index (index)}
							<div class="file-chip flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs">
								<span>{getFileIcon(file)}</span>
								<span class="file-chip-name max-w-[120px] truncate font-medium">{file.name}</span>
								<span class="file-chip-size">{formatFileSize(file.size)}</span>
								<button
									onclick={() => removeFile(index)}
									class="file-chip-remove ml-1 rounded p-0.5 transition-colors hover:text-red-400"
									title="Remove"
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
						{/each}
					</div>
				{/if}

				<!-- Input wrapper with mention autocomplete -->
				<div class="relative">
					<MentionAutocomplete
						results={mentionResults}
						activeIndex={mentionActiveIndex}
						visible={mentionQuery !== null}
						onSelect={handleMentionSelect}
					/>

					<div class="input-box group relative rounded-2xl transition-all">
						<textarea
							bind:this={textareaEl}
							bind:value={messageInput}
							onkeydown={handleKeydown}
							oninput={handleInput}
							placeholder="Message NeuroAI… (type @ for notes, ↑ for history)"
							rows="1"
							class="scrollbar-none input-textarea w-full resize-none bg-transparent px-5 py-4 pr-24 text-sm outline-none"
						></textarea>

						<div class="absolute right-3 bottom-3 flex items-center gap-1.5">
							<button
								onclick={triggerFileInput}
								class="attach-btn flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-105"
								title="Attach files"
								disabled={aiStore.isGenerating}
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
									/>
								</svg>
							</button>

							{#if aiStore.isGenerating}
								<button
									onclick={() => aiStore.abortGeneration()}
									class="stop-btn flex h-9 w-9 items-center justify-center rounded-xl shadow-lg transition-all hover:scale-105"
									title="Stop generating"
									aria-label="Stop generating"
									in:fade={{ duration: 100 }}
								>
									<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
										<rect x="6" y="6" width="12" height="12" rx="2" />
									</svg>
								</button>
							{:else}
								<button
									onclick={handleSend}
									disabled={!messageInput.trim() && attachedFiles.length === 0}
									class="send-btn flex h-9 w-9 items-center justify-center rounded-xl shadow-lg transition-all hover:scale-105 hover:brightness-110 disabled:scale-100 disabled:opacity-25 disabled:grayscale"
									aria-label="Send message"
								>
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2.5"
											d="M5 12h14M12 5l7 7-7 7"
										/>
									</svg>
								</button>
							{/if}
						</div>
					</div>
				</div>

				<p class="footer-hint text-center text-[10px]">
					Enter to send · Shift+Enter for newline · @ for notes · ↑ for history · AI may make
					mistakes
				</p>
			</div>
		</footer>
	</div>
</div>

<style>
	/* ─── Design tokens (light mode) ────────────────────────────────────────────
	   IMPORTANT: Must be on .ai-chat-root — NOT :root.
	   Svelte scopes :root to :root.svelte-hash which never matches <html>.
	   CSS custom properties set here cascade to all children automatically.
	────────────────────────────────────────────────────────────────────────── */
	.ai-chat-root {
		--ai-bg: #f9f9f9;
		--ai-sidebar-bg: #f0f0f2;
		--ai-sidebar-border: #dddde0;
		--ai-topbar-border: #dddde0;
		--ai-text: #09090b;
		--ai-text-dim: #3f3f46;
		--ai-text-faded: #52525b;
		--ai-hover-bg: rgba(0, 0, 0, 0.06);
		--ai-input-bg: rgba(0, 0, 0, 0.04);
		--ai-input-border: #d4d4d8;
		--ai-input-focus-border: rgba(249, 115, 22, 0.5);
		--ai-user-bubble: rgba(249, 115, 22, 0.12);
		--ai-user-bubble-border: rgba(249, 115, 22, 0.3);
		--ai-user-bubble-text: #1c1917;
		--ai-badge-bg: rgba(0, 0, 0, 0.06);
		--ai-suggestion-bg: rgba(0, 0, 0, 0.03);
		--ai-suggestion-border: #dddde0;
		--ai-file-chip-bg: rgba(0, 0, 0, 0.06);
		--ai-file-chip-border: #d4d4d8;
		--ai-prose-color: #18181b;
		--ai-thinking-dot: rgba(0, 0, 0, 0.25);
		--ai-attach-bg: rgba(0, 0, 0, 0.06);
		--ai-attach-color: #52525b;
		--ai-model-selector-bg: rgba(0, 0, 0, 0.07);
		--ai-model-btn-active-bg: #ffffff;
		--ai-model-btn-active-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
		--ai-action-bg: rgba(0, 0, 0, 0.05);
		--ai-action-border: #d4d4d8;
		--ai-action-color: #52525b;
		--ai-system-prompt-bg: rgba(249, 115, 22, 0.05);
		--ai-system-prompt-border: rgba(249, 115, 22, 0.25);
		--ai-system-prompt-input-bg: rgba(0, 0, 0, 0.04);
	}

	/* ─── Design tokens (dark mode) ──────────────────────────────────────────── */
	:global(.dark) .ai-chat-root {
		--ai-bg: #0a0a0a;
		--ai-sidebar-bg: #111111;
		--ai-sidebar-border: rgba(255, 255, 255, 0.05);
		--ai-topbar-border: rgba(255, 255, 255, 0.05);
		--ai-text: #ffffff;
		--ai-text-dim: rgba(255, 255, 255, 0.5);
		--ai-text-faded: rgba(255, 255, 255, 0.2);
		--ai-hover-bg: rgba(255, 255, 255, 0.05);
		--ai-input-bg: rgba(255, 255, 255, 0.04);
		--ai-input-border: rgba(255, 255, 255, 0.1);
		--ai-input-focus-border: rgba(249, 115, 22, 0.4);
		--ai-user-bubble: rgba(249, 115, 22, 0.15);
		--ai-user-bubble-border: rgba(249, 115, 22, 0.2);
		--ai-user-bubble-text: rgba(255, 255, 255, 0.9);
		--ai-badge-bg: rgba(255, 255, 255, 0.05);
		--ai-suggestion-bg: rgba(255, 255, 255, 0.03);
		--ai-suggestion-border: rgba(255, 255, 255, 0.05);
		--ai-file-chip-bg: rgba(255, 255, 255, 0.07);
		--ai-file-chip-border: rgba(255, 255, 255, 0.1);
		--ai-prose-color: rgba(255, 255, 255, 0.85);
		--ai-thinking-dot: rgba(255, 255, 255, 0.2);
		--ai-attach-bg: rgba(255, 255, 255, 0.07);
		--ai-attach-color: rgba(255, 255, 255, 0.4);
		--ai-model-selector-bg: rgba(255, 255, 255, 0.05);
		--ai-model-btn-active-bg: rgba(255, 255, 255, 0.12);
		--ai-model-btn-active-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
		--ai-action-bg: rgba(255, 255, 255, 0.05);
		--ai-action-border: rgba(255, 255, 255, 0.1);
		--ai-action-color: rgba(255, 255, 255, 0.35);
		--ai-system-prompt-bg: rgba(249, 115, 22, 0.05);
		--ai-system-prompt-border: rgba(249, 115, 22, 0.2);
		--ai-system-prompt-input-bg: rgba(255, 255, 255, 0.04);
	}

	/* ─── Layout ─────────────────────────────────────────────────────────────── */
	.ai-chat-root {
		background: var(--ai-bg);
		color: var(--ai-text);
	}
	.drop-overlay {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
	}
	.drop-overlay-inner {
		background: var(--ai-input-bg);
		border: 2px dashed rgba(249, 115, 22, 0.6);
	}

	/* ─── Sidebar ────────────────────────────────────────────────────────────── */
	.ai-sidebar {
		background: var(--ai-sidebar-bg);
		border-right: 1px solid var(--ai-sidebar-border);
	}
	.new-chat-btn {
		border: 1px solid var(--ai-sidebar-border);
		background: var(--ai-hover-bg);
		color: var(--ai-text-dim);
	}
	.new-chat-btn:hover {
		border-color: rgba(249, 115, 22, 0.4);
		color: var(--ai-text);
	}
	.sidebar-label {
		color: var(--ai-text-faded);
	}
	.sidebar-empty {
		color: var(--ai-text-faded);
	}
	.sidebar-border {
		border-color: var(--ai-sidebar-border);
	}
	.workspace-name {
		color: var(--ai-text-dim);
	}
	.conv-item {
		color: var(--ai-text-dim);
	}
	.conv-active {
		background: rgba(249, 115, 22, 0.15);
		color: var(--ai-text);
	}
	.conv-inactive:hover {
		background: var(--ai-hover-bg);
		color: var(--ai-text);
	}
	.conv-date {
		color: var(--ai-text-faded);
	}
	.conv-delete {
		color: var(--ai-text-faded);
	}

	/* ─── Topbar ─────────────────────────────────────────────────────────────── */
	.ai-topbar {
		border-bottom: 1px solid var(--ai-topbar-border);
	}
	.topbar-icon-btn {
		color: var(--ai-text-faded);
	}
	.topbar-icon-btn:hover:not(:disabled) {
		background: var(--ai-hover-bg);
		color: var(--ai-text-dim);
	}
	.topbar-icon-btn:disabled {
		opacity: 0.3;
	}
	.topbar-title {
		color: var(--ai-text);
	}
	.topbar-badge {
		background: var(--ai-badge-bg);
		color: var(--ai-text-faded);
	}
	.status-text {
		color: var(--ai-text-faded);
	}
	.system-prompt-active {
		color: #f97316 !important;
	}

	/* ─── Model selector ─────────────────────────────────────────────────────── */
	.model-selector {
		background: var(--ai-model-selector-bg);
	}
	.model-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: 9px;
		font-size: 11px;
		font-weight: 600;
		color: var(--ai-text-dim);
		background: transparent;
		transition: all 0.15s ease;
		border: none;
		cursor: pointer;
	}
	.model-btn:hover {
		color: var(--ai-text);
	}
	.model-btn-active {
		background: var(--ai-model-btn-active-bg) !important;
		box-shadow: var(--ai-model-btn-active-shadow);
		color: var(--ai-text) !important;
	}
	.model-btn-inactive {
		color: var(--ai-text-dim);
	}

	/* ─── Empty state ────────────────────────────────────────────────────────── */
	.empty-icon-bg {
		border: 1px solid var(--ai-suggestion-border);
		background: var(--ai-hover-bg);
	}
	.empty-title {
		color: var(--ai-text);
	}
	.empty-subtitle {
		color: var(--ai-text-dim);
	}
	.empty-hint {
		color: var(--ai-text-faded);
	}
	.hint-kbd {
		display: inline-block;
		padding: 0 5px;
		border: 1px solid var(--ai-sidebar-border);
		border-radius: 4px;
		font-size: 11px;
		font-family: monospace;
	}
	.suggestion-card {
		border: 1px solid var(--ai-suggestion-border);
		background: var(--ai-suggestion-bg);
	}
	.suggestion-card:hover {
		border-color: rgba(249, 115, 22, 0.3);
		background: var(--ai-hover-bg);
	}
	.suggestion-title {
		color: var(--ai-text-dim);
	}
	.suggestion-desc {
		color: var(--ai-text-faded);
	}

	/* ─── Messages ───────────────────────────────────────────────────────────── */
	.user-bubble {
		background: var(--ai-user-bubble);
		border: 1px solid var(--ai-user-bubble-border);
	}
	.user-bubble-text {
		color: var(--ai-user-bubble-text);
	}
	.ai-label {
		color: var(--ai-text-faded);
	}
	.ai-prose {
		color: var(--ai-prose-color);
	}
	.thinking-dot {
		background: var(--ai-thinking-dot);
	}
	.error-dismiss {
		color: var(--ai-text-faded);
	}

	/* ─── Citations ──────────────────────────────────────────────────────────── */
	.citations-disclosure {
	}
	.citations-summary {
		font-size: 11px;
		font-weight: 600;
		color: var(--ai-text-faded);
		transition: color 0.15s ease;
	}
	.citations-summary:hover {
		color: var(--ai-text-dim);
	}
	.citations-list {
		list-style: none;
		padding: 0;
	}
	.citation-link {
		color: rgba(249, 115, 22, 0.8);
		text-decoration: none;
		transition: color 0.1s ease;
	}
	.citation-link:hover {
		color: #f97316;
		text-decoration: underline;
	}

	/* ─── Message action buttons ─────────────────────────────────────────────── */
	.save-note-btn {
		border: 1px solid var(--ai-action-border);
		background: var(--ai-action-bg);
		color: var(--ai-action-color);
	}
	.save-note-btn:not(:disabled):hover {
		border-color: rgba(249, 115, 22, 0.4);
		color: #f97316;
		background: rgba(249, 115, 22, 0.06);
	}
	.regen-btn {
		border: 1px solid var(--ai-action-border);
		background: var(--ai-action-bg);
		color: var(--ai-action-color);
	}
	.regen-btn:hover {
		border-color: rgba(99, 102, 241, 0.4);
		color: #818cf8;
		background: rgba(99, 102, 241, 0.06);
	}

	/* ─── Quality rating ─────────────────────────────────────────────────────── */
	.rating-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		font-size: 14px;
		border: 1px solid transparent;
		background: transparent;
		cursor: pointer;
		transition: all 0.15s ease;
		filter: grayscale(1) opacity(0.4);
	}
	.rating-btn:hover {
		filter: grayscale(0) opacity(0.9);
		background: var(--ai-hover-bg);
		border-color: var(--ai-action-border);
	}
	.rating-btn-positive {
		filter: grayscale(0) opacity(1) !important;
		background: rgba(74, 222, 128, 0.1) !important;
		border-color: rgba(74, 222, 128, 0.3) !important;
	}
	.rating-btn-negative {
		filter: grayscale(0) opacity(1) !important;
		background: rgba(239, 68, 68, 0.1) !important;
		border-color: rgba(239, 68, 68, 0.3) !important;
	}

	/* ─── System prompt panel ────────────────────────────────────────────────── */
	.system-prompt-panel {
		background: var(--ai-system-prompt-bg);
		border: 1px solid var(--ai-system-prompt-border);
	}
	.system-prompt-clear {
		color: var(--ai-text-faded);
	}
	.system-prompt-textarea {
		background: var(--ai-system-prompt-input-bg);
		border: 1px solid var(--ai-system-prompt-border);
		color: var(--ai-text);
		font-size: 12px;
		line-height: 1.5;
	}
	.system-prompt-textarea::placeholder {
		color: var(--ai-text-faded);
	}
	.system-prompt-apply {
		background: rgba(249, 115, 22, 0.15);
		border: 1px solid rgba(249, 115, 22, 0.3);
		color: #f97316;
	}
	.system-prompt-apply:hover {
		background: rgba(249, 115, 22, 0.25);
	}

	/* ─── Input ──────────────────────────────────────────────────────────────── */
	.input-box {
		border: 1px solid var(--ai-input-border);
		background: var(--ai-input-bg);
	}
	.input-box:focus-within {
		border-color: var(--ai-input-focus-border);
		background: var(--ai-hover-bg);
	}
	.input-textarea {
		color: var(--ai-text);
	}
	.input-textarea::placeholder {
		color: var(--ai-text-faded);
	}
	.file-chip {
		background: var(--ai-file-chip-bg);
		border: 1px solid var(--ai-file-chip-border);
		color: var(--ai-text-dim);
	}
	.file-chip-name {
		color: var(--ai-text);
	}
	.file-chip-size {
		color: var(--ai-text-faded);
	}
	.file-chip-remove {
		color: var(--ai-text-faded);
	}
	.attach-btn {
		background: var(--ai-attach-bg);
		color: var(--ai-attach-color);
	}
	.attach-btn:hover:not(:disabled) {
		color: var(--ai-text-dim);
		background: var(--ai-hover-bg);
	}
	.send-btn {
		background: #f97316;
		color: white;
		box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3);
	}
	.stop-btn {
		background: rgba(239, 68, 68, 0.15);
		color: #f87171;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}
	.stop-btn:hover {
		background: rgba(239, 68, 68, 0.25);
		box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
	}
	.footer-hint {
		color: var(--ai-text-faded);
	}

	/* ─── Prose code ─────────────────────────────────────────────────────────── */
	:global(.ai-prose pre) {
		background: transparent !important;
		border: none !important;
		padding: 0 !important;
	}
	:global(.ai-prose code:not(pre code)) {
		background: var(--ai-hover-bg);
		border-radius: 4px;
		padding: 0.15em 0.4em;
		font-size: 0.85em;
	}

	/* ─── Scrollbar hidden ───────────────────────────────────────────────────── */
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
