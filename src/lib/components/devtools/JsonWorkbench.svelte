<script lang="ts">
	import { openCreateSnippet } from '$lib/stores/devToolsStore';
	import { toast } from '$lib/stores/toastStore';
	import { fade, slide } from 'svelte/transition';
	import JsonViewer from '../ui/JsonViewer.svelte';

	let input = $state('');
	let output = $state<unknown>(null);
	let error = $state<string | null>(null);
	let mode = $state<'format' | 'minify'>('format');

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		input = target.value;
		validateJson();
	}

	function validateJson() {
		if (!input.trim()) {
			output = null;
			error = null;
			return;
		}
		try {
			output = JSON.parse(input);
			error = null;
		} catch (e: unknown) {
			error = (e as Error).message;
			output = null;
		}
	}

	function formatJson() {
		if (error) {
			toast.show('Fix JSON errors before formatting', 'error');
			return;
		}
		if (!input.trim()) return;
		try {
			const obj = JSON.parse(input);
			input = JSON.stringify(obj, null, 2);
			mode = 'format';
			toast.show('JSON Formatted', 'success');
		} catch (_) {
			// Safety silent catch as validation happens before format
		}
	}

	function minifyJson() {
		if (error) {
			toast.show('Fix JSON errors before minifying', 'error');
			return;
		}
		if (!input.trim()) return;
		try {
			const obj = JSON.parse(input);
			input = JSON.stringify(obj);
			mode = 'minify';
			toast.show('JSON Minified', 'success');
		} catch (_) {
			// Safety silent catch as validation happens before minify
		}
	}

	function clearAll() {
		input = '';
		output = null;
		error = null;
	}

	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result as string;
			input = content;
			validateJson();
			toast.show(`Loaded ${file.name}`, 'success');
		};
		reader.readAsText(file);
	}

	function handleExport() {
		if (error || !input.trim()) return;
		openCreateSnippet({
			code: input,
			language: 'json',
			title: 'JSON Data'
		});
	}

	async function copyToClipboard() {
		if (!input.trim()) return;
		await navigator.clipboard.writeText(input);
		toast.show('Copied to clipboard', 'success');
	}
</script>

<div class="bg-background flex h-full w-full flex-col gap-6 overflow-hidden p-6">
	<!-- Toolbar -->
	<div class="flex shrink-0 items-center justify-between">
		<div class="flex items-center gap-2">
			<button
				class="px-4 py-2 {mode === 'format'
					? 'bg-primary text-primary-foreground'
					: 'bg-muted hover:bg-muted/80'} rounded-lg text-sm font-semibold shadow-sm transition"
				onclick={formatJson}
			>
				Prettify
			</button>
			<button
				class="px-4 py-2 {mode === 'minify'
					? 'bg-primary text-primary-foreground'
					: 'bg-muted hover:bg-muted/80'} rounded-lg text-sm font-semibold shadow-sm transition"
				onclick={minifyJson}
			>
				Minify
			</button>
			<div class="bg-border mx-2 h-6 w-px"></div>
			<button
				class="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition"
				onclick={copyToClipboard}
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
					/></svg
				>
				Copy
			</button>
			<button
				class="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition"
				onclick={clearAll}
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/></svg
				>
				Clear
			</button>
		</div>

		<div class="flex items-center gap-3">
			<label
				class="border-border bg-card hover:bg-muted flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
					/></svg
				>
				Upload JSON
				<input type="file" accept=".json" class="hidden" onchange={handleFileUpload} />
			</label>

			<button
				class="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 shadow-primary/5 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition"
				onclick={handleExport}
				disabled={!!error || !input.trim()}
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7v8a2 2 0 002 2h6M8 7l4 4m-4-4l-4 4"
					/></svg
				>
				Save to Snippets
			</button>
		</div>
	</div>

	<!-- Workbench Panes -->
	<div class="flex min-h-0 flex-1 gap-6">
		<!-- Input Editor -->
		<div class="flex min-w-0 flex-1 flex-col">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-muted-foreground px-1 text-xs font-bold tracking-wider uppercase"
					>Raw Input</span
				>
				{#if error}
					<span
						transition:slide={{ axis: 'y' }}
						class="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500"
						>Invalid JSON</span
					>
				{/if}
			</div>
			<div class="group relative flex-1">
				<textarea
					value={input}
					oninput={handleInput}
					class="bg-card/50 border-border focus:ring-primary/20 group-hover:border-primary/30 h-full w-full resize-none rounded-xl border p-4 font-mono text-sm transition-all outline-none focus:ring-2"
					placeholder="Paste JSON here..."
				></textarea>

				{#if error}
					<div
						class="absolute right-4 bottom-4 left-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 backdrop-blur-sm"
						transition:fade
					>
						<p
							class="wrap-break-words line-clamp-2 font-mono text-[11px] text-red-600 dark:text-red-400"
						>
							{error}
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Live Preview -->
		<div class="flex min-w-0 flex-1 flex-col">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-muted-foreground px-1 text-xs font-bold tracking-wider uppercase"
					>Tree View</span
				>
				{#if output}
					<span
						class="rounded border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-500"
						>Synced</span
					>
				{/if}
			</div>
			<div
				class="bg-card/50 border-border relative flex-1 overflow-auto rounded-xl border p-4 font-mono text-sm"
			>
				{#if output}
					<div transition:fade>
						<JsonViewer data={output} />
					</div>
				{:else}
					<div class="text-muted-foreground flex h-full items-center justify-center text-sm italic">
						{error ? 'Fix errors to preview' : 'Awaiting input...'}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
