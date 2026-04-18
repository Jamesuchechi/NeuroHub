<script lang="ts">
	import { activeTab } from '$lib/stores/devToolsStore';

	const tabs = [
		{ id: 'snippets', label: 'Snippets', icon: '{ }' },
		{ id: 'sandbox', label: 'Sandbox', icon: '▶' },
		{ id: 'api', label: 'API Tester', icon: '⚡' }
	] as const;

	let { children } = $props();
</script>

<div class="bg-background mt-px flex h-full flex-col">
	<!-- Tab Bar -->
	<div class="border-border bg-muted/20 flex shrink-0 gap-1 border-b px-4">
		{#each tabs as tab (tab.id)}
			<button
				class="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
               {$activeTab === tab.id
					? 'border-primary text-foreground'
					: 'text-muted-foreground hover:text-foreground border-transparent'}"
				onclick={() => activeTab.set(tab.id)}
			>
				<span class="text-primary/80 mr-1.5 font-mono text-xs">{tab.icon}</span>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Tab Content Slot -->
	<div class="relative flex-1 overflow-hidden">
		{@render children()}
	</div>
</div>
