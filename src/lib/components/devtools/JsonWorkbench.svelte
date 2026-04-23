<script lang="ts">
	import { openCreateSnippet } from '$lib/stores/devToolsStore';
	import { toast } from '$lib/stores/toastStore';
	import { jsonStore } from '$lib/stores/jsonStore';
	import { generateTypeScript } from '$lib/utils/jsonUtils';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import JsonViewer from '../ui/JsonViewer.svelte';

	let input = $state('');
	let output = $state<unknown>(null);
	let error = $state<string | null>(null);
	let mode = $state<'format' | 'minify'>('format');
	let searchQuery = $state('');
	let treeKey = $state(0);
	let mobileView = $state<'input' | 'tree'>('input');
	let isMobile = $state(false);

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);

		const handler = (e: Event) => {
			const customEvent = e as CustomEvent<string>;
			input = customEvent.detail;
			validateAndSave();
			if (isMobile) mobileView = 'tree';
		};
		window.addEventListener('load-json', handler);

		return () => {
			window.removeEventListener('resize', checkMobile);
			window.removeEventListener('load-json', handler);
		};
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
		} catch (e) {
			console.error('Format failed:', e);
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
		} catch (e) {
			console.error('Minify failed:', e);
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
			if (isMobile) mobileView = 'tree';
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
		treeKey++;
		toast.show(expand ? 'Expanded All' : 'Collapsed All', 'info');
	}
</script>

<div class="flex h-full w-full flex-col gap-4 overflow-hidden bg-surface p-3 md:gap-6 md:p-6">
	<!-- Toolbar -->
	<div class="flex shrink-0 flex-col items-center justify-between gap-3 md:flex-row">
		<div
			class="scrollbar-hide flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0"
		>
			<button
				class="px-3 py-2 whitespace-nowrap md:px-4 {mode === 'format'
					? 'bg-brand-orange text-white'
					: 'bg-surface-dim text-content-dim'} rounded-lg text-[10px] font-bold shadow-sm transition md:text-sm"
				onclick={formatJson}
			>
				Prettify
			</button>
			<button
				class="px-3 py-2 whitespace-nowrap md:px-4 {mode === 'minify'
					? 'bg-brand-orange text-white'
					: 'bg-surface-dim text-content-dim'} rounded-lg text-[10px] font-bold shadow-sm transition md:text-sm"
				onclick={minifyJson}
			>
				Minify
			</button>
			<div class="h-6 w-px shrink-0 bg-stroke"></div>
			<button
				class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-medium text-content-dim transition hover:text-content md:gap-2 md:px-3 md:text-sm"
				onclick={copyToClipboard}
			>
				Copy
			</button>
			<button
				class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-medium text-content-dim transition hover:text-content md:gap-2 md:px-3 md:text-sm"
				onclick={clearAll}
			>
				Clear
			</button>
		</div>

		<div
			class="scrollbar-hide flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0"
		>
			{#if isMobile}
				<div class="mr-auto flex rounded-lg border border-stroke bg-surface p-0.5">
					<button
						class="rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all {mobileView ===
						'input'
							? 'bg-surface-dim text-content'
							: 'text-content-dim'}"
						onclick={() => (mobileView = 'input')}>Input</button
					>
					<button
						class="rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all {mobileView ===
						'tree'
							? 'bg-surface-dim text-content'
							: 'text-content-dim'}"
						onclick={() => (mobileView = 'tree')}>Tree</button
					>
				</div>
			{/if}
			<button
				class="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-bold whitespace-nowrap text-blue-500 transition hover:bg-blue-500/20 md:px-4 md:text-sm"
				onclick={handleGenerateTS}
				disabled={!output}
			>
				TS Types
			</button>

			<label
				class="flex cursor-pointer items-center gap-1 rounded-lg border border-stroke bg-surface px-3 py-2 text-[10px] font-bold whitespace-nowrap text-content-dim shadow-sm transition md:gap-2 md:px-4 md:text-sm"
			>
				Upload
				<input type="file" accept=".json" class="hidden" onchange={handleFileUpload} />
			</label>

			<button
				class="flex items-center gap-1 rounded-lg bg-brand-orange px-3 py-2 text-[10px] font-bold whitespace-nowrap text-white shadow-sm shadow-brand-orange/5 transition md:gap-2 md:px-4 md:text-sm"
				onclick={handleExport}
				disabled={!!error || !input.trim()}
			>
				Save
			</button>
		</div>
	</div>

	<!-- Workbench Panes -->
	<div class="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:gap-6">
		{#if !isMobile || mobileView === 'input'}
			<div class="flex h-full min-w-0 flex-[1.2] flex-col" in:fade>
				<div class="mb-2 flex items-center justify-between">
					<span class="px-1 text-[10px] font-bold tracking-wider text-content-dim uppercase"
						>Raw Input</span
					>
					{#if error}
						<span
							class="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-500"
							>Invalid JSON</span
						>
					{/if}
				</div>
				<div class="group relative flex-1">
					<textarea
						value={input}
						oninput={handleInput}
						class="h-full w-full resize-none rounded-xl border border-stroke bg-surface-dim/30 p-3 font-mono text-[11px] transition-all outline-none focus:border-brand-orange/50 md:p-4 md:text-sm"
						placeholder="Paste JSON here..."
					></textarea>

					{#if error}
						<div
							class="absolute right-3 bottom-3 left-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2 backdrop-blur-sm md:p-3"
							transition:fade
						>
							<p
								class="wrap-break-words line-clamp-2 font-mono text-[10px] text-red-600 md:text-[11px] dark:text-red-400"
							>
								{error}
							</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if !isMobile || mobileView === 'tree'}
			<div class="flex h-full min-w-0 flex-1 flex-col" in:fade>
				<div class="mb-2 flex items-center justify-between gap-2">
					<div class="flex flex-1 items-center gap-2 overflow-hidden">
						<span
							class="hidden shrink-0 px-1 text-[10px] font-bold tracking-wider text-content-dim uppercase md:inline"
							>Tree</span
						>
						<div class="relative min-w-[80px] flex-1">
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Search..."
								class="w-full rounded-md border border-stroke bg-surface-dim px-2 py-1 text-[10px] focus:outline-none"
							/>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<button class="text-[9px] font-bold text-content-dim" onclick={() => toggleAll(false)}
							>Collapse</button
						>
						<button class="text-[9px] font-bold text-content-dim" onclick={() => toggleAll(true)}
							>Expand</button
						>
					</div>
				</div>
				<div
					class="relative flex-1 overflow-auto rounded-xl border border-stroke bg-surface-dim/30 p-3 font-mono text-[11px] shadow-inner md:p-4 md:text-sm"
				>
					{#if output}
						{#key treeKey}
							<div transition:fade>
								<JsonViewer data={output} {searchQuery} />
							</div>
						{/key}
					{:else}
						<div
							class="flex h-full flex-col items-center justify-center text-[11px] text-content-dim italic opacity-50"
						>
							<svg class="mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1"
									d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
								/></svg
							>
							{error ? 'Fix errors' : 'Waiting...'}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
