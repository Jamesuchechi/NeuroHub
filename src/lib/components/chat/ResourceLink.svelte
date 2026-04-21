<script lang="ts">
	import { resourceNavigator, type ResourceType } from '$lib/services/resourceService';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { fade } from 'svelte/transition';

	let { type, id, name } = $props<{
		type: ResourceType;
		id: string;
		name: string;
	}>();

	const workspaceSlug = $derived($workspaceStore.currentWorkspace?.slug || '');

	function handleClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!workspaceSlug) return;

		resourceNavigator.open({ type, id, name }, workspaceSlug);
	}

	const icon = $derived.by(() => {
		switch (type) {
			case 'note':
				return '📝';
			case 'snip':
				return '✂️';
			case 'chan':
				return '💬';
			case 'user':
				return '@';
			case 'api_test':
				return '⚡';
			default:
				return '🔗';
		}
	});

	const colorClass = $derived.by(() => {
		switch (type) {
			case 'note':
				return 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20';
			case 'snip':
				return 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20';
			case 'chan':
				return 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20';
			case 'user':
				return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20';
			default:
				return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20';
		}
	});
</script>

<button
	onclick={handleClick}
	in:fade={{ duration: 200 }}
	class="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-bold transition-all {colorClass} ring-brand-orange/0 hover:ring-1"
	title="Open {name}"
>
	<span class="text-xs">{icon}</span>
	<span class="max-w-[200px] truncate">{name}</span>
</button>

<style>
	/* Ensure links don't break lines awkwardly in flow */
	button {
		vertical-align: baseline;
		margin: 0 0.1em;
	}
</style>
