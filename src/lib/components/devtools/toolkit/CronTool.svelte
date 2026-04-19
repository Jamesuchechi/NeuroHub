<script lang="ts">
	import { aiService } from '$lib/services/ai';
	import { fade } from 'svelte/transition';
	import { toast } from '$lib/stores/toastStore';
	import SafeMarkdown from '../../ui/SafeMarkdown.svelte';

	let cronExpression = $state('*/15 * * * *');
	let explanation = $state<string | null>(null);
	let isAnalyzing = $state(false);

	async function humanizeCron() {
		if (!cronExpression) return;
		isAnalyzing = true;
		explanation = null;

		const now = new Date();
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const localTime = now.toLocaleString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		});

		try {
			const prompt = `Translate this Cron expression into a human-readable, friendly sentence: \`${cronExpression}\`. 
			
IMPORTANT CONTEXT:
- Current Device Time: ${localTime}
- User Timezone: ${timezone}

Please provide the next 3 specific run times based on this EXACT current time. 
Use GitHub Flavored Markdown for formatting (bolding, lists). Keep it professional and precise.`;

			const response = await aiService.chat(prompt);
			if (response.error) throw new Error(response.error);
			explanation = response.content;
		} catch (_err) {
			toast.show('Failed to humanize cron', 'error');
		} finally {
			isAnalyzing = false;
		}
	}

	// Preset list for convenience
	const presets = [
		{ name: 'Every Minute', value: '* * * * *' },
		{ name: 'Every 5 Mins', value: '*/5 * * * *' },
		{ name: 'Every Hour', value: '0 * * * *' },
		{ name: 'Every Day (Midnight)', value: '0 0 * * *' },
		{ name: 'Every Sunday', value: '0 0 * * 0' }
	];
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
	<!-- Left: Input & Presets -->
	<div class="space-y-6">
		<div class="rounded-xl border border-stroke bg-surface p-8 shadow-sm">
			<label
				for="cron-input"
				class="mb-4 block text-xs font-bold tracking-widest text-content-dim uppercase"
				>Cron Expression</label
			>
			<div class="flex flex-col gap-4">
				<input
					id="cron-input"
					type="text"
					bind:value={cronExpression}
					class="w-full rounded-lg border border-stroke bg-surface-dim/30 p-4 text-center font-mono text-2xl font-black text-brand-orange transition-all outline-none focus:border-brand-orange/50"
					placeholder="* * * * *"
				/>
				<button
					class="w-full rounded-lg bg-orange-500 py-3 text-xs font-bold tracking-widest text-white uppercase shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:opacity-50"
					onclick={humanizeCron}
					disabled={!cronExpression || isAnalyzing}
				>
					{isAnalyzing ? 'Analyzing...' : 'Humanize Schedule'}
				</button>
			</div>
		</div>

		<div class="rounded-xl border border-stroke bg-surface p-6">
			<h4 class="mb-4 text-[10px] font-bold tracking-widest text-content-dim uppercase">
				Quick Presets
			</h4>
			<div class="flex flex-wrap gap-2">
				{#each presets as preset (preset.value)}
					<button
						class="rounded-md border border-stroke/50 bg-surface-dim px-3 py-1.5 text-[10px] font-bold text-content-dim transition-all hover:bg-brand-orange/10 hover:text-brand-orange"
						onclick={() => {
							cronExpression = preset.value;
							humanizeCron();
						}}
					>
						{preset.name}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Right: AI Humanizer Output -->
	<div
		class="group relative overflow-hidden rounded-xl border border-zinc-800 bg-linear-to-br from-zinc-900 to-black p-8 shadow-2xl"
	>
		<div class="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
			<svg class="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		</div>

		<h3
			class="mb-6 flex items-center gap-2 text-sm font-bold tracking-widest text-white/50 uppercase"
		>
			<div class="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-orange"></div>
			Human Translation
		</h3>

		<div class="space-y-4">
			{#if explanation}
				<div class="prose prose-sm leading-relaxed font-medium text-zinc-300 prose-invert" in:fade>
					<SafeMarkdown content={explanation} />
				</div>
			{:else if isAnalyzing}
				<div class="space-y-4 pt-4" in:fade>
					<div class="h-4 w-3/4 animate-pulse rounded bg-zinc-800/50"></div>
					<div class="h-4 w-full animate-pulse rounded bg-zinc-800/50"></div>
					<div class="h-4 w-5/6 animate-pulse rounded bg-zinc-800/50"></div>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center py-12 text-center opacity-20">
					<p class="text-xs tracking-tighter text-white uppercase italic">
						Waiting for expression...
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
