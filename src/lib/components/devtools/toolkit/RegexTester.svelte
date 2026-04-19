<script lang="ts">
	import { aiService } from '$lib/services/ai';
	import { fade } from 'svelte/transition';
	import { toast } from '$lib/stores/toastStore';
	import SafeMarkdown from '../../ui/SafeMarkdown.svelte';

	let pattern = $state('');
	let flags = $state('g');
	let testString = $state('The quick brown fox jumps over the lazy dog. 123-456-7890.');
	let aiExplanation = $state<string | null>(null);
	let isAnalyzing = $state(false);

	let regex = $derived.by(() => {
		try {
			if (!pattern) return null;
			return new RegExp(pattern, flags);
		} catch (_e) {
			return null;
		}
	});

	let matches = $derived.by(() => {
		if (!regex || !testString) return [];
		const results = [];
		let match;

		// Reset lastIndex for global regex
		if (regex) regex.lastIndex = 0;

		if (flags.includes('g') && regex) {
			while ((match = regex.exec(testString)) !== null) {
				results.push(match);
				if (match.index === regex.lastIndex) regex.lastIndex++; // Prevent infinite loops
			}
		} else if (regex) {
			match = regex.exec(testString);
			if (match) results.push(match);
		}
		return results;
	});

	async function getAiExplanation() {
		if (!pattern) return;
		isAnalyzing = true;
		aiExplanation = null;
		try {
			const prompt = `Explain this regular expression in plain English, step by step: \`/${pattern}/${flags}\`. 
			
Please focus on what it matches and any special constraints. 
Use GitHub Flavored Markdown for formatting:
- **Bold** key terms or groups.
- Use inline code (\`text\`) for character patterns.
- Use bullet points for steps.
Keep the explanation professional and structured.`;

			const response = await aiService.chat(prompt);
			if (response.error) throw new Error(response.error);
			aiExplanation = response.content;
		} catch (_err) {
			toast.show('AI Analysis failed', 'error');
		} finally {
			isAnalyzing = false;
		}
	}

	function handleFlagToggle(flag: string) {
		if (flags.includes(flag)) {
			flags = flags.replace(flag, '');
		} else {
			flags += flag;
		}
	}
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<!-- Left Col: Input Controls -->
	<div class="space-y-6 lg:col-span-2">
		<div class="rounded-xl border border-stroke bg-surface p-6 shadow-sm">
			<label
				for="regex-pattern"
				class="mb-3 block text-xs font-bold tracking-widest text-content-dim uppercase"
				>Regular Expression</label
			>
			<div
				class="flex items-center gap-2 rounded-lg border border-stroke bg-surface-dim/30 p-2 transition-all focus-within:border-brand-orange/50"
			>
				<span class="ml-2 font-mono text-lg text-content-dim">/</span>
				<input
					id="regex-pattern"
					type="text"
					bind:value={pattern}
					placeholder={'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'}
					class="flex-1 border-none bg-transparent font-mono text-content outline-none placeholder:text-content-dim/20"
				/>
				<span class="font-mono text-lg text-content-dim">/</span>
				<div class="ml-2 flex gap-1">
					{#each ['g', 'i', 'm'] as f (f)}
						<button
							class="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold uppercase transition-all
								{flags.includes(f)
								? 'bg-brand-orange text-white'
								: 'bg-surface-dim text-content-dim hover:bg-surface'}"
							onclick={() => handleFlagToggle(f)}
							title={f === 'g' ? 'Global' : f === 'i' ? 'Case Insensitive' : 'Multiline'}
						>
							{f}
						</button>
					{/each}
				</div>
			</div>

			{#if !regex && pattern}
				<p class="mt-2 font-mono text-[10px] text-red-500" in:fade>
					Invalid Regular Expression pattern
				</p>
			{/if}
		</div>

		<div class="rounded-xl border border-stroke bg-surface p-6 shadow-sm">
			<div class="mb-3 flex items-center justify-between">
				<label
					for="regex-test-string"
					class="text-xs font-bold tracking-widest text-content-dim uppercase">Test String</label
				>
				<span
					class="rounded bg-brand-orange/10 px-2 py-0.5 font-mono text-[10px] text-brand-orange"
				>
					{matches.length} matches found
				</span>
			</div>
			<textarea
				id="regex-test-string"
				bind:value={testString}
				class="scrollbar-thin h-48 w-full rounded-lg border border-stroke bg-surface-dim/30 p-4 font-mono text-sm text-content outline-none focus:border-brand-orange/50"
				placeholder="Enter text to test your regex against..."
			></textarea>
		</div>
	</div>

	<!-- Right Col: AI Insights -->
	<div class="space-y-6">
		<div
			class="h-full rounded-xl border border-stroke bg-linear-to-br from-surface to-surface-dim/50 p-6 shadow-lg"
		>
			<div class="mb-6 flex items-center justify-between">
				<h3
					class="flex items-center gap-2 text-sm font-bold tracking-widest text-content uppercase"
				>
					<svg
						class="h-4 w-4 text-brand-orange"
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
					AI Insights
				</h3>
				<button
					class="text-[10px] font-bold text-brand-orange uppercase hover:underline disabled:opacity-50"
					onclick={getAiExplanation}
					disabled={!pattern || isAnalyzing}
				>
					{isAnalyzing ? 'Analyzing...' : 'Analyze Pattern'}
				</button>
			</div>

			<div class="space-y-4">
				{#if aiExplanation}
					<div class="prose prose-sm leading-relaxed text-content-dim prose-invert" in:fade>
						<SafeMarkdown content={aiExplanation} />
					</div>
				{:else if isAnalyzing}
					<div class="space-y-3" in:fade>
						<div class="h-3 w-3/4 animate-pulse rounded bg-surface-dim"></div>
						<div class="h-3 w-full animate-pulse rounded bg-surface-dim"></div>
						<div class="h-3 w-5/6 animate-pulse rounded bg-surface-dim"></div>
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-12 text-center opacity-30">
						<svg class="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1"
								d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
							/>
						</svg>
						<p class="text-[10px] italic">
							Paste a regex pattern and click "Analyze" for a plain English breakdown.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
