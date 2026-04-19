<script lang="ts">
	import { aiStore } from '$lib/stores/aiStore.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { profileStore } from '$lib/stores/profileStore';
	import { fade, fly } from 'svelte/transition';
	import SafeMarkdown from '$lib/components/ui/SafeMarkdown.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { onMount, tick } from 'svelte';

	const currentWorkspace = $derived($workspaceStore.currentWorkspace);
	const profile = $derived($profileStore.profile);

	let messageInput = $state('');
	let scrollContainer = $state<HTMLElement | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let sidebarOpen = $state(true);
	let hoveredConvId = $state<string | null>(null);
	let attachedFiles = $state<File[]>([]);
	let isDragging = $state(false);

	async function scrollToBottom() {
		await tick();
		if (scrollContainer) {
			scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
		}
	}

	function autoResize() {
		if (!textareaEl) return;
		textareaEl.style.height = 'auto';
		textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
	}

	async function handleSend() {
		if ((!messageInput.trim() && attachedFiles.length === 0) || aiStore.isGenerating) return;

		let content = messageInput;

		// If files are attached, prepend a note about them
		if (attachedFiles.length > 0) {
			const fileNames = attachedFiles.map((f) => f.name).join(', ');
			const fileNote = `[Attached files: ${fileNames}]\n\n`;
			content = fileNote + content;
		}

		messageInput = '';
		attachedFiles = [];
		if (textareaEl) textareaEl.style.height = 'auto';
		await aiStore.sendMessage(content, currentWorkspace?.id);
		scrollToBottom();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function handleNewChat() {
		aiStore.newConversation();
	}

	function triggerFileInput() {
		fileInputEl?.click();
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			const newFiles = Array.from(input.files);
			attachedFiles = [...attachedFiles, ...newFiles];
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
			const newFiles = Array.from(e.dataTransfer.files);
			attachedFiles = [...attachedFiles, ...newFiles];
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
		if (file.type.includes('zip') || file.type.includes('tar') || file.type.includes('rar'))
			return '📦';
		if (
			file.type.includes('json') ||
			file.type.includes('javascript') ||
			file.type.includes('typescript')
		)
			return '⚙️';
		if (file.name.endsWith('.md') || file.name.endsWith('.txt')) return '📝';
		return '📎';
	}

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

	$effect(() => {
		if (aiStore.messages.length > 0 || aiStore.currentGeneration) scrollToBottom();
	});

	onMount(() => {
		scrollToBottom();
	});
</script>

<svelte:head>
	<title>NeuroAI · {currentWorkspace?.name || 'Workspace'}</title>
</svelte:head>

<!-- Hidden file input -->
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
	<!-- Drag-and-drop overlay -->
	{#if isDragging}
		<div
			class="drop-overlay fixed inset-0 z-50 flex flex-col items-center justify-center"
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

	<!-- ── Conversation Sidebar ── -->
	<aside
		class="ai-sidebar flex flex-col transition-all duration-300 ease-in-out {sidebarOpen
			? 'w-64'
			: 'w-0 overflow-hidden'}"
	>
		<div class="flex h-full flex-col p-3">
			<!-- New Chat Button -->
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

			<!-- Conversation List -->
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
								title="Delete"
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

			<!-- Workspace Label -->
			<div class="sidebar-border mt-auto border-t pt-3">
				<div class="flex items-center gap-2 rounded-lg px-2 py-1.5">
					<div
						class="flex h-6 w-6 items-center justify-center rounded bg-linear-to-br from-orange-500 to-blue-500 p-1 text-[8px] font-black text-white"
					>
						{currentWorkspace?.name?.[0] ?? 'N'}
					</div>
					<div class="flex-1 overflow-hidden">
						<p class="workspace-name truncate text-[11px] font-semibold">
							{currentWorkspace?.name ?? 'NeuroHub'}
						</p>
					</div>
				</div>
			</div>
		</div>
	</aside>

	<!-- ── Main Chat Area ── -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Topbar -->
		<header class="ai-topbar flex h-14 shrink-0 items-center justify-between px-6">
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
							Powered by a resilient stack of AI models. Ask anything — I have context about your
							workspace.
						</p>
						<p class="empty-hint mt-2 text-xs">
							💡 You can also drag & drop files or use the paperclip icon to attach them
						</p>

						<!-- Suggestion Pills -->
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
								<!-- User Message (right-aligned) -->
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
								<!-- AI Message (left-aligned) -->
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
									</div>
								</div>
							{/if}
						</div>
					{/each}

					<!-- Streaming Response -->
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

					<!-- Thinking indicator (no output yet) -->
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
								>Dismiss</button
							>
						</div>
					{/if}
				</div>
			</div>
		</main>

		<!-- Input Footer -->
		<footer class="shrink-0 px-4 pt-3 pb-6">
			<div class="mx-auto max-w-3xl">
				<!-- File Attachments Preview -->
				{#if attachedFiles.length > 0}
					<div class="mb-2 flex flex-wrap gap-2" in:fly={{ y: 8, duration: 200 }}>
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

				<div class="input-box group relative rounded-2xl transition-all">
					<textarea
						bind:this={textareaEl}
						bind:value={messageInput}
						onkeydown={handleKeydown}
						oninput={autoResize}
						placeholder="Message NeuroAI…"
						rows="1"
						class="scrollbar-none input-textarea w-full resize-none bg-transparent px-5 py-4 pr-24 text-sm outline-none"
					></textarea>

					<!-- Action buttons row inside the input box -->
					<div class="absolute right-3 bottom-3 flex items-center gap-1.5">
						<!-- Attach file button -->
						<button
							onclick={triggerFileInput}
							class="attach-btn flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-105"
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

						<!-- Send button -->
						<button
							onclick={handleSend}
							disabled={(!messageInput.trim() && attachedFiles.length === 0) ||
								aiStore.isGenerating}
							class="send-btn flex h-9 w-9 items-center justify-center rounded-xl shadow-lg transition-all hover:scale-105 hover:brightness-110 disabled:scale-100 disabled:opacity-25 disabled:grayscale"
						>
							{#if aiStore.isGenerating}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
								></div>
							{:else}
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2.5"
										d="M5 12h14M12 5l7 7-7 7"
									/>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<p class="footer-hint mt-2 text-center text-[10px]">
					Enter to send · Shift + Enter for newline · Drag & drop files to attach · AI may make
					mistakes
				</p>
			</div>
		</footer>
	</div>
</div>

<style>
	/* ─── Theme-aware variables ───────────────────────────────────────────────── */
	:root {
		--ai-bg: #f8f8f8;
		--ai-sidebar-bg: #f0f0f0;
		--ai-sidebar-border: #e4e4e7;
		--ai-topbar-border: #e4e4e7;
		--ai-text: #09090b;
		--ai-text-dim: #71717a;
		--ai-text-faded: #a1a1aa;
		--ai-hover-bg: rgba(0, 0, 0, 0.05);
		--ai-input-bg: rgba(0, 0, 0, 0.04);
		--ai-input-border: #e4e4e7;
		--ai-input-focus-border: rgba(249, 115, 22, 0.5);
		--ai-user-bubble: rgba(249, 115, 22, 0.12);
		--ai-user-bubble-border: rgba(249, 115, 22, 0.25);
		--ai-user-bubble-text: #1c1917;
		--ai-badge-bg: rgba(0, 0, 0, 0.06);
		--ai-suggestion-bg: rgba(0, 0, 0, 0.03);
		--ai-suggestion-border: #e4e4e7;
		--ai-file-chip-bg: rgba(0, 0, 0, 0.06);
		--ai-file-chip-border: #e4e4e7;
		--ai-prose-color: #18181b;
		--ai-code-bg: #f4f4f5;
		--ai-code-border: #e4e4e7;
		--ai-thinking-dot: rgba(0, 0, 0, 0.2);
		--ai-attach-bg: rgba(0, 0, 0, 0.06);
		--ai-attach-color: #71717a;
	}

	:global(.dark) .ai-chat-root,
	:global(.dark) .ai-chat-root * {
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
		--ai-prose-color: rgba(255, 255, 255, 0.8);
		--ai-code-bg: #161616;
		--ai-code-border: rgba(255, 255, 255, 0.06);
		--ai-thinking-dot: rgba(255, 255, 255, 0.2);
		--ai-attach-bg: rgba(255, 255, 255, 0.07);
		--ai-attach-color: rgba(255, 255, 255, 0.4);
	}

	/* ─── Layout ─────────────────────────────────────────────────────────────── */
	.ai-chat-root {
		background: var(--ai-bg);
		color: var(--ai-text);
	}

	/* ─── Drag overlay ────────────────────────────────────────────────────────── */
	.drop-overlay {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
	}
	.drop-overlay-inner {
		background: var(--ai-input-bg);
		border: 2px dashed rgba(249, 115, 22, 0.6);
	}

	/* ─── Sidebar ─────────────────────────────────────────────────────────────── */
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

	/* ─── Topbar ──────────────────────────────────────────────────────────────── */
	.ai-topbar {
		border-bottom: 1px solid var(--ai-topbar-border);
	}
	.topbar-icon-btn {
		color: var(--ai-text-faded);
	}
	.topbar-icon-btn:hover {
		background: var(--ai-hover-bg);
		color: var(--ai-text-dim);
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

	/* ─── Empty state ─────────────────────────────────────────────────────────── */
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

	/* ─── Suggestion cards ────────────────────────────────────────────────────── */
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

	/* ─── User bubble ─────────────────────────────────────────────────────────── */
	.user-bubble {
		background: var(--ai-user-bubble);
		border: 1px solid var(--ai-user-bubble-border);
	}
	.user-bubble-text {
		color: var(--ai-user-bubble-text);
	}

	/* ─── AI message ──────────────────────────────────────────────────────────── */
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

	/* ─── Input box ───────────────────────────────────────────────────────────── */
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

	/* ─── File chips ──────────────────────────────────────────────────────────── */
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

	/* ─── Attach button ───────────────────────────────────────────────────────── */
	.attach-btn {
		background: var(--ai-attach-bg);
		color: var(--ai-attach-color);
	}
	.attach-btn:hover {
		color: var(--ai-text-dim);
		background: var(--ai-hover-bg);
	}

	/* ─── Send button ─────────────────────────────────────────────────────────── */
	.send-btn {
		background: #f97316;
		color: white;
		box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3);
	}

	/* ─── Footer hint ─────────────────────────────────────────────────────────── */
	.footer-hint {
		color: var(--ai-text-faded);
	}

	/* ─── Prose code styling ──────────────────────────────────────────────────── */
	:global(.ai-prose pre) {
		background: var(--ai-code-bg) !important;
		border: 1px solid var(--ai-code-border);
		border-radius: 10px;
	}
	:global(.ai-prose code:not(pre code)) {
		background: var(--ai-hover-bg);
		border-radius: 4px;
		padding: 0.15em 0.4em;
		font-size: 0.85em;
	}

	/* ─── Scrollbar ───────────────────────────────────────────────────────────── */
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
