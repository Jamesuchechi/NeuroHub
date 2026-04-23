<script lang="ts">
	import {
		aiStore,
		type AIModel,
		type AIMessage,
		type AIConversation
	} from '$lib/stores/aiStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { profileStore } from '$lib/stores/profileStore';
	import { notesStore } from '$lib/stores/notesStore.svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import SafeMarkdown from '$lib/components/ui/SafeMarkdown.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import MentionAutocomplete from '$lib/components/ai/MentionAutocomplete.svelte';
	import type { MentionItem } from '$lib/components/ai/types';
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { useActivityStatus } from '$lib/stores/userActivity.svelte';

	const currentWorkspace = $derived($workspaceStore.currentWorkspace);
	const profile = $derived($profileStore.profile);

	// --- Activity Tracking ---
	$effect(() => {
		useActivityStatus('🤖 Chatting with NeuroAI');
	});

	// ── Core State ────────────────────────────────────────────────────────────────
	let messageInput = $state('');
	let scrollContainer = $state<HTMLElement | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let sidebarOpen = $state(true);
	let hoveredConvId = $state<string | null>(null);
	let attachedFiles = $state<File[]>([]);
	let isDragging = $state(false);
	let isMobile = $state(false);

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

	const userMessages = $derived(aiStore.messages.filter((m: AIMessage) => m.role === 'user'));

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
		const conv = aiStore.conversations.find(
			(c: AIConversation) => c.id === aiStore.activeConversationId
		);
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
		if (isMobile) sidebarOpen = false;
	}

	// ── Switch Conversation ──────────────────────────────────────────────────────
	function switchConversation(id: string) {
		aiStore.switchConversation(id);
		if (isMobile) sidebarOpen = false;
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
		aiStore.messages.findLast((m: AIMessage) => m.role === 'assistant')?.timestamp ?? -1
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

	// ── Mobile Sidebar Logic ─────────────────────────────────────────────────────
	const showSidebar = $derived(!isMobile || sidebarOpen);
	const showChat = $derived(!isMobile || !sidebarOpen);

	// ── Lifecycle ─────────────────────────────────────────────────────────────────
	$effect(() => {
		if (aiStore.messages.length > 0 || aiStore.currentGeneration) scrollToBottom();
	});

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
			if (isMobile && aiStore.activeConversationId) {
				sidebarOpen = false;
			}
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);

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

		return () => window.removeEventListener('resize', checkMobile);
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
	class="ai-chat-root flex h-full overflow-hidden {isMobile ? 'pb-20' : ''}"
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
	{#if showSidebar}
		<aside
			class="ai-sidebar flex flex-col transition-all duration-300 ease-in-out {sidebarOpen
				? isMobile
					? 'w-full'
					: 'w-64'
				: 'w-0 overflow-hidden'}"
			in:fade={{ duration: 200 }}
		>
			<div class="flex h-full flex-col p-3">
				<div class="mb-4 flex items-center justify-between px-1">
					<button
						onclick={handleNewChat}
						class="new-chat-btn flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:scale-[1.01]"
					>
						<svg
							class="h-4 w-4 text-orange-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						New Chat
					</button>
					{#if isMobile && sidebarOpen && aiStore.activeConversationId}
						<button
							onclick={() => (sidebarOpen = false)}
							class="ml-2 rounded-xl bg-surface-dim p-3 text-content-dim"
							aria-label="Close sidebar"
							title="Close sidebar"
						>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					{/if}
				</div>

				<p class="sidebar-label mb-2 px-2 text-[10px] font-bold tracking-widest uppercase">
					Recent
				</p>

				<ul class="scrollbar-none flex-1 space-y-0.5 overflow-y-auto">
					{#if aiStore.conversations.length === 0}
						<p class="sidebar-empty px-3 py-4 text-center text-[11px] italic">
							No conversations yet
						</p>
					{/if}
					{#each aiStore.conversations as conv (conv.id)}
						<li
							class="group relative"
							onmouseenter={() => (hoveredConvId = conv.id)}
							onmouseleave={() => (hoveredConvId = null)}
						>
							<button
								onclick={() => switchConversation(conv.id)}
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
							{#if hoveredConvId === conv.id || isMobile}
								<button
									onclick={() => aiStore.deleteConversation(conv.id)}
									class="conv-delete absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 transition-all hover:bg-red-500/20 hover:text-red-400"
									title="Delete conversation"
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
	{/if}

	<!-- ── Main ── -->
	{#if showChat}
		<div class="flex flex-1 flex-col overflow-hidden" in:fade={{ duration: 200 }}>
			<!-- Topbar -->
			<header
				class="ai-topbar flex h-auto shrink-0 flex-col items-center justify-between gap-2 p-2 md:h-14 md:flex-row md:px-4"
			>
				<div class="flex w-full items-center justify-between gap-3 md:w-auto">
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
								class="topbar-badge rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase md:text-[10px]"
								>Multi-Model</span
							>
						</div>
					</div>

					{#if isMobile}
						<!-- Status on mobile topbar -->
						<div class="flex items-center gap-1.5">
							<div
								class="h-1.5 w-1.5 rounded-full {aiStore.isGenerating
									? 'animate-pulse bg-orange-400'
									: 'bg-emerald-400'}"
							></div>
							<span class="status-text text-[10px] font-medium"
								>{aiStore.isGenerating ? 'Gen…' : 'Ready'}</span
							>
						</div>
					{/if}
				</div>

				<div class="flex w-full items-center justify-between gap-2 md:w-auto md:justify-end">
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
								<span class="hidden text-[10px] font-bold uppercase md:block">{opt.label}</span>
							</button>
						{/each}
					</div>

					<div class="flex items-center gap-1">
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

						{#if !isMobile}
							<div class="ml-2 flex items-center gap-1.5">
								<div
									class="h-1.5 w-1.5 rounded-full {aiStore.isGenerating
										? 'animate-pulse bg-orange-400'
										: 'bg-emerald-400'}"
								></div>
								<span class="status-text text-[11px] font-medium"
									>{aiStore.isGenerating ? 'Generating…' : 'Ready'}</span
								>
							</div>
						{/if}
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
							class="flex flex-col items-center pt-8 text-center md:pt-16"
						>
							<div class="relative mb-6 md:mb-8">
								<div class="absolute inset-0 rounded-full bg-orange-500/10 blur-3xl"></div>
								<div
									class="empty-icon-bg relative flex h-16 w-16 items-center justify-center rounded-2xl md:h-20 md:w-20"
								>
									<svg
										class="h-8 w-8 text-orange-400 md:h-10 md:w-10"
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
							<h1 class="empty-title px-4 text-xl font-black md:text-2xl">
								What can I help you build?
							</h1>
							<p class="empty-subtitle mt-3 max-w-sm px-6 text-[12px] leading-relaxed md:text-sm">
								Powered by a resilient AI model stack with full workspace awareness. Ask anything.
							</p>
							<p class="empty-hint mt-2 text-[10px] md:text-xs">
								💡 Type <kbd class="hint-kbd">@</kbd> to reference a note
							</p>
							<div class="mt-8 grid w-full grid-cols-1 gap-3 px-4 md:mt-10 md:grid-cols-2">
								{#each suggestions as sug (sug.title)}
									<button
										onclick={() => {
											messageInput = sug.prompt;
											handleSend();
										}}
										class="suggestion-card group flex items-start gap-3 rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
									>
										<span class="mt-0.5 shrink-0 text-lg md:text-xl">{sug.icon}</span>
										<div>
											<p
												class="suggestion-title text-xs font-semibold transition-colors group-hover:text-orange-500 md:text-sm"
											>
												{sug.title}
											</p>
											<p class="suggestion-desc mt-1 line-clamp-1 text-[10px] md:text-[11px]">
												{sug.prompt}
											</p>
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
									<div class="flex items-start justify-end gap-2 md:gap-3">
										<div
											class="user-bubble max-w-[90%] rounded-2xl rounded-tr-sm px-4 py-2.5 md:max-w-[85%] md:px-5 md:py-3.5"
										>
											<p
												class="user-bubble-text text-[13px] leading-relaxed whitespace-pre-wrap md:text-sm"
											>
												{msg.content}
											</p>
										</div>
										<div class="mt-1 shrink-0">
											<Avatar
												name={profile?.username || 'You'}
												size="xs"
												src={profile?.avatar_url}
											/>
										</div>
									</div>
								{:else}
									<!-- AI response -->
									<div class="flex items-start gap-2 md:gap-3">
										<div
											class="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-blue-500 shadow-lg shadow-orange-500/20 md:h-8 md:w-8 md:rounded-xl"
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
										<div class="min-w-0 flex-1">
											<p
												class="ai-label mb-1.5 text-[9px] font-bold tracking-widest uppercase md:mb-2 md:text-[10px]"
											>
												NeuroAI
											</p>
											<div class="ai-prose prose prose-sm max-w-none text-[13px] md:text-sm">
												<SafeMarkdown content={msg.content} />
											</div>

											<!-- ── Inline Source Citations ── -->
											{#if msg.references && msg.references.length > 0}
												<details class="citations-disclosure mt-3" in:fade>
													<summary
														class="citations-summary cursor-pointer text-[10px] select-none md:text-[11px]"
													>
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
														{msg.references.length} source{msg.references.length > 1 ? 's' : ''}
													</summary>
													<ul class="citations-list mt-2 space-y-1 pl-2">
														{#each msg.references as ref (ref.id)}
															<li>
																<a
																	href={resolve(
																		`/workspace/${currentWorkspace?.slug}/notes/${ref.id}` as unknown as '/'
																	)}
																	class="citation-link text-[10px] md:text-[11px]"
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
												<button
													onclick={() => saveMessage(msg.content)}
													disabled={aiStore.isSavingNote}
													class="save-note-btn flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all md:px-3 md:text-[11px]"
													title="Save as note"
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
															d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
														/>
													</svg>
													{aiStore.isSavingNote ? 'Saving…' : 'Save'}
												</button>

												{#if msg.timestamp === lastAssistantTimestamp && !aiStore.isGenerating}
													<button
														onclick={() => aiStore.regenerate(currentWorkspace?.id)}
														class="regen-btn flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all md:px-3 md:text-[11px]"
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
														Retry
													</button>
												{/if}

												<div class="ml-auto flex items-center gap-1">
													<button
														onclick={() => rateMessage(msg.timestamp, 1)}
														class="rounded-md p-1.5 text-content-dim transition-colors hover:bg-surface-dim"
														title="Helpful"
														aria-label="Thumbs up"
													>
														<svg
															class="h-3.5 w-3.5"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M14 10h4.708C19.712 10 20.5 10.788 20.5 11.792c0 .408-.137.795-.392 1.108l-3.328 4.093c-.456.56-1.12.807-1.78.807h-4.5c-.276 0-.5-.224-.5-.5v-7.391c0-.265.105-.52.293-.707l3.707-3.707c.188-.188.442-.293.707-.293.552 0 1 .448 1 1v4z"
															/>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M9 10H5c-1.105 0-2 .895-2 2v5c0 1.105.895 2 2 2h4V10z"
															/>
														</svg>
													</button>
													<button
														onclick={() => rateMessage(msg.timestamp, -1)}
														class="rounded-md p-1.5 text-content-dim transition-colors hover:bg-surface-dim"
														title="Not helpful"
														aria-label="Thumbs down"
													>
														<svg
															class="h-3.5 w-3.5"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M10 14H5.292C4.288 14 3.5 13.212 3.5 12.208c0-.408.137-.795.392-1.108l3.328-4.093c.456-.56 1.12-.807 1.78-.807h4.5c.276 0 .5.224.5.5v7.391c0 .265-.105.52-.293.707L10.293 18.5c-.188.188-.442.293-.707.293-.552 0-1-.448-1-1v-4z"
															/>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M15 14h4c1.105 0 2-.895 2-2V7c0-1.105-.895-2-2-2h-4v9z"
															/>
														</svg>
													</button>
												</div>
											</div>
										</div>
									</div>
								{/if}
							</div>
						{/each}

						{#if aiStore.isThinking}
							<div in:fade={{ duration: 200 }} class="flex items-start gap-3">
								<div
									class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-stroke bg-surface-dim shadow-sm"
								>
									<div class="flex gap-1">
										<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500"></span>
										<span
											class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500 [animation-delay:0.2s]"
										></span>
										<span
											class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500 [animation-delay:0.4s]"
										></span>
									</div>
								</div>
								<div class="flex-1">
									<p class="ai-label mb-2 text-[10px] font-bold tracking-widest uppercase">
										NeuroAI
									</p>
									<p class="animate-pulse text-xs text-content-dim italic">
										{aiStore.thinkingStep || 'NeuroAI is thinking...'}
									</p>
								</div>
							</div>
						{/if}

						{#if aiStore.currentGeneration}
							<div in:fade class="flex items-start gap-3">
								<div
									class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-blue-500 shadow-lg shadow-orange-500/20"
								>
									<div
										class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
									></div>
								</div>
								<div class="flex-1">
									<p class="ai-label mb-2 text-[10px] font-bold tracking-widest uppercase">
										NeuroAI
									</p>
									<div class="ai-prose prose prose-sm max-w-none text-[13px] md:text-sm">
										<SafeMarkdown content={aiStore.currentGeneration} />
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</main>

			<!-- ── Input Area ── -->
			<footer class="ai-footer px-2 pt-2 pb-4 md:px-4 md:pb-6">
				<div class="mx-auto max-w-3xl">
					<!-- Attached Files Bar -->
					{#if attachedFiles.length > 0}
						<div class="mb-3 flex flex-wrap gap-2" in:slide>
							{#each attachedFiles as file, i (file.name + i)}
								<div
									class="file-chip flex items-center gap-2 rounded-lg border border-stroke bg-surface px-2 py-1.5 shadow-sm"
								>
									<span class="text-sm">{getFileIcon(file)}</span>
									<div class="flex flex-col">
										<span class="max-w-[100px] truncate text-[10px] font-bold text-content"
											>{file.name}</span
										>
										<span class="text-[8px] text-content-dim">{formatFileSize(file.size)}</span>
									</div>
									<button
										onclick={() => removeFile(i)}
										class="ml-1 text-content-dim hover:text-red-400"
										aria-label="Remove file"
										title="Remove file"
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

					<div
						class="input-container relative flex flex-col rounded-2xl border border-stroke bg-surface shadow-2xl transition-all focus-within:border-orange-500/50"
					>
						<!-- Mention Autocomplete -->
						{#if mentionQuery !== null && mentionResults.length > 0}
							<div class="absolute bottom-full left-0 mb-2 w-full">
								<MentionAutocomplete
									results={mentionResults}
									activeIndex={mentionActiveIndex}
									visible={mentionQuery !== null}
									onSelect={handleMentionSelect}
								/>
							</div>
						{/if}

						<textarea
							bind:this={textareaEl}
							bind:value={messageInput}
							oninput={handleInput}
							onkeydown={handleKeydown}
							placeholder="Ask anything... (Use @ to reference a note)"
							class="scrollbar-none w-full resize-none rounded-t-2xl bg-transparent p-4 text-[13px] text-content outline-none placeholder:text-content-dim/50 md:text-sm"
							rows="1"
						></textarea>

						<div class="flex items-center justify-between px-3 pb-3">
							<div class="flex items-center gap-1">
								<button
									onclick={triggerFileInput}
									class="input-action-btn flex h-8 w-8 items-center justify-center rounded-lg text-content-dim transition-colors hover:bg-surface-dim hover:text-content"
									title="Attach files"
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
								<button
									class="input-action-btn flex h-8 w-8 items-center justify-center rounded-lg text-content-dim transition-colors hover:bg-surface-dim hover:text-content"
									title="AI Tools"
								>
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM18 8a2 2 0 114 0v1a2 2 0 11-4 0V8zM1 13a2 2 0 114 0v1a2 2 0 11-4 0v-1zM11 13a2 2 0 114 0v1a2 2 0 11-4 0v-1zM18 13a2 2 0 114 0v1a2 2 0 11-4 0v-1z"
										/>
									</svg>
								</button>
							</div>

							<div class="flex items-center gap-2">
								<span class="hidden text-[9px] font-bold text-content-dim/30 md:block"
									>SHIFT + ENTER for new line</span
								>
								<button
									onclick={handleSend}
									disabled={(!messageInput.trim() && attachedFiles.length === 0) ||
										aiStore.isGenerating}
									class="send-btn flex h-9 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-30"
								>
									<span>{aiStore.isGenerating ? '...' : 'Send'}</span>
									<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13 5l7 7-7 7M5 5l7 7-7 7"
										/>
									</svg>
								</button>
							</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	{/if}

	<!-- ── System Prompt Panel (Modal on mobile) ── -->
	{#if showSystemPromptPanel}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
			transition:fade
		>
			<div
				class="w-full max-w-lg rounded-3xl border border-stroke bg-surface p-6 shadow-2xl"
				in:fly={{ y: 20 }}
			>
				<div class="mb-6 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500"
						>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
						<div>
							<h3 class="text-lg font-bold text-content">Custom Persona</h3>
							<p class="text-[11px] font-bold tracking-wider text-content-dim uppercase">
								Configure AI behavior for this chat
							</p>
						</div>
					</div>
					<button
						onclick={() => (showSystemPromptPanel = false)}
						class="text-content-dim hover:text-content"
						aria-label="Close settings"
						title="Close settings"
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<textarea
					bind:value={systemPromptDraft}
					placeholder="Example: You are a senior security engineer. Focus on RLS policies and data safety..."
					class="mb-6 h-40 w-full resize-none rounded-2xl border border-stroke bg-surface-dim/30 p-4 text-sm outline-none focus:border-blue-500/50"
				></textarea>

				<div class="flex items-center justify-end gap-3">
					<button
						onclick={clearSystemPrompt}
						class="px-4 py-2 text-sm font-bold text-content-dim hover:text-content">Reset</button
					>
					<button
						onclick={applySystemPrompt}
						class="flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600"
					>
						{systemPromptSaved ? 'Saved!' : 'Apply Persona'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Sidebar Styles */
	.ai-sidebar {
		background-color: var(--surface-dim);
		border-right: 1px solid var(--stroke);
	}
	.new-chat-btn {
		background-color: var(--surface);
		color: var(--content);
		border: 1px solid var(--stroke);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}
	.conv-item {
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.conv-active {
		background-color: rgba(249, 115, 22, 0.1);
		color: #f97316;
		font-weight: 600;
	}
	.conv-inactive {
		color: var(--content-dim);
	}
	.conv-inactive:hover {
		background-color: var(--surface);
		color: var(--content);
	}
	.conv-date {
		color: var(--content-dim);
		opacity: 0.6;
	}

	/* Topbar Styles */
	.ai-topbar {
		background-color: rgba(var(--surface-rgb), 0.8);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--stroke);
	}
	.topbar-badge {
		background-color: rgba(var(--brand-orange-rgb), 0.1);
		color: var(--brand-orange);
		border: 1px solid rgba(var(--brand-orange-rgb), 0.2);
	}
	.model-selector {
		background-color: var(--surface-dim);
		border: 1px solid var(--stroke);
	}
	.model-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.75rem;
		border-radius: 0.75rem;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: all 0.2s ease;
	}
	.model-btn-active {
		background-color: var(--surface);
		color: var(--brand-orange);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	.model-btn-inactive {
		color: var(--content-dim);
	}
	.model-btn-inactive:hover {
		color: var(--content);
	}

	/* Message Styles */
	.user-bubble {
		background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
		color: white;
		box-shadow: 0 4px 15px rgba(249, 115, 22, 0.2);
	}
	.ai-label {
		color: var(--brand-orange);
	}
	.ai-prose {
		color: var(--content);
	}
	:global(.ai-prose p) {
		line-height: 1.6;
		margin-bottom: 1rem;
	}
	:global(.ai-prose code) {
		background-color: var(--surface-dim);
		padding: 0.2rem 0.4rem;
		border-radius: 0.4rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	/* Input Styles */
	.input-container {
		background-color: var(--surface);
		transition: all 0.3s ease;
	}
	.input-container:focus-within {
		box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
	}

	/* Citation Styles */
	.citations-disclosure {
		background-color: var(--surface-dim);
		border: 1px solid var(--stroke);
		border-radius: 0.75rem;
		padding: 0.5rem 0.75rem;
	}
	.citations-summary {
		font-weight: 600;
		color: var(--content-dim);
	}
	.citation-link {
		color: var(--brand-orange);
		text-decoration: none;
		font-weight: 500;
	}
	.citation-link:hover {
		text-decoration: underline;
	}

	/* Utils */
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	@media (max-width: 768px) {
		.ai-topbar {
			padding-top: env(safe-area-inset-top);
		}
	}
</style>
