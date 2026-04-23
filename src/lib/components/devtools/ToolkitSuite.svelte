<script lang="ts">
	import { fade } from 'svelte/transition';
	import RegexTester from './toolkit/RegexTester.svelte';
	import ConverterLab from './toolkit/ConverterLab.svelte';
	import CronTool from './toolkit/CronTool.svelte';

	let activeSubTab = $state<'regex' | 'converters' | 'cron'>('regex');

	const tabs = [
		{
			id: 'regex',
			label: 'RegEx Forensics',
			icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
		},
		{
			id: 'converters',
			label: 'Converter Lab',
			icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
		},
		{ id: 'cron', label: 'Cron Humanizer', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
	] as const;
</script>

<div class="flex h-full flex-col overflow-hidden bg-surface">
	<!-- Tab Header -->
	<nav
		class="scrollbar-hide flex h-12 shrink-0 overflow-x-auto border-b border-stroke bg-surface-dim/30 px-2 md:px-4"
	>
		{#each tabs as tab (tab.id)}
			<button
				class="relative flex shrink-0 items-center gap-2 px-4 text-[10px] font-bold tracking-widest uppercase transition-all md:px-6 md:text-xs
					{activeSubTab === tab.id ? 'text-brand-orange' : 'text-content-dim hover:text-content'}"
				onclick={() => (activeSubTab = tab.id)}
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={tab.icon} />
				</svg>
				<span class="whitespace-nowrap">{tab.label}</span>

				{#if activeSubTab === tab.id}
					<div class="absolute right-0 bottom-0 left-0 h-0.5 bg-brand-orange"></div>
				{/if}
			</button>
		{/each}
	</nav>

	<!-- Content Area -->
	<main class="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-6">
		<div class="mx-auto max-w-5xl">
			{#if activeSubTab === 'regex'}
				<div in:fade={{ duration: 200 }} class="space-y-6">
					<header>
						<h2 class="text-2xl font-bold text-content italic">
							RegEx <span class="text-brand-orange">Forensics</span>
						</h2>
						<p class="mt-1 text-sm text-content-dim">
							Real-time pattern testing and AI-powered pattern explanation.
						</p>
					</header>

					<div class="mt-8">
						<RegexTester />
					</div>
				</div>
			{:else if activeSubTab === 'converters'}
				<div in:fade={{ duration: 200 }} class="space-y-6">
					<header>
						<h2 class="text-2xl font-bold text-content italic">
							Converter <span class="text-brand-orange">Lab</span>
						</h2>
						<p class="mt-1 text-sm text-content-dim">
							Your swiss army knife for daily developer transformations.
						</p>
					</header>

					<div class="mt-8">
						<ConverterLab />
					</div>
				</div>
			{:else if activeSubTab === 'cron'}
				<div in:fade={{ duration: 200 }} class="space-y-6">
					<header>
						<h2 class="text-2xl font-bold text-content italic">
							Cron <span class="text-brand-orange">Humanizer</span>
						</h2>
						<p class="mt-1 text-sm text-content-dim">
							Translate cryptic cron strings into plain English schedules.
						</p>
					</header>

					<div class="mt-8">
						<CronTool />
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>
