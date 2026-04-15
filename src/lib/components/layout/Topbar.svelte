<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '../ui/Button.svelte';
	import { workspaceStore } from '$lib/stores/workspaceStore';

	const currentWorkspace = $derived($workspaceStore.currentWorkspace);

	// Generate breadcrumbs from path with workspace name support
	const pathSegments = $derived(
		page.url.pathname
			.split('/')
			.filter(Boolean)
			.map((segment, i, arr) => {
				const href = '/' + arr.slice(0, i + 1).join('/');
				let name = segment.charAt(0).toUpperCase() + segment.slice(1);

				// If this segment is a workspace slug and match current workspace, use its name
				if (arr[i - 1] === 'workspace' && currentWorkspace && segment === currentWorkspace.slug) {
					name = currentWorkspace.name;
				}

				return { name, href };
			})
	);
</script>

<header
	class="flex h-16 w-full items-center justify-between border-b border-zinc-900 bg-black/50 px-8 backdrop-blur-md"
>
	<!-- Left: Breadcrumbs -->
	<div class="flex items-center gap-2 overflow-hidden">
		<svg class="h-4 w-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
			/>
		</svg>
		<span class="text-zinc-700">/</span>
		{#each pathSegments as segment, i (segment.href)}
			{#if i > 0}
				<span class="text-zinc-700">/</span>
			{/if}
			<a
				href={resolve(segment.href as unknown as '/')}
				class="truncate text-xs font-semibold tracking-tight transition-colors {i ===
				pathSegments.length - 1
					? 'text-white'
					: 'text-zinc-500 hover:text-zinc-300'}"
			>
				{segment.name}
			</a>
		{/each}
	</div>

	<!-- Right: Actions -->
	<div class="flex items-center gap-4">
		<button
			class="relative rounded-full p-2 text-zinc-400 transition-all hover:bg-zinc-900 hover:text-white"
			aria-label="Notifications"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
				/>
			</svg>
			<span class="absolute top-2 right-2 flex h-2 w-2">
				<span
					class="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"
				></span>
				<span class="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
			</span>
		</button>

		<div class="h-4 w-px bg-zinc-800"></div>

		<Button variant="primary" size="sm" class="px-4! py-2! text-[11px]! font-bold!">Invite</Button>
	</div>
</header>
