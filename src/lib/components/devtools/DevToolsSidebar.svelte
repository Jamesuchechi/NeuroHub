<script lang="ts">
	import { activeTab, type DevTab } from '$lib/stores/devToolsStore';
	import { slide } from 'svelte/transition';

	let isCollapsed = $state(false);

	const menuItems: { id: DevTab; label: string }[] = [
		{
			id: 'snippets',
			label: 'Snippets Library'
		},
		{
			id: 'api',
			label: 'API Workbench'
		},
		{
			id: 'sandbox',
			label: 'Code Sandbox'
		},
		{
			id: 'json',
			label: 'JSON Utility'
		}
	];

	function selectTab(id: DevTab) {
		activeTab.set(id);
	}

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}
</script>

<div
	class="bg-card border-border group relative flex h-full flex-col border-r transition-all duration-300 ease-in-out"
	style="width: {isCollapsed ? '64px' : '240px'}"
>
	<!-- Collapse Toggle -->
	<button
		class="bg-card border-border text-muted-foreground hover:text-foreground absolute top-8 -right-3 z-10 rounded-full border p-1 shadow-sm"
		onclick={toggleCollapse}
		aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
	>
		<svg
			class="h-4 w-4 transition-transform duration-300 {isCollapsed ? 'rotate-180' : ''}"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
	</button>

	<div class="flex h-full flex-col gap-8 px-4 py-6">
		<!-- Logo/Title -->
		<div class="flex h-8 items-center gap-3 overflow-hidden">
			<div
				class="bg-primary text-primary-foreground shadow-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-lg"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
					/>
				</svg>
			</div>
			{#if !isCollapsed}
				<span
					class="text-lg font-bold tracking-tight whitespace-nowrap"
					transition:slide={{ axis: 'x' }}>DevHub</span
				>
			{/if}
		</div>

		<!-- Navigation -->
		<nav class="flex flex-1 flex-col gap-1">
			{#each menuItems as item (item.id)}
				<button
					class="group/item relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200
                 {$activeTab === item.id
						? 'bg-primary/10 text-primary font-semibold'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => selectTab(item.id)}
				>
					<div class="shrink-0">
						{#if item.id === 'snippets'}
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/></svg
							>
						{:else if item.id === 'api'}
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/></svg
							>
						{:else if item.id === 'sandbox'}
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
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
						{:else if item.id === 'json'}
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/></svg
							>
						{/if}
					</div>
					{#if !isCollapsed}
						<span class="text-sm whitespace-nowrap" transition:slide={{ axis: 'x' }}
							>{item.label}</span
						>
					{/if}

					{#if $activeTab === item.id}
						<div class="bg-primary absolute top-2 bottom-2 left-0 w-1 rounded-r-full"></div>
					{/if}

					{#if isCollapsed}
						<!-- Tooltip (native) -->
						<div
							class="bg-popover text-popover-foreground border-border pointer-events-none absolute left-full z-100 ml-4 rounded border px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-md transition-opacity group-hover/item:opacity-100"
						>
							{item.label}
						</div>
					{/if}
				</button>
			{/each}
		</nav>

		<!-- Bottom Actions (e.g. Help) -->
		<div class="border-border mt-auto border-t pt-4">
			<button
				class="text-muted-foreground hover:text-foreground flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 transition-colors"
			>
				<svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				{#if !isCollapsed}
					<span class="text-sm whitespace-nowrap">Help & Docs</span>
				{/if}
			</button>
		</div>
	</div>
</div>
