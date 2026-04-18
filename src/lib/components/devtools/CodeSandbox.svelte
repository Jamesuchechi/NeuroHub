<script lang="ts">
	import { sandboxPreload, openCreateSnippet } from '$lib/stores/devToolsStore';
	import SnippetEditor from './SnippetEditor.svelte';
	import type { SandboxResult } from '$lib/types/devtools';
	import { onDestroy } from 'svelte';
	import { formatBytes } from '$lib/utils/formatBytes';
	import SandboxWorker from '$lib/workers/sandbox.worker?worker';

	let code = $state(
		`// Try it out!\nconst nums = [1, 2, 3, 4, 5];\nconst doubled = nums.map(n => n * 2);\nconsole.log('Doubled:', doubled);\nconsole.log('Sum:', doubled.reduce((a, b) => a + b, 0));`
	);

	// Handle cross-tool preloading
	$effect(() => {
		if ($sandboxPreload) {
			code = $sandboxPreload.code;
			sandboxPreload.set(null); // Clear once consumed
			runCode();
		}
	});

	let output = $state<SandboxResult | null>(null);
	let isRunning = $state(false);
	let worker: Worker | null = null;

	function handleExportAsSnippet() {
		openCreateSnippet({
			code,
			language: 'javascript',
			title: 'Sandbox Snippet'
		});
	}

	function runCode() {
		if (worker) {
			worker.terminate();
		}

		output = null;
		isRunning = true;

		worker = new SandboxWorker();

		const timeout = setTimeout(() => {
			if (worker) worker.terminate();
			isRunning = false;
			output = {
				stdout: [],
				stderr: [],
				error: 'Timeout: 5s exceeded. Execution was killed.',
				duration_ms: 5000,
				memory_usage_bytes: null
			};
		}, 5000);

		worker.onmessage = (e: MessageEvent<SandboxResult>) => {
			clearTimeout(timeout);
			output = e.data;
			isRunning = false;
		};

		worker.postMessage({ code });
	}

	function clearOutput() {
		output = null;
		if (worker) {
			worker.terminate();
			worker = null;
		}
		isRunning = false;
	}

	onDestroy(() => {
		if (worker) worker.terminate();
	});
</script>

<div class="flex h-full gap-4 p-4">
	<!-- Left Panel: Editor -->
	<div class="border-border bg-card flex flex-1 flex-col overflow-hidden rounded-xl border">
		<div class="border-border bg-muted/20 flex items-center justify-between border-b p-3">
			<div class="flex items-center gap-2">
				<span class="text-sm font-semibold">JavaScript Sandbox</span>
				<span
					class="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase"
					>V8 Worker</span
				>
			</div>
			<div class="flex items-center gap-2">
				<!-- Execution time badge (if ran) -->
				{#if output}
					<div class="flex items-center gap-2">
						<span
							class="text-muted-foreground bg-muted border-border rounded border px-2 py-0.5 font-mono text-[10px]"
						>
							{output.duration_ms}ms
						</span>
						{#if output.memory_usage_bytes}
							<span
								class="text-muted-foreground bg-muted border-border rounded border px-2 py-0.5 font-mono text-[10px]"
							>
								{formatBytes(output.memory_usage_bytes)}
							</span>
						{/if}
					</div>
				{/if}
				<button
					class="flex items-center gap-1.5 rounded bg-green-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600 disabled:opacity-50"
					onclick={runCode}
					disabled={isRunning || !code.trim()}
				>
					{#if isRunning}
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"
							><circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle><path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path></svg
						>
						Running
					{:else}
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
							></path><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							></path></svg
						>
						Run
					{/if}
				</button>

				<button
					class="bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition"
					onclick={handleExportAsSnippet}
					disabled={!code.trim()}
					title="Export as Snippet"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7v8a2 2 0 002 2h6M8 7l4 4m-4-4l-4 4"
						/></svg
					>
					Export
				</button>
			</div>
		</div>

		<SnippetEditor
			bind:code
			language="javascript"
			class="h-full w-full flex-1 rounded-none border-0"
			minHeight="100%"
		/>
	</div>

	<!-- Right Panel: Output -->
	<div class="border-border bg-card flex flex-1 flex-col overflow-hidden rounded-xl border">
		<div class="border-border bg-muted/20 flex items-center justify-between border-b p-3">
			<span class="text-sm font-semibold">Console Output</span>
			<button
				class="text-muted-foreground hover:text-foreground text-xs font-medium"
				onclick={clearOutput}
				disabled={!output}
			>
				Clear
			</button>
		</div>

		<div class="flex-1 overflow-y-auto bg-[#1e1e1e] p-4 font-mono text-sm">
			{#if !output && !isRunning}
				<div class="text-muted-foreground/50 flex h-full items-center justify-center italic">
					Waiting for execution...
				</div>
			{:else}
				{#if output?.stdout && output.stdout.length > 0}
					{#each output.stdout as log, i (i)}
						<div class="border-b border-white/5 py-1 text-gray-300 last:border-0">{log}</div>
					{/each}
				{/if}

				{#if output?.stderr && output.stderr.length > 0}
					{#each output.stderr as err, i (i)}
						<div class="border-b border-white/5 py-1 text-amber-400 last:border-0">{err}</div>
					{/each}
				{/if}

				{#if output?.error}
					<div class="wrap-break-words py-1 font-semibold whitespace-pre-wrap text-red-400">
						{output.error}
					</div>
				{/if}

				{#if output && output.stdout.length === 0 && output.stderr.length === 0 && !output.error}
					<div class="text-gray-500 italic">No output.</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
