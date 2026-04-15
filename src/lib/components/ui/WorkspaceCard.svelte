<script lang="ts">
	import { resolve } from '$app/paths';
	import Avatar from './Avatar.svelte';
	import { goto } from '$app/navigation';

	let { workspace } = $props();
</script>

<button
	onclick={() => goto(resolve(`/workspace/${workspace.slug}`))}
	class="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950 p-6 text-left transition-all hover:border-orange-500/50"
>
	<div
		class="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-orange-500/10 to-blue-500/10 opacity-0 blur-3xl transition-opacity group-hover:opacity-100"
	></div>

	<div class="mb-6 flex items-start justify-between">
		<Avatar name={workspace.name} src={workspace.logo_url} size="lg" class="rounded-2xl" />
		<div
			class="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
		>
			Workspace
		</div>
	</div>

	<h3 class="mb-2 text-xl font-bold text-white transition-colors group-hover:text-orange-500">
		{workspace.name}
	</h3>
	<p class="mb-6 line-clamp-2 text-sm text-zinc-500">
		{workspace.description || 'No description provided.'}
	</p>

	<div class="mt-auto flex items-center justify-between border-t border-zinc-900/50 pt-4">
		<span class="text-[11px] font-medium text-zinc-600 italic">
			Created {new Date(workspace.created_at).toLocaleDateString()}
		</span>
		<svg
			class="h-5 w-5 translate-x-1 text-zinc-700 grayscale transition-colors group-hover:text-white group-hover:grayscale-0"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M17 8l4 4m0 0l-4 4m4-4H3"
			/>
		</svg>
	</div>
</button>
