<script lang="ts">
	import { openCreateSnippet } from '$lib/stores/devToolsStore';
	import { toast } from '$lib/stores/toastStore';
	import { jsonStore } from '$lib/stores/jsonStore';
	import { generateTypeScript } from '$lib/utils/jsonUtils';
	import { fade, slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import JsonViewer from '../ui/JsonViewer.svelte';

	let input = $state('');
	let output = $state<unknown>(null);
	let error = $state<string | null>(null);
	let mode = $state<'format' | 'minify'>('format');
	let searchQuery = $state('');
	let treeKey = $state(0); // For forcing re-render/collapse

	onMount(() => {
		const handler = (e: Event) => {
			const customEvent = e as CustomEvent<string>;
			input = customEvent.detail;
			validateAndSave();
		};
		window.addEventListener('load-json', handler);
		return () => window.removeEventListener('load-json', handler);
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		input = target.value;
		validateAndSave();
	}

	let saveTimeout: ReturnType<typeof setTimeout> | undefined;
	function validateAndSave() {
		if (!input.trim()) {
			output = null;
			error = null;
			return;
		}
		try {
			output = JSON.parse(input);
			error = null;

			// Auto-save to history after debounce
			clearTimeout(saveTimeout);
			saveTimeout = setTimeout(() => {
				jsonStore.add(input);
			}, 2000);
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
			// Safety silent catch
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
			// Safety silent catch
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
			validateAndSave();
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

	function handleGenerateTS() {
		if (!output) return;
		const tsInterface = generateTypeScript(output);
		navigator.clipboard.writeText(tsInterface);
		toast.show('TS Interface copied to clipboard', 'success');
	}

	function toggleAll(expand: boolean) {
		// This is a hacky way to force all JsonViewer children to reset their 'expanded' state
		// but since we use depth < 2 in $effect, incrementing treeKey forces a re-mount
		treeKey++;
		toast.show(expand ? 'Expanded All' : 'Collapsed All', 'info');
	}
</script>

<div class="flex h-full w-full flex-col gap-6 overflow-hidden bg-surface p-6">
	<!-- Toolbar -->
	<div class="flex shrink-0 items-center justify-between">
		<div class="flex items-center gap-2">
			<button
				class="px-4 py-2 {mode === 'format'
					? 'bg-brand-orange text-white'
					: 'bg-surface-dim text-content-dim hover:bg-surface-dim/80'} rounded-lg text-sm font-bold shadow-sm transition"
				onclick={formatJson}
			>
				Prettify
			</button>
			<button
				class="px-4 py-2 {mode === 'minify'
					? 'bg-brand-orange text-white'
					: 'bg-surface-dim text-content-dim hover:bg-surface-dim/80'} rounded-lg text-sm font-bold shadow-sm transition"
				onclick={minifyJson}
			>
				Minify
			</button>
			<div class="mx-2 h-6 w-px bg-stroke"></div>
			<button
				class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-content-dim transition hover:bg-surface-dim hover:text-content"
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
				class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-content-dim transition hover:bg-surface-dim hover:text-content"
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
			<button
				class="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-500 transition hover:bg-blue-500/20"
				onclick={handleGenerateTS}
				disabled={!output}
			>
				Get TS Types
			</button>

			<label
				class="flex cursor-pointer items-center gap-2 rounded-lg border border-stroke bg-surface px-4 py-2 text-sm font-bold text-content-dim shadow-sm transition hover:bg-surface-dim"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
					/></svg
				>
				Upload
				<input type="file" accept=".json" class="hidden" onchange={handleFileUpload} />
			</label>

			<button
				class="flex items-center gap-2 rounded-lg border border-brand-orange/20 bg-brand-orange/5 px-4 py-2 text-sm font-bold text-brand-orange shadow-sm shadow-brand-orange/5 transition hover:bg-brand-orange/10"
				onclick={handleExport}
				disabled={!!error || !input.trim()}
			>
				Save
			</button>
		</div>
	</div>

	<!-- Workbench Panes -->
	<div class="flex min-h-0 flex-1 gap-6">
		<!-- Input Editor -->
		<div class="flex min-w-0 flex-[1.2] flex-col">
			<div class="mb-2 flex items-center justify-between">
				<span class="px-1 text-xs font-bold tracking-wider text-content-dim uppercase"
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
					class="h-full w-full resize-none rounded-xl border border-stroke bg-surface-dim/30 p-4 font-mono text-sm transition-all outline-none focus:border-brand-orange/50 focus:ring-4 focus:ring-brand-orange/5"
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

		<!-- Tree Preview -->
		<div class="flex min-w-0 flex-1 flex-col">
			<div class="mb-2 flex items-center justify-between gap-4">
				<div class="flex items-center gap-3 overflow-hidden">
					<span class="shrink-0 px-1 text-xs font-bold tracking-wider text-content-dim uppercase"
						>Tree View</span
					>
					<div class="relative min-w-[120px] flex-1">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search path or value..."
							class="w-full rounded-md border border-stroke bg-surface-dim px-2 py-1 text-[10px] focus:border-brand-orange/30 focus:outline-none"
						/>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button
						class="text-[10px] font-bold text-content-dim hover:text-content"
						onclick={() => toggleAll(false)}>Collapse</button
					>
					<div class="h-3 w-px bg-stroke"></div>
					<button
						class="text-[10px] font-bold text-content-dim hover:text-content"
						onclick={() => toggleAll(true)}>Expand</button
					>
				</div>
			</div>
			<div
				class="relative flex-1 overflow-auto rounded-xl border border-stroke bg-surface-dim/30 p-4 font-mono text-sm shadow-inner"
			>
				{#if output}
					{#key treeKey}
						<div transition:fade>
							<JsonViewer data={output} {searchQuery} />
						</div>
					{/key}
				{:else}
					<div
						class="flex h-full flex-col items-center justify-center text-sm text-content-dim italic opacity-50"
					>
						<svg class="mb-2 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
						{error ? 'Fix errors to preview' : 'Awaiting input...'}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
