<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/authStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { fade } from 'svelte/transition';

	import AppShell from '$lib/components/layout/AppShell.svelte';

	let { children } = $props();

	const session = $derived($authStore.session);
	const slug = $derived(page.params.slug);

	// Context initialization: Update the store whenever the slug or session changes
	$effect(() => {
		if (session?.user?.id && slug) {
			console.log(`[Workspace Layout] Initializing workspace: ${slug}`);
			workspaceStore.setWorkspace(slug, session.user.id);
		}
	});

	// Cleanup on unmount (optional, but good practice if we want to clear current workspace)
	onMount(() => {
		return () => {
			console.log('[Workspace Layout] Cleaning up workspace context');
			// workspaceStore.reset(); // Don't reset immediately to avoid flicker on sub-route changes
		};
	});
</script>

{#if $workspaceStore.loading && !$workspaceStore.currentWorkspace}
	<div class="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black">
		<div class="flex flex-col items-center gap-4">
			<div
				class="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"
			></div>
			<p class="animate-pulse text-sm font-medium text-zinc-500">Loading Workspace...</p>
		</div>
	</div>
{:else if $workspaceStore.error}
	<div
		class="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black p-8 text-center"
	>
		<div class="max-w-md space-y-4">
			<div
				class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500"
			>
				<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>
			<h2 class="text-2xl font-bold text-white">Access Denied</h2>
			<p class="text-zinc-500">{$workspaceStore.error}</p>
			<a
				href={resolve('/dashboard')}
				class="mt-4 inline-block rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-zinc-800"
			>
				Back to Dashboard
			</a>
		</div>
	</div>
{:else}
	<AppShell>
		<div in:fade={{ duration: 400 }} class="h-full">
			{@render children()}
		</div>
	</AppShell>
{/if}
