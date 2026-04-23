<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { supabase } from '$lib/services/supabase';
	import { resolve } from '$app/paths';

	let loading = $state(true);

	onMount(async () => {
		const workspace = $workspaceStore.currentWorkspace;
		if (workspace) {
			// Fetch the first available channel
			const { data: channels } = await supabase
				.from('channels')
				.select('id')
				.eq('workspace_id', workspace.id)
				.order('created_at', { ascending: true })
				.limit(1);

			if (channels && channels.length > 0) {
				goto(resolve(`/workspace/${workspace.slug}/chat/${channels[0].id}` as unknown as '/'));
			} else {
				loading = false;
			}
		}
	});
</script>

{#if loading}
	<div class="flex h-full items-center justify-center bg-surface">
		<div
			class="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent"
		></div>
	</div>
{:else}
	<div class="flex h-full items-center justify-center bg-surface p-8 text-center">
		<div class="max-w-md space-y-6">
			<div
				class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-brand-orange/10 bg-brand-orange/5 text-brand-orange shadow-2xl"
			>
				<svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
					/>
				</svg>
			</div>
			<div class="space-y-2">
				<h2 class="text-2xl font-bold text-white">No Channels Found</h2>
				<p class="text-sm text-content-dim/60">
					Create a channel in the sidebar to start collaborating with your team.
				</p>
			</div>
		</div>
	</div>
{/if}
