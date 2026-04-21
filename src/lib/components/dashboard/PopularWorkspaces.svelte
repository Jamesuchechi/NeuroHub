<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { workspacesService } from '$lib/services/workspaces';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { authStore } from '$lib/stores/authStore';
	import { toast } from '$lib/stores/toastStore';
	import type { WorkspaceItem } from '$lib/types/discovery';

	let workspaces = $state<WorkspaceItem[]>([]);
	let loading = $state(true);

	const { user } = $derived($authStore);

	onMount(async () => {
		try {
			workspaces = (await workspacesService.getPopularWorkspaces(
				4,
				user?.id
			)) as unknown as WorkspaceItem[];
		} catch (err) {
			console.error('Failed to fetch popular workspaces:', err);
		} finally {
			loading = false;
		}
	});

	async function handleJoinRequest(workspace: WorkspaceItem) {
		if (!user) return;
		try {
			await workspacesService.requestJoinWorkspace(
				workspace.id,
				user.id,
				workspace.name,
				workspace.owner_id
			);
			toast.show(`Request sent to join ${workspace.name}`);
		} catch (_err) {
			toast.show('Failed to send join request.', 'error');
		}
	}
</script>

<div class="rounded-3xl border border-stroke bg-surface-dim/50 p-8 shadow-xl backdrop-blur-sm">
	<div class="mb-6 flex items-center justify-between">
		<h3 class="text-sm font-black tracking-tight text-content uppercase">Popular Workspaces</h3>
		<button class="text-[10px] font-bold text-content-dim transition-colors hover:text-brand-orange"
			>View All</button
		>
	</div>

	<div class="space-y-6">
		{#if loading}
			{#each Array.from({ length: 3 }) as _, i (i)}
				<div class="flex animate-pulse items-center gap-4">
					<div class="h-12 w-12 rounded-xl bg-surface"></div>
					<div class="flex-1 space-y-2">
						<div class="h-3 w-24 rounded bg-surface"></div>
						<div class="h-2 w-16 rounded bg-surface"></div>
					</div>
				</div>
			{/each}
		{:else if workspaces.length === 0}
			<p class="py-4 text-center text-xs text-content-dim italic">No workspaces found.</p>
		{:else}
			{#each workspaces as ws (ws.id)}
				<div
					class="flex items-center justify-between gap-4 rounded-2xl p-2 transition-colors hover:bg-surface-dim"
				>
					<a
						href={resolve(`/workspace/${ws.slug}`)}
						class="group/ws flex min-w-0 items-center gap-4"
					>
						<Avatar
							name={ws.name ?? 'W'}
							src={ws.logo_url ?? undefined}
							size="md"
							class="shrink-0 rounded-xl transition-transform group-hover/ws:scale-105 active:scale-95"
						/>
						<div class="min-w-0">
							<p
								class="truncate text-sm font-black text-content decoration-brand-orange/30 underline-offset-2 transition-colors group-hover/ws:text-brand-orange group-hover/ws:underline"
							>
								{ws.name ?? 'Unnamed Workspace'}
							</p>
							<p class="text-[10px] font-bold text-content-dim/60">View Details</p>
						</div>
					</a>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => handleJoinRequest(ws)}
						class="shrink-0 border border-stroke hover:border-brand-orange"
					>
						Join
					</Button>
				</div>
			{/each}
		{/if}
	</div>
</div>
