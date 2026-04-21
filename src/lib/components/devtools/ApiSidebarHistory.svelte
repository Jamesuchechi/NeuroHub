<script lang="ts">
	import { apiTestService } from '$lib/services/apiTester';
	import { toolboxStore } from '$lib/stores/toolboxStore.svelte';
	import { apiHistoryStore, type ApiHistoryItem } from '$lib/stores/apiHistoryStore';
	import { activeApiTestId } from '$lib/stores/devToolsStore';
	import { toast } from '$lib/stores/toastStore';
	import type { ApiTestsTable } from '$lib/types/db';
	import { onMount } from 'svelte';
	import { slide, fade } from 'svelte/transition';
	import { formatDistanceToNow } from 'date-fns';

	let { workspaceId } = $props<{ workspaceId: string }>();

	let activeView = $state<'saved' | 'recent'>('recent');
	let savedRequests = $state<ApiTestsTable['Row'][]>([]);
	let loading = $state(false);

	const recentHistory = $derived($apiHistoryStore.filter((h) => h.workspaceId === workspaceId));

	async function loadSaved() {
		if (!workspaceId) return;
		loading = true;
		try {
			const res = await apiTestService.list(workspaceId, toolboxStore.selectedToolboxId);
			if (res.data) {
				savedRequests = res.data;
			}
		} catch {
			toast.show('Failed to load saved requests', 'error');
		}
		loading = false;
	}

	function selectSaved(id: string) {
		activeApiTestId.set(id);
	}

	function selectHistory(item: ApiHistoryItem) {
		// To load a history item, we dispatch an event that ApiTester can listen to
		// (similar to how we did it for JSON history)
		const event = new CustomEvent('load-api-request', {
			detail: {
				method: item.method,
				url: item.url,
				name: `History: ${item.method} ${new URL(item.url).pathname}`
			}
		});
		window.dispatchEvent(event);
		toast.show('Request loaded from history', 'success');
	}

	function resetBuilder() {
		activeApiTestId.set(null);
		const event = new CustomEvent('load-api-request', { detail: null });
		window.dispatchEvent(event);
	}

	function handleClearHistory() {
		if (confirm('Clear all recent API history?')) {
			apiHistoryStore.clear();
		}
	}

	$effect(() => {
		if (workspaceId || toolboxStore.selectedToolboxId !== undefined) {
			loadSaved();
		}
	});

	onMount(() => {
		loadSaved();
	});
</script>

<div class="flex h-full flex-col overflow-hidden bg-surface">
	<!-- Tab Header -->
	<div class="flex shrink-0 border-b border-stroke">
		<button
			class="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-colors
				{activeView === 'recent'
				? 'border-b-2 border-brand-orange bg-brand-orange/5 text-brand-orange'
				: 'text-content-dim hover:bg-surface-dim hover:text-content'}"
			onclick={() => (activeView = 'recent')}
		>
			Recent
		</button>
		<button
			class="flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-colors
				{activeView === 'saved'
				? 'border-b-2 border-brand-orange bg-brand-orange/5 text-brand-orange'
				: 'text-content-dim hover:bg-surface-dim hover:text-content'}"
			onclick={() => (activeView = 'saved')}
		>
			Saved
		</button>
	</div>

	<!-- Content Area -->
	<div class="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
		{#if activeView === 'saved'}
			{#if loading && savedRequests.length === 0}
				{#each Array(5) as _, i (i)}
					<div class="mb-1 h-10 animate-pulse rounded-md bg-surface-dim/50"></div>
				{/each}
			{:else if savedRequests.length === 0}
				<div class="py-10 text-center text-xs text-content-dim italic opacity-50">
					No saved requests
				</div>
			{:else}
				{#each savedRequests as req (req.id)}
					<button
						class="group flex w-full items-center gap-3 rounded-md p-2 text-left transition-all
							{$activeApiTestId === req.id
							? 'bg-brand-orange/10 font-bold text-brand-orange ring-1 ring-brand-orange/20'
							: 'text-content-dim hover:bg-surface-dim hover:text-content'}"
						onclick={() => selectSaved(req.id)}
					>
						<span
							class="w-8 shrink-0 font-mono text-[9px] font-bold
							{req.method === 'GET'
								? 'text-brand-blue'
								: req.method === 'POST'
									? 'text-brand-green'
									: req.method === 'DELETE'
										? 'text-red-500'
										: 'text-brand-orange'}"
						>
							{req.method}
						</span>
						<span class="flex-1 truncate text-xs">{req.name}</span>
					</button>
				{/each}
			{/if}
		{:else}
			<!-- Recent History -->
			{#if recentHistory.length === 0}
				<div class="py-10 text-center text-xs text-content-dim italic opacity-50" in:fade>
					No recent activity
				</div>
			{:else}
				<div class="mb-2 flex justify-end px-2">
					<button
						class="text-[9px] font-bold tracking-tighter text-content-dim uppercase hover:text-red-500"
						onclick={handleClearHistory}
					>
						Clear History
					</button>
				</div>
				{#each recentHistory as item (item.id)}
					<button
						class="group flex w-full flex-col gap-1 rounded-md border border-transparent p-2.5 text-left transition-all hover:border-stroke/50 hover:bg-surface-dim"
						onclick={() => selectHistory(item)}
						transition:slide|local={{ duration: 150 }}
					>
						<div class="flex items-center justify-between gap-1">
							<span
								class="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold
								{item.method === 'GET'
									? 'bg-brand-blue/10 text-brand-blue'
									: item.method === 'POST'
										? 'bg-brand-green/10 text-brand-green'
										: item.method === 'DELETE'
											? 'bg-red-500/10 text-red-500'
											: 'bg-brand-orange/10 text-brand-orange'}"
							>
								{item.method}
							</span>
							<span class="text-[9px] text-content-dim/60">
								{formatDistanceToNow(item.timestamp)} ago
							</span>
						</div>

						<div class="mt-1 flex items-center justify-between gap-2">
							<span
								class="flex-1 truncate text-[11px] font-medium text-content transition-colors group-hover:text-brand-orange"
							>
								{item.url}
							</span>
							{#if item.status}
								<span
									class="shrink-0 text-[10px] font-bold
									{item.status >= 200 && item.status < 300 ? 'text-brand-green' : 'text-red-400'}"
								>
									{item.status}
								</span>
							{/if}
						</div>
					</button>
				{/each}
			{/if}
		{/if}
	</div>

	<!-- Footer -->
	<div class="shrink-0 border-t border-stroke bg-surface-dim/20 p-3">
		<button
			class="flex w-full items-center justify-center gap-2 rounded-lg border border-stroke bg-white py-2.5 text-[11px] font-bold text-content shadow-sm transition-all hover:border-brand-orange/50 hover:shadow-md active:scale-95 dark:bg-surface"
			onclick={resetBuilder}
		>
			<svg
				class="h-3.5 w-3.5 text-brand-orange"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2.5"
					d="M12 4v16m8-8H4"
				/>
			</svg>
			NEW REQUEST
		</button>
	</div>
</div>
