<script lang="ts">
	import { openCreateSnippet } from '$lib/stores/devToolsStore';
	import SnippetEditor from './SnippetEditor.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import LivePreview from './LivePreview.svelte';
	import SplitPane from '../ui/SplitPane.svelte';
	import { sandboxPanelWidth } from '$lib/stores/devToolsStore';
	import type { SandboxResult, Language } from '$lib/types/devtools';
	import { onDestroy } from 'svelte';
	import { formatBytes } from '$lib/utils/formatBytes';
	import { aiService } from '$lib/services/ai';
	import SandboxWorker from '$lib/workers/sandbox.worker?worker';
	import { slide, fade } from 'svelte/transition';

	let { workspaceId: _workspaceId } = $props<{ workspaceId: string }>();

	// View Settings
	let viewMode = $state<'logic' | 'visual'>('logic');
	let webTabsView = $state<'combined' | 'separate'>('combined');
	let activeWebTab = $state<'html' | 'css' | 'js'>('html');

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
		if (viewMode === 'visual') return; // Live preview updates automatically via srcdoc

		if (worker) worker.terminate();
		result = { stdout: [], stderr: [], error: null, duration_ms: 0, memory_usage_bytes: null };
		isRunning = true;
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

	onDestroy(() => {
		if (worker) worker.terminate();
	});
</script>

<div class="flex h-full flex-col overflow-hidden bg-surface">
	<!-- Top: Main Header -->
	<div
		class="flex h-12 shrink-0 items-center justify-between border-b border-stroke bg-surface-dim/30 px-4"
	>
		<div class="flex items-center gap-6">
			<!-- Mode Switcher -->
			<div class="flex rounded-lg border border-stroke bg-surface p-0.5">
				<button
					class="rounded-md px-4 py-1 text-[10px] font-bold tracking-widest uppercase transition-all
						{viewMode === 'logic'
						? 'bg-orange-500 text-white shadow-sm'
						: 'text-content-dim hover:text-content'}"
					onclick={() => (viewMode = 'logic')}
				>
					Logic
				</button>
				<button
					class="rounded-md px-4 py-1 text-[10px] font-bold tracking-widest uppercase transition-all
						{viewMode === 'visual'
						? 'bg-orange-500 text-white shadow-sm'
						: 'text-content-dim hover:text-content'}"
					onclick={() => (viewMode = 'visual')}
				>
					Visual
				</button>
			</div>

			<div class="flex items-center gap-3">
				{#if viewMode === 'logic'}
					<div class="flex items-center gap-3" in:fade>
						<div class="flex items-center gap-2">
							<div
								class="h-2 w-2 rounded-full {isRunning
									? 'animate-pulse bg-orange-500'
									: 'bg-brand-green'}"
							></div>
							<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase">
								{language === 'javascript'
									? 'V8 Engine'
									: language === 'python'
										? 'WASM Runtime'
										: 'AI Simulation'}
							</span>
						</div>
						{#if isInitializingPython}
							<span
								class="animate-pulse rounded border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 font-mono text-[10px] text-orange-500"
								>Loading Python...</span
							>
						{/if}
						{#if isAiSimulating}
							<span
								class="animate-pulse rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-500"
								>AI Inference...</span
							>
						{/if}
						{#if result.duration_ms > 0}
							<span class="font-mono text-[10px] text-content-dim opacity-50"
								>{result.duration_ms}ms</span
							>
						{/if}
					</div>
				{:else}
					<div class="flex items-center gap-2" in:fade>
						<div class="h-2 w-2 animate-pulse rounded-full bg-brand-orange"></div>
						<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase">
							Live Rendering Engine
						</span>
					</div>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-3">
			{#if viewMode === 'visual'}
				<div class="mr-3 flex rounded-lg border border-stroke bg-surface p-0.5" in:fade>
					<button
						class="rounded px-2 py-1 text-[9px] font-bold uppercase transition-all
							{webTabsView === 'combined' ? 'bg-surface-dim text-content' : 'text-content-dim'}"
						onclick={() => (webTabsView = 'combined')}
					>
						Combined
					</button>
					<button
						class="rounded px-2 py-1 text-[9px] font-bold uppercase transition-all
							{webTabsView === 'separate' ? 'bg-surface-dim text-content' : 'text-content-dim'}"
						onclick={() => (webTabsView = 'separate')}
					>
						Tabs
					</button>
				</div>
			{/if}

			<LanguageSelector bind:value={language} onchange={handleLanguageChange} />
			<div class="h-4 w-px bg-stroke"></div>
			<button
				class="rounded-md border border-stroke bg-surface-dim px-3 py-1.5 text-xs font-bold text-content transition-colors hover:bg-surface"
				onclick={handleExportAsSnippet}
			>
				Export
			</button>
			{#if viewMode === 'logic'}
				<button
					class="rounded-md bg-orange-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:opacity-50"
					onclick={runCode}
					disabled={isRunning}
				>
					{isRunning ? 'Running...' : 'Run Code'}
				</button>
			{/if}
		</div>
	</div>

	<!-- Main Multi-File Tab Bar (Only for visual separate mode) -->
	{#if viewMode === 'visual' && webTabsView === 'separate'}
		<div
			class="flex h-10 shrink-0 gap-1 border-b border-stroke bg-surface-dim/10 px-4"
			transition:slide
		>
			{#each ['html', 'css', 'js'] as tab (tab)}
				<button
					class="relative mt-1 rounded-t-lg px-6 text-[10px] font-bold tracking-widest uppercase transition-all
						{activeWebTab === tab
						? 'border-x border-t border-stroke bg-surface text-brand-orange'
						: 'text-content-dim hover:text-content'}"
					onclick={() => (activeWebTab = tab as typeof activeWebTab)}
				>
					{tab}
					{#if activeWebTab === tab}
						<div class="absolute right-0 bottom-0 left-0 h-1 bg-surface"></div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Main content Split -->
	<div class="flex flex-1 overflow-hidden border-t border-stroke">
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
						{#if activeWebTab === 'html'}
							<div class="h-full" in:fade>
								<SnippetEditor
									bind:code={webFiles.html}
									language="html"
									minHeight="100%"
									class="h-full rounded-none border-none"
								/>
							</div>
						{:else if activeWebTab === 'css'}
							<div class="h-full" in:fade>
								<SnippetEditor
									bind:code={webFiles.css}
									language="css"
									minHeight="100%"
									class="h-full rounded-none border-none"
								/>
							</div>
						{:else if activeWebTab === 'js'}
							<div class="h-full" in:fade>
								<SnippetEditor
									bind:code={webFiles.js}
									language="javascript"
									minHeight="100%"
									class="h-full rounded-none border-none"
								/>
							</div>
						{/if}
					{:else}
						<SnippetEditor
							bind:code
							{language}
							minHeight="100%"
							class="h-full rounded-none border-none"
						/>
					{/if}
				</div>
			{/snippet}

			{#snippet right()}
				<div class="flex h-full flex-col overflow-hidden bg-surface-dim/20">
					{#if viewMode === 'logic'}
						<!-- Console UI -->
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
									<span class="w-10 shrink-0 text-right text-content-dim/30">{line.timestamp}</span>
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
									<p class="text-[10px]">Console is ready. Run your code to see results.</p>
								</div>
							{/each}
						</div>
					{:else}
						<!-- Visual Preview UI -->
						<div
							class="flex h-10 shrink-0 items-center justify-between border-b border-stroke bg-surface px-4"
						>
							<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase"
								>Live Preview</span
							>
							<div class="flex items-center gap-2">
								<span
									class="rounded border border-brand-green/20 bg-brand-green/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-green uppercase"
									>Live</span
								>
							</div>
						</div>
						<div class="flex-1 bg-surface-dim/10 p-4">
							<LivePreview
								code={combinedCode}
								language={webTabsView === 'combined' ? language : 'html'}
							/>
						</div>
					{/if}

					{#if viewMode === 'logic' && result.memory_usage_bytes}
						<div class="border-t border-stroke bg-surface-dim/30 p-2 px-4 shadow-inner">
							<span class="text-[10px] tracking-tighter text-content-dim uppercase"
								>Memory: {formatBytes(result.memory_usage_bytes)}</span
							>
						</div>
					{/if}
				</div>
			{/snippet}
		</SplitPane>
	</div>
</div>
