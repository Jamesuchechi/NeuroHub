<script lang="ts">
	import { openCreateSnippet } from '$lib/stores/devToolsStore';
	import SnippetEditor from './SnippetEditor.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import LivePreview from './LivePreview.svelte';
	import SplitPane from '../ui/SplitPane.svelte';
	import { sandboxPanelWidth } from '$lib/stores/devToolsStore';
	import type { SandboxResult, Language } from '$lib/types/devtools';
	import { onDestroy, onMount } from 'svelte';
	import { aiService } from '$lib/services/ai';
	import SandboxWorker from '$lib/workers/sandbox.worker?worker';
	import { slide, fade } from 'svelte/transition';

	let { workspaceId: _workspaceId } = $props<{ workspaceId: string }>();

	// View Settings
	let viewMode = $state<'logic' | 'visual'>('logic');
	let webTabsView = $state<'combined' | 'separate'>('combined');
	let activeWebTab = $state<'html' | 'css' | 'js'>('html');
	let mobilePanel = $state<'editor' | 'output'>('editor');
	let isMobile = $state(false);

	// Multi-file state for 'separate' mode
	let webFiles = $state({
		html: '<div class="flex flex-col items-center justify-center min-h-[200px] bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-2xl shadow-2xl text-white">\n  <h1 class="text-3xl font-black mb-2 italic">NeuroHub Sandbox</h1>\n  <p class="text-white/80 text-sm mb-6">Build something elite with Tailwind CSS.</p>\n  <button id="btn" class="bg-white text-orange-600 px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform shadow-lg">\n    Click Me\n  </button>\n</div>',
		css: 'body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #09090b; }',
		js: 'document.getElementById("btn").onclick = () => alert("Logic meets Visual!");'
	});

	let code = $state(
		`// Try it out!\nconst nums = [1, 2, 3, 4, 5];\nconst doubled = nums.map(n => n * 2);\nconsole.log('Doubled:', doubled);\nconsole.log('Sum:', doubled.reduce((a, b) => a + b, 0));`
	);

	let language = $state<Language>('javascript');
	let isInitializingPython = $state(false);
	let isAiSimulating = $state(false);

	let result = $state<SandboxResult>({
		stdout: [],
		stderr: [],
		error: null,
		duration_ms: 0,
		memory_usage_bytes: null
	});

	let isRunning = $state(false);
	let worker: Worker | null = null;

	// Automatically switch to 'visual' if language is HTML
	$effect(() => {
		if (language === 'html' || language === 'css') {
			viewMode = 'visual';
		}
	});

	// Derive combined code for the preview
	let combinedCode = $derived.by(() => {
		if (webTabsView === 'combined') return code;
		return (
			`${webFiles.html}\n<style>\n${webFiles.css}\n</style>\n<script>\n${webFiles.js}\n</scr` +
			'ipt>'
		);
	});

	let outputLines = $derived.by(() => {
		const lines: { id: number; type: 'out' | 'err'; content: string; timestamp: string }[] = [];
		const now = new Date();
		const timeStr = now.toLocaleTimeString([], {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

		result.stdout.forEach((content, i) => {
			lines.push({ id: i, type: 'out', content, timestamp: timeStr });
		});
		result.stderr.forEach((content, i) => {
			lines.push({ id: 1000 + i, type: 'err', content, timestamp: timeStr });
		});
		if (result.error) {
			lines.push({ id: 9999, type: 'err', content: result.error, timestamp: timeStr });
		}
		return lines;
	});

	function handleExportAsSnippet() {
		openCreateSnippet({
			code: viewMode === 'visual' ? combinedCode : code,
			language: viewMode === 'visual' ? 'html' : language,
			title: 'Sandbox Snippet'
		});
	}

	async function runCode() {
		if (viewMode === 'visual') return;

		if (worker) worker.terminate();
		result = { stdout: [], stderr: [], error: null, duration_ms: 0, memory_usage_bytes: null };
		isRunning = true;
		if (isMobile) mobilePanel = 'output'; // Switch to output on mobile when running

		const start = performance.now();

		if (language === 'javascript' || language === 'python') {
			if (language === 'python') isInitializingPython = true;
			worker = new SandboxWorker();
			const timeoutDuration = language === 'python' ? 30000 : 10000;
			const timeout = setTimeout(() => {
				if (worker) worker.terminate();
				isRunning = false;
				isInitializingPython = false;
				result = { ...result, error: `Timeout exceeded.`, duration_ms: timeoutDuration };
			}, timeoutDuration);

			worker.onmessage = (e: MessageEvent<SandboxResult>) => {
				clearTimeout(timeout);
				isInitializingPython = false;
				result = { ...e.data, duration_ms: Math.round(performance.now() - start) };
				isRunning = false;
			};
			worker.postMessage({ code, language });
		} else {
			isAiSimulating = true;
			try {
				const aiResult = await aiService.simulateExecution(code, language);
				result = {
					stdout: [aiResult.stdout],
					stderr: aiResult.stderr ? [aiResult.stderr] : [],
					error: aiResult.error,
					duration_ms: Math.round(performance.now() - start),
					memory_usage_bytes: null
				};
			} catch (err) {
				result.error = err instanceof Error ? err.message : 'AI simulation failed';
			} finally {
				isRunning = false;
				isAiSimulating = false;
			}
		}
	}

	function handleLanguageChange(newLang: Language) {
		if (
			code.trim() === '' ||
			code.startsWith('// Try it out!') ||
			code.includes('NeuroHub Sandbox')
		) {
			if (newLang === 'python') {
				code = `# Python Mode\nnums = [1, 2, 3, 4, 5]\ndoubled = [n * 2 for n in nums]\nprint(f"Doubled: {doubled}")\nprint(f"Sum: {sum(doubled)}")`;
			} else if (newLang === 'html') {
				code = webFiles.html;
				viewMode = 'visual';
			} else if (newLang === 'javascript') {
				code = `// Try it out!\nconst nums = [1, 2, 3, 4, 5];\nconst doubled = nums.map(n => n * 2);\nconsole.log('Doubled:', doubled);\nconsole.log('Sum:', doubled.reduce((a, b) => a + b, 0));`;
				viewMode = 'logic';
			}
		}
	}

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	onDestroy(() => {
		if (worker) worker.terminate();
	});
</script>

<div class="flex h-full flex-col overflow-hidden bg-surface">
	<!-- Top: Main Header -->
	<div
		class="flex h-auto shrink-0 flex-col items-center justify-between gap-2 border-b border-stroke bg-surface-dim/30 p-2 md:h-12 md:flex-row md:px-4"
	>
		<div class="flex w-full items-center justify-between gap-4 md:w-auto md:justify-start md:gap-6">
			<!-- Mode Switcher -->
			<div class="flex rounded-lg border border-stroke bg-surface p-0.5">
				<button
					class="rounded-md px-3 py-1 text-[9px] font-bold tracking-widest uppercase transition-all md:px-4 md:text-[10px]
						{viewMode === 'logic'
						? 'bg-orange-500 text-white shadow-sm'
						: 'text-content-dim hover:text-content'}"
					onclick={() => (viewMode = 'logic')}
				>
					Logic
				</button>
				<button
					class="rounded-md px-3 py-1 text-[9px] font-bold tracking-widest uppercase transition-all md:px-4 md:text-[10px]
						{viewMode === 'visual'
						? 'bg-orange-500 text-white shadow-sm'
						: 'text-content-dim hover:text-content'}"
					onclick={() => (viewMode = 'visual')}
				>
					Visual
				</button>
			</div>

			<div class="flex items-center gap-2">
				<LanguageSelector bind:value={language} onchange={handleLanguageChange} />

				{#if viewMode === 'visual'}
					<div class="ml-2 flex rounded-lg border border-stroke bg-surface p-0.5 shadow-sm">
						<button
							class="rounded-md px-2.5 py-1 text-[9px] font-bold uppercase transition-all
								{webTabsView === 'combined'
								? 'bg-orange-500 text-white shadow-sm'
								: 'text-content-dim hover:text-content'}"
							onclick={() => (webTabsView = 'combined')}
							title="Single combined file (HTML + Style + Script)"
						>
							Single
						</button>
						<button
							class="rounded-md px-2.5 py-1 text-[9px] font-bold uppercase transition-all
								{webTabsView === 'separate'
								? 'bg-orange-500 text-white shadow-sm'
								: 'text-content-dim hover:text-content'}"
							onclick={() => (webTabsView = 'separate')}
							title="Separate HTML, CSS, JS tabs"
						>
							Tabs
						</button>
					</div>
				{/if}

				{#if isInitializingPython}
					<span
						class="animate-pulse rounded border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold tracking-tighter text-orange-500 uppercase"
					>
						Loading WASM...
					</span>
				{:else if isAiSimulating}
					<span
						class="animate-pulse rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] font-bold tracking-tighter text-blue-500 uppercase"
					>
						AI Simulating...
					</span>
				{/if}
			</div>
		</div>

		<div class="flex w-full items-center justify-end gap-2 md:w-auto md:gap-3">
			{#if isMobile}
				<div class="mr-auto flex rounded-lg border border-stroke bg-surface p-0.5">
					<button
						class="rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all
							{mobilePanel === 'editor' ? 'bg-surface-dim text-content' : 'text-content-dim'}"
						onclick={() => (mobilePanel = 'editor')}
					>
						Code
					</button>
					<button
						class="rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all
							{mobilePanel === 'output' ? 'bg-surface-dim text-content' : 'text-content-dim'}"
						onclick={() => (mobilePanel = 'output')}
					>
						Output
					</button>
				</div>
			{/if}

			<button
				class="rounded-md border border-stroke bg-surface-dim px-2 py-1.5 text-[10px] font-bold text-content transition-colors hover:bg-surface md:px-3 md:text-xs"
				onclick={handleExportAsSnippet}
			>
				Export
			</button>
			{#if viewMode === 'logic'}
				<button
					class="rounded-md bg-orange-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:opacity-50 md:px-4 md:text-xs"
					onclick={runCode}
					disabled={isRunning}
				>
					{isRunning ? '...' : 'Run'}
				</button>
			{/if}
		</div>
	</div>

	<!-- Main content Split -->
	<div class="flex flex-1 overflow-hidden border-t border-stroke">
		{#if isMobile}
			<div class="h-full w-full overflow-hidden">
				{#if mobilePanel === 'editor'}
					<div class="relative flex h-full flex-col border-r border-stroke bg-surface" in:fade>
						{#if viewMode === 'visual' && webTabsView === 'separate'}
							<div
								class="flex h-8 shrink-0 gap-1 overflow-x-auto border-b border-stroke bg-surface-dim/10 px-2"
							>
								{#each ['html', 'css', 'js'] as tab (tab)}
									<button
										class="px-4 text-[9px] font-bold uppercase {activeWebTab === tab
											? 'border-b-2 border-brand-orange text-brand-orange'
											: 'text-content-dim'}"
										onclick={() => (activeWebTab = tab as typeof activeWebTab)}
									>
										{tab}
									</button>
								{/each}
							</div>
							<div class="flex-1 overflow-hidden">
								{#if activeWebTab === 'html'}
									<SnippetEditor
										bind:code={webFiles.html}
										language="html"
										class="h-full min-h-full rounded-none border-none"
									/>
								{:else if activeWebTab === 'css'}
									<SnippetEditor
										bind:code={webFiles.css}
										language="css"
										class="h-full min-h-full rounded-none border-none"
									/>
								{:else if activeWebTab === 'js'}
									<SnippetEditor
										bind:code={webFiles.js}
										language="javascript"
										class="h-full min-h-full rounded-none border-none"
									/>
								{/if}
							</div>
						{:else}
							<SnippetEditor
								bind:code
								{language}
								class="h-full min-h-full rounded-none border-none"
							/>
						{/if}
					</div>
				{:else}
					<div class="flex h-full flex-col overflow-hidden bg-surface-dim/20" in:fade>
						{#if viewMode === 'logic'}
							<div
								class="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-4 font-mono text-[11px]"
							>
								{#each outputLines as line (line.id)}
									<div class="flex gap-2 border-b border-stroke/30 pb-1 last:border-0" in:slide>
										<span class="w-8 shrink-0 text-right text-[9px] text-content-dim/30"
											>{line.timestamp}</span
										>
										<span
											class="flex-1 break-all whitespace-pre-wrap {line.type === 'err'
												? 'font-bold text-red-500'
												: 'text-content'}">{line.content}</span
										>
									</div>
								{:else}
									<div
										class="flex h-full flex-col items-center justify-center text-center opacity-30"
									>
										<p class="text-[10px]">Console is ready.</p>
									</div>
								{/each}
							</div>
						{:else}
							<div class="flex-1 bg-surface-dim/10 p-2">
								<LivePreview
									code={combinedCode}
									language={webTabsView === 'combined' ? language : 'html'}
								/>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			<SplitPane
				type="horizontal"
				initialSize={$sandboxPanelWidth}
				minSize={25}
				maxSize={70}
				sizeUnit="%"
				fixedSide="right"
				onResize={(size) => ($sandboxPanelWidth = size)}
			>
				{#snippet left()}
					<div class="relative flex h-full flex-col border-r border-stroke bg-surface">
						{#if viewMode === 'visual' && webTabsView === 'separate'}
							<div class="flex h-10 shrink-0 gap-1 border-b border-stroke bg-surface-dim/10 px-4">
								{#each ['html', 'css', 'js'] as tab (tab)}
									<button
										class="relative mt-1 rounded-t-lg px-6 text-[10px] font-bold tracking-widest uppercase transition-all
											{activeWebTab === tab
											? 'border-x border-t border-stroke bg-surface text-brand-orange'
											: 'text-content-dim'}"
										onclick={() => (activeWebTab = tab as typeof activeWebTab)}
									>
										{tab}
									</button>
								{/each}
							</div>
							<div class="flex-1 overflow-hidden">
								{#if activeWebTab === 'html'}
									<div class="h-full" in:fade>
										<SnippetEditor
											bind:code={webFiles.html}
											language="html"
											class="h-full min-h-full rounded-none border-none"
										/>
									</div>
								{:else if activeWebTab === 'css'}
									<div class="h-full" in:fade>
										<SnippetEditor
											bind:code={webFiles.css}
											language="css"
											class="h-full min-h-full rounded-none border-none"
										/>
									</div>
								{:else if activeWebTab === 'js'}
									<div class="h-full" in:fade>
										<SnippetEditor
											bind:code={webFiles.js}
											language="javascript"
											class="h-full min-h-full rounded-none border-none"
										/>
									</div>
								{/if}
							</div>
						{:else}
							<SnippetEditor
								bind:code
								{language}
								class="h-full min-h-full rounded-none border-none"
							/>
						{/if}
					</div>
				{/snippet}

				{#snippet right()}
					<div class="flex h-full flex-col overflow-hidden bg-surface-dim/20">
						{#if viewMode === 'logic'}
							<div
								class="flex h-10 shrink-0 items-center justify-between border-b border-stroke bg-surface px-4"
							>
								<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase"
									>Console Output</span
								>
								<button
									class="text-[10px] font-bold text-content-dim hover:text-content"
									onclick={() => (result.stdout = [])}>Clear</button
								>
							</div>
							<div class="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-4 font-mono text-xs">
								{#each outputLines as line (line.id)}
									<div class="flex gap-3 border-b border-stroke/30 pb-1 last:border-0" in:slide>
										<span class="w-10 shrink-0 text-right text-content-dim/30"
											>{line.timestamp}</span
										>
										<span
											class="flex-1 break-all whitespace-pre-wrap {line.type === 'err'
												? 'font-bold text-red-500'
												: 'text-content'}">{line.content}</span
										>
									</div>
								{:else}
									<div
										class="flex h-full flex-col items-center justify-center text-center opacity-30"
									>
										<p class="text-[10px]">Console is ready.</p>
									</div>
								{/each}
							</div>
						{:else}
							<div
								class="flex h-10 shrink-0 items-center justify-between border-b border-stroke bg-surface px-4"
							>
								<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase"
									>Live Preview</span
								>
								<span
									class="rounded border border-brand-green/20 bg-brand-green/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-green uppercase"
									>Live</span
								>
							</div>
							<div class="flex-1 bg-surface-dim/10 p-4">
								<LivePreview
									code={combinedCode}
									language={webTabsView === 'combined' ? language : 'html'}
								/>
							</div>
						{/if}
					</div>
				{/snippet}
			</SplitPane>
		{/if}
	</div>
</div>

<style>
	:global(.split-pane-divider) {
		z-index: 20;
	}
</style>
