<script lang="ts">
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { apiTestService } from '$lib/services/apiTester';
	import { toolboxStore } from '$lib/stores/toolboxStore.svelte';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { slide, fade } from 'svelte/transition';
	let isExpanded = $state(false);

	async function loadEnvironments() {
		const wsId = get(workspaceStore).currentWorkspace?.id;
		if (!wsId) return;

		toolboxStore.isLoading = true;
		try {
			const { data } = await apiTestService.listEnvironments(wsId);
			toolboxStore.setToolboxes(data || []);
		} finally {
			toolboxStore.isLoading = false;
		}
	}

	function selectEnv(id: string) {
		toolboxStore.setToolbox(id);
		isExpanded = false;
	}

	onMount(() => {
		loadEnvironments();
	});
</script>

<div class="relative w-full">
	<button
		onclick={() => (isExpanded = !isExpanded)}
		class="flex w-full items-center justify-between gap-2 rounded-xl border border-stroke bg-surface-dim/40 px-3 py-2 transition-all hover:bg-surface-dim/60"
	>
		<div class="flex items-center gap-2 overflow-hidden">
			<span class="text-xs">📦</span>
			<span class="truncate text-[10px] font-bold tracking-wider text-content uppercase">
				{toolboxStore.activeToolbox?.name || 'Select Toolbox'}
			</span>
		</div>
		<svg
			class="h-3 w-3 text-zinc-500 transition-transform {isExpanded ? 'rotate-180' : ''}"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isExpanded}
		<div
			transition:slide={{ duration: 200 }}
			class="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-stroke bg-surface-dim shadow-2xl backdrop-blur-xl"
		>
			<div class="scrollbar-hide max-h-48 overflow-y-auto p-1">
				{#each toolboxStore.toolboxes as env (env.id)}
					<button
						onclick={() => selectEnv(env.id)}
						class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors {toolboxStore.selectedToolboxId ===
						env.id
							? 'bg-brand-blue/10 text-brand-blue'
							: 'text-zinc-400 hover:bg-surface'}"
					>
						<span class="text-[10px] font-bold">{env.name}</span>
						{#if toolboxStore.selectedToolboxId === env.id}
							<div class="shadow-neon-blue h-1 w-1 rounded-full bg-brand-blue"></div>
						{/if}
					</button>
				{/each}

				<button
					class="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-zinc-800 px-3 py-2 text-[10px] text-zinc-500 hover:border-brand-blue/30 hover:text-brand-blue"
				>
					<span>+</span>
					<span>New Toolbox</span>
				</button>
			</div>
		</div>
	{/if}

	{#if toolboxStore.activeToolbox && !isExpanded}
		<div
			transition:fade
			class="mt-2 flex flex-wrap gap-1.5 rounded-lg border border-stroke/30 bg-surface/20 p-2"
		>
			{#each Object.entries(toolboxStore.activeVariables || {}) as [key, value] (key)}
				<div
					class="flex items-center gap-1.5 rounded bg-zinc-900/50 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500"
				>
					<span class="text-brand-blue/70">{key}:</span>
					<span class="max-w-[80px] truncate">{value}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
